'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useToast } from './ui/Toast';

export interface SecurityUserInfo {
  id?: number;
  name: string;
  firmName?: string;
  mobile: string;
  address?: string;
  role: string;
  canSeePrices: boolean;
  mustChange?: boolean;
}

interface SecurityContextType {
  canSeePrices: boolean;
  authChecked: boolean;
  screenshotBlocked: boolean;
  userInfo: SecurityUserInfo | null;
  refreshAuth: () => Promise<void>;
}

const SecurityContext = createContext<SecurityContextType>({
  canSeePrices: false,
  authChecked: false,
  screenshotBlocked: false,
  userInfo: null,
  refreshAuth: async () => {},
});

export const useSecurity = () => useContext(SecurityContext);

const USER_SHELL_KEY = 'pte_user_shell';

export default function SecurityProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();

  const [canSeePrices, setCanSeePrices] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [userInfo, setUserInfo] = useState<SecurityUserInfo | null>(null);
  const isLoggedInRef = useRef(false);
  const userRoleRef = useRef<string | null>(null);

  const lastCanSeePricesRef = useRef<boolean | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate UI shell from sessionStorage immediately on mount to avoid navbar flash & waterfalls
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(USER_SHELL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SecurityUserInfo;
        if (parsed && parsed.role) {
          setUserInfo(parsed);
          isLoggedInRef.current = true;
          userRoleRef.current = parsed.role;
          if (parsed.canSeePrices) {
            setCanSeePrices(true);
          }
        }
      }
    } catch {}
  }, []);

  // Check auth and current price status
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        const user = data.user;
        if (user) {
          isLoggedInRef.current = true;
          userRoleRef.current = user.role || 'user';
          const currentCanSee = Boolean(user.canSeePrices);
          const nextUserInfo: SecurityUserInfo = {
            id: user.id,
            name: user.name || 'Customer',
            firmName: user.firmName || '',
            mobile: user.mobile || '',
            address: user.address || '',
            role: user.role || 'user',
            canSeePrices: currentCanSee,
            mustChange: Boolean(user.mustChange),
          };
          setUserInfo(nextUserInfo);
          setCanSeePrices(currentCanSee);

          try {
            sessionStorage.setItem(USER_SHELL_KEY, JSON.stringify(nextUserInfo));
          } catch {}

          // Schedule exact auto-off timer check if priceExpiresAt is set
          if (expiryTimerRef.current) {
            clearTimeout(expiryTimerRef.current);
            expiryTimerRef.current = null;
          }
          if (user.role === 'user' && currentCanSee && user.priceExpiresAt) {
            const expiryMs = Date.parse(String(user.priceExpiresAt));
            if (Number.isFinite(expiryMs)) {
              const delayMs = Math.max(150, expiryMs - Date.now() + 200);
              if (delayMs <= 24 * 60 * 60 * 1000) {
                expiryTimerRef.current = setTimeout(() => {
                  checkStatus();
                }, delayMs);
              }
            }
          }

          // If price visibility transitioned while customer is on page
          if (
            lastCanSeePricesRef.current !== null &&
            lastCanSeePricesRef.current !== currentCanSee &&
            user.role === 'user'
          ) {
            if (!currentCanSee) {
              showToast('⚠️ Price visibility has been turned OFF by administration.', 'info');
            } else {
              showToast('✓ Price visibility has been enabled for your account.', 'success');
            }

            // Dispatch global event for pages to update state without refresh!
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('price-visibility-changed', {
                  detail: { canSeePrices: currentCanSee, userId: user.id },
                })
              );
            }
          }

          lastCanSeePricesRef.current = currentCanSee;
        } else {
          isLoggedInRef.current = false;
          userRoleRef.current = null;
          setUserInfo(null);
          setCanSeePrices(false);
          lastCanSeePricesRef.current = null;
          try {
            sessionStorage.removeItem(USER_SHELL_KEY);
          } catch {}
        }
      } else {
        isLoggedInRef.current = false;
        userRoleRef.current = null;
        setUserInfo(null);
        setCanSeePrices(false);
        lastCanSeePricesRef.current = null;
        try {
          sessionStorage.removeItem(USER_SHELL_KEY);
        } catch {}
      }
    } catch {
      // Silently handle offline/polling error
    } finally {
      setAuthChecked(true);
    }
  }, [showToast]);

  // Initial fetch + live 4s polling for customer accounts when tab is visible
  useEffect(() => {
    checkStatus();

    const interval = setInterval(() => {
      if (
        typeof document !== 'undefined' &&
        !document.hidden &&
        isLoggedInRef.current &&
        userRoleRef.current === 'user'
      ) {
        checkStatus();
      }
    }, 4000);

    // Immediate check on tab visibility or window focus (if authenticated)
    const handleVisibility = () => {
      if (!document.hidden && isLoggedInRef.current) checkStatus();
    };
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    // Immediate check when auth state changes in the client (login / logout)
    const handleAuthChange = () => checkStatus();
    window.addEventListener('auth-state-changed', handleAuthChange);

    // Cross-tab BroadcastChannel for 5ms instantaneous updates in same browser
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('protech_live_sync');
        broadcastChannelRef.current = bc;
        bc.onmessage = (event) => {
          if (event.data?.type === 'PRICE_VISIBILITY_CHANGED') {
            checkStatus();
          }
        };
      } catch {
        // Fallback to polling
      }
    }

    return () => {
      clearInterval(interval);
      if (expiryTimerRef.current) {
        clearTimeout(expiryTimerRef.current);
        expiryTimerRef.current = null;
      }
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      window.removeEventListener('auth-state-changed', handleAuthChange);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, [checkStatus]);

  return (
    <SecurityContext.Provider
      value={{
        canSeePrices,
        authChecked,
        screenshotBlocked: false,
        userInfo,
        refreshAuth: checkStatus,
      }}
    >
      <div className="relative min-h-screen">
        {children}
      </div>
    </SecurityContext.Provider>
  );
}
