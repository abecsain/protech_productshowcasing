'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container: Displayed at TOP on mobile & desktop, above modals with z-[70] */}
      <div
        className="fixed z-[70] pointer-events-none flex flex-col gap-2 p-3 sm:p-4 inset-x-3 top-2 sm:inset-x-auto sm:top-4 sm:right-4 sm:left-auto sm:max-w-md"
        aria-live="polite"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((toast) => {
          const typeConfig = {
            success: {
              bg: 'bg-green-50 border-green-200 text-green-900',
              icon: <CheckCircle2 size={20} className="text-green-600 shrink-0" />,
            },
            error: {
              bg: 'bg-red-50 border-red-200 text-red-900',
              icon: <AlertCircle size={20} className="text-red-600 shrink-0" />,
            },
            warning: {
              bg: 'bg-amber-50 border-amber-200 text-amber-900',
              icon: <AlertCircle size={20} className="text-amber-600 shrink-0" />,
            },
            info: {
              bg: 'bg-blue-50 border-blue-200 text-blue-900',
              icon: <Info size={20} className="text-[#1D4ED8] shrink-0" />,
            },
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border shadow-md animate-in fade-in slide-in-from-top-2 duration-150 ${typeConfig.bg}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {typeConfig.icon}
                <p className="text-[14px] font-medium leading-tight truncate">
                  {toast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="w-8 h-8 min-w-[32px] min-h-[32px] -mr-1 flex items-center justify-center rounded hover:bg-black/5 text-slate-500 hover:text-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
                aria-label="Dismiss toast"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastProvider;
