'use client';

import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  prefixText?: string;
  icon?: React.ReactNode;
  multiline?: boolean;
  rows?: number;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, prefixText, icon, multiline = false, rows = 3, id, className = '', ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[14px] font-medium text-slate-700 mb-1.5"
          >
            {label}
            {props.required && <span className="text-red-600 ml-1" aria-hidden="true">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {prefixText && (
            <span className="absolute left-3.5 text-[15px] font-medium text-slate-600 select-none pointer-events-none">
              {prefixText}
            </span>
          )}

          {icon && !prefixText && (
            <span className="absolute left-3.5 text-slate-400 select-none pointer-events-none flex items-center">
              {icon}
            </span>
          )}

          {multiline ? (
            <textarea
              ref={ref as unknown as React.Ref<HTMLTextAreaElement>}
              id={inputId}
              rows={rows}
              aria-invalid={!!error}
              aria-describedby={error ? `${inputId}-error` : undefined}
              className={`w-full p-3 text-[16px] bg-white text-slate-900 border rounded-lg placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-[#1D4ED8] disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed resize-none ${
                error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 hover:border-slate-400'
              } ${className}`}
              {...(props as unknown as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
            />
          ) : (
            <input
              ref={ref as unknown as React.Ref<HTMLInputElement>}
              id={inputId}
              aria-invalid={!!error}
              aria-describedby={error ? `${inputId}-error` : undefined}
              className={`w-full min-h-[44px] h-11 px-3.5 text-[16px] bg-white text-slate-900 border rounded-lg placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-[#1D4ED8] disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
                error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 hover:border-slate-400'
              } ${prefixText ? 'pl-14' : icon ? 'pl-11' : ''} ${className}`}
              {...props}
            />
          )}
        </div>

        {error ? (
          <p id={`${inputId}-error`} className="mt-1.5 text-[13px] text-red-600 font-normal">{error}</p>
        ) : helperText ? (
          <p className="mt-1.5 text-[13px] text-slate-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
