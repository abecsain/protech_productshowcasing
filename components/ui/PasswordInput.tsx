'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, helperText, id, className = '', ...props }, ref) => {
    const [show, setShow] = useState(false);
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
          <input
            ref={ref}
            id={inputId}
            type={show ? 'text' : 'password'}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={`w-full min-h-[44px] h-11 pl-3.5 pr-12 text-[16px] bg-white text-slate-900 border rounded-lg placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-[#1D4ED8] disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
              error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 hover:border-slate-400'
            } ${className}`}
            {...props}
          />

          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-0 top-0 h-11 w-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] rounded-r-lg"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff size={20} strokeWidth={2} /> : <Eye size={20} strokeWidth={2} />}
          </button>
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

PasswordInput.displayName = 'PasswordInput';
export default PasswordInput;
