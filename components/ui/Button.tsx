'use client';

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      loadingText = 'Please wait...',
      disabled,
      className = '',
      type = 'button',
      icon,
      ...props
    },
    ref
  ) => {
    // 44px minimum for touch targets, 48px for main mobile actions
    const sizeClasses = {
      sm: 'h-11 px-3 text-[15px] min-h-[44px]',
      md: 'h-11 px-4 text-[15px] min-h-[44px]',
      lg: 'h-12 px-6 text-[15px] min-h-[48px]',
    }[size];

    const variantClasses = {
      primary:
        'bg-[#1D4ED8] hover:bg-[#1E40AF] active:bg-[#1E3A8A] text-white border border-[#1D4ED8] shadow-xs disabled:bg-blue-400 disabled:border-blue-400',
      secondary:
        'bg-white hover:bg-blue-50 active:bg-blue-100 text-[#1D4ED8] border border-[#1D4ED8] shadow-xs disabled:border-slate-300 disabled:text-slate-400',
      ghost:
        'bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-700 border border-transparent disabled:text-slate-400',
      danger:
        'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border border-red-600 shadow-xs disabled:bg-red-300 disabled:border-red-300',
    }[variant];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`inline-flex items-center ${
          className.includes('justify-') ? '' : 'justify-center'
        } gap-2 rounded-lg font-medium select-none cursor-pointer disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1D4ED8] ${
          fullWidth ? 'w-full' : ''
        } ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {loading ? (
          <span>{loadingText}</span>
        ) : (
          <>
            {icon && <span className="shrink-0 flex items-center justify-center">{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
