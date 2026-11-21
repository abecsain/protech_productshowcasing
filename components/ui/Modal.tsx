'use client';

import React, { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}: ModalProps) {
  const isPoppedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const reactId = useId();
  const modalIdRef = useRef(`modal_${reactId.replace(/:/g, '_')}`);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Browser/Mobile Back button integration:
  // When a modal opens, we push a history entry. If the user hits "Back" (browser back button
  // or mobile swipe/hardware back), it closes this modal and keeps the user in the exact same place!
  useEffect(() => {
    if (!isOpen) return;

    const currentModalId = modalIdRef.current;
    isPoppedRef.current = false;

    // Push history state for this modal while preserving Next.js internal router state
    try {
      window.history.pushState(
        { ...(window.history.state || {}), modalActive: true, modalId: currentModalId },
        ''
      );
    } catch {}

    const handlePopState = () => {
      isPoppedRef.current = true;
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // If modal was dismissed not through browser back (e.g. user clicked X, backdrop, or completed action),
      // pop the history entry cleanly so the history stack is not left with an orphaned entry
      if (!isPoppedRef.current && window.history.state?.modalId === currentModalId) {
        window.history.back();
      }
    };
  }, [isOpen]);

  // ESC key dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
  }[maxWidth];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      {/* Dark backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog: Centered card on all devices with safe margins so it never clashes with bottom */}
      <div
        className={`
          relative w-full ${maxWidthClasses} bg-white
          rounded-2xl shadow-2xl
          max-h-[min(90dvh,850px)] flex flex-col
          overflow-hidden z-10 my-auto
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <div>
            {title && (
              <h2 id="modal-title" className="text-[18px] font-semibold text-slate-900">
                {title}
              </h2>
            )}
            {description && (
              <p id="modal-description" className="mt-1 text-[13px] text-slate-500">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-11 h-11 min-w-[44px] min-h-[44px] -mr-2 -mt-1 flex items-center justify-center text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto scrollbar-thin">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
