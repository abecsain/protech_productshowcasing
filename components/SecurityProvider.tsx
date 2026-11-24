'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useToast } from './ui/Toast';

export interface SecurityUserInfo {
  id?: number;
  name: string;
  mobile: string;
  role: string;
  canSeePrices: boolean;
  mustChange?: boolean;
}

interface SecurityContextType {
  canSeePrices: boolean;
  screenshotBlocked: boolean;
  userInfo: SecurityUserInfo | null;
  refreshAuth: () => Promise<void>;
}

const SecurityContext = createContext<SecurityContextType>({
  canSeePrices: false,
  screenshotBlocked: false,
  userInfo: null,
  refreshAuth: async () => {},
});

export const useSecurity = () => useContext(SecurityContext);

export default function SecurityProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();

  const [canSeePrices, setCanSeePrices] = useState(false);
  const [userInfo, setUserInfo] = useState<SecurityUserInfo | null>(null);
  const isLoggedInRef = useRef(false);

  const lastCanSeePricesRef = useRef<boolean | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Check auth and current price status
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        const user = data.user;
        if (user) {
          isLoggedInRef.current = true;
          const currentCanSee = Boolean(user.canSeePrices);
          setUserInfo({
            id: user.id,
            name: user.name || 'Customer',
            mobile: user.mobile || '',
            role: user.role || 'user',
            canSeePrices: currentCanSee,
            mustChange: Boolean(user.mustChange),
          });
          setCanSeePrices(currentCanSee);

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
          setUserInfo(null);
          setCanSeePrices(false);
          lastCanSeePricesRef.current = null;
        }
      } else {
        isLoggedInRef.current = false;
        setUserInfo(null);
        setCanSeePrices(false);
        lastCanSeePricesRef.current = null;
      }
    } catch {
      // Silently handle offline/polling error
    }
  }, [showToast]);

  // Initial fetch and throttled 30s polling for real-time automatic price off (active tabs only)
  useEffect(() => {
    checkStatus();

    // Throttled 30s interval: only active when user is logged in & tab is visible
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden && isLoggedInRef.current) {
        checkStatus();
      }
    }, 30000);

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
