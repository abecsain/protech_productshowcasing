'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Lock, CameraOff } from 'lucide-react';
import { useToast } from './ui/Toast';

interface SecurityContextType {
  canSeePrices: boolean;
  screenshotBlocked: boolean;
  userInfo: { name: string; mobile: string; role: string; canSeePrices: boolean } | null;
}

const SecurityContext = createContext<SecurityContextType>({
  canSeePrices: false,
  screenshotBlocked: false,
  userInfo: null,
});

export const useSecurity = () => useContext(SecurityContext);

export default function SecurityProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { showToast } = useToast();

  const [canSeePrices, setCanSeePrices] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    name: string;
    mobile: string;
    role: string;
    canSeePrices: boolean;
  } | null>(null);

  const [screenshotVeilOpen, setScreenshotVeilOpen] = useState(false);
  const [veilMessage, setVeilMessage] = useState('');
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);

  const lastCanSeePricesRef = useRef<boolean | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const veilTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
          const currentCanSee = Boolean(user.canSeePrices);
          setUserInfo({
            name: user.name || 'Customer',
            mobile: user.mobile || '',
            role: user.role || 'user',
            canSeePrices: currentCanSee,
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
        }
      }
    } catch {
      // Silently handle offline/polling error
    }
  }, [showToast]);

  // Initial fetch and 2.5s live polling for real-time automatic price off
  useEffect(() => {
    checkStatus();

    // Fast 2.5s polling interval
    const interval = setInterval(() => {
      checkStatus();
    }, 2500);

    // Immediate check on tab visibility or window focus
    const handleVisibility = () => {
      if (!document.hidden) checkStatus();
    };
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

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
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, [checkStatus]);

  // Trigger screenshot restriction veil
  const triggerScreenshotRestriction = useCallback(
    (reason: string) => {
      setVeilMessage(reason);
      setScreenshotVeilOpen(true);

      // Sanitize clipboard if screenshot was attempted
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(
            'Pro Tech Enterprises – Confidential Wholesale Catalog. Screenshots and unauthorized captures are strictly restricted.'
          ).catch(() => {});
        }
      } catch {
        // Ignore clipboard write restrictions
      }

      showToast('⚠️ Screenshot Restricted: Capturing wholesale catalog prices is prohibited.', 'error');

      // Auto dismiss after 2.5 seconds
      if (veilTimeoutRef.current) clearTimeout(veilTimeoutRef.current);
      veilTimeoutRef.current = setTimeout(() => {
        setScreenshotVeilOpen(false);
      }, 2500);
    },
    [showToast]
  );

  // Screenshot and Capture Prevention Keyboard Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. PrintScreen key (standard Windows / Linux)
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        e.stopPropagation();
        triggerScreenshotRestriction('PrintScreen Key Intercepted');
        return false;
      }

      // 2. Windows Snipping Tool (Win + Shift + S) or Alt + PrintScreen
      if (e.shiftKey && (e.key === 'S' || e.key === 's') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        triggerScreenshotRestriction('Snipping Tool Shortcut Intercepted');
        return false;
      }

      // 3. Print Dialog (Ctrl + P / Cmd + P)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        triggerScreenshotRestriction('Page Printing Restricted');
        return false;
      }

      // 4. Mac Screenshot Shortcuts (Cmd + Shift + 3 / 4 / 5)
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        triggerScreenshotRestriction('macOS Screenshot Shortcut Intercepted');
        return false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        e.stopPropagation();
        triggerScreenshotRestriction('PrintScreen Key Intercepted');
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      if (veilTimeoutRef.current) clearTimeout(veilTimeoutRef.current);
    };
  }, [triggerScreenshotRestriction]);

  // Context Menu & Image Dragging Restrictions on Customer Pages
  useEffect(() => {
    const isCustomerView = !pathname?.startsWith('/admin');
    if (!isCustomerView) return;

    const handleContextMenu = (e: MouseEvent) => {
      // Check if target is inside product card, image, price or table
      const target = e.target as HTMLElement | null;
      if (
        target?.closest('img') ||
        target?.closest('[data-ss-protect]') ||
        target?.closest('.aspect-square') ||
        target?.textContent?.includes('₹')
      ) {
        e.preventDefault();
        showToast('Right-click is disabled to protect catalog data.', 'info');
      }
    };

    const handleDragStart = (e: DragEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'IMG') {
        e.preventDefault();
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('dragstart', handleDragStart);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('dragstart', handleDragStart);
    };
  }, [pathname, showToast]);

  // Anti-Snipping Blur when window loses focus during capture
  useEffect(() => {
    const isCustomerView = !pathname?.startsWith('/admin');
    if (!isCustomerView) return;

    const handleWindowBlur = () => {
      setIsWindowBlurred(true);
    };

    const handleWindowFocus = () => {
      setIsWindowBlurred(false);
    };

    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [pathname]);

  const isCustomerPage = !pathname?.startsWith('/admin');

  return (
    <SecurityContext.Provider
      value={{
        canSeePrices,
        screenshotBlocked: screenshotVeilOpen,
        userInfo,
      }}
    >
      <div className="relative min-h-screen">
        {/* Dynamic Watermark across customer showcase */}
        {isCustomerPage && userInfo && userInfo.role === 'user' && (
          <div
            className="fixed inset-0 pointer-events-none z-[1] select-none overflow-hidden opacity-[0.035] flex flex-wrap gap-24 p-8 items-center justify-around"
            aria-hidden="true"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="transform -rotate-25 text-slate-900 text-sm font-bold tracking-widest uppercase whitespace-nowrap"
              >
                PRO TECH ENTERPRISES • CONFIDENTIAL • {userInfo.name} ({userInfo.mobile})
              </div>
            ))}
          </div>
        )}

        {/* Anti-Snipping Focus Protection Overlay (when external snipping tool causes window blur) */}
        {isCustomerPage && isWindowBlurred && canSeePrices && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/60 flex items-center justify-center p-4 text-center cursor-pointer select-none"
            onClick={() => setIsWindowBlurred(false)}
          >
            <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm border border-slate-200 space-y-3">
              <div className="w-12 h-12 bg-blue-50 text-[#1D4ED8] rounded-xl mx-auto flex items-center justify-center">
                <Lock size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Protected Wholesale View</h3>
              <p className="text-xs text-slate-600">
                Window focus lost. Click anywhere on this screen to resume browsing catalog prices.
              </p>
            </div>
          </div>
        )}

        {/* Screenshot Restriction Veil (High-visibility security blackout) */}
        {screenshotVeilOpen && (
          <div
            role="alert"
            className="fixed inset-0 z-[9999] bg-slate-950/95 text-white flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer"
            onClick={() => setScreenshotVeilOpen(false)}
          >
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-4 text-amber-400">
              <CameraOff size={32} strokeWidth={2.5} />
            </div>
            <span className="text-xs uppercase tracking-widest font-bold text-amber-400 mb-1">
              Security Restriction
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Screenshots Strictly Prohibited
            </h2>
            <p className="text-sm text-slate-300 max-w-md mt-2 leading-relaxed">
              Screen captures, recordings, and copying of wholesale prices are monitored and prohibited by Pro Tech Enterprises security policy.
            </p>
            {veilMessage && (
              <span className="mt-3 px-3 py-1 bg-white/10 rounded-full text-[11px] font-mono text-slate-300">
                Trigger: {veilMessage}
              </span>
            )}
            <p className="text-xs text-slate-500 mt-6">
              Tap anywhere to dismiss and return to catalog
            </p>
          </div>
        )}

        {/* Application Content */}
        <div className={`relative z-[2] ${isWindowBlurred && canSeePrices ? 'filter blur-[1px]' : ''}`}>
          {children}
        </div>
      </div>
    </SecurityContext.Provider>
  );
}
