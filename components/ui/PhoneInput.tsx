'use client';

import React, { forwardRef } from 'react';

export interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  prefix?: string;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ label, error, helperText, prefix = '+91', id, disabled, required, className = '', ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[14px] font-medium text-slate-700 mb-1.5"
          >
            {label}
            {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}

        <div
          className={`
            relative flex items-center w-full min-h-[44px] h-11
            rounded-lg border bg-white overflow-hidden
            transition-colors duration-150
            focus-within:ring-2 focus-within:ring-[#1D4ED8] focus-within:border-[#1D4ED8] focus-within:ring-offset-1
            ${error ? 'border-red-500' : 'border-slate-300 hover:border-slate-400'}
            ${disabled ? 'bg-slate-50 cursor-not-allowed opacity-60' : ''}
          `}
        >
          {/* Fixed Prefix Inside the Border */}
          <div className="flex items-center justify-center px-3.5 bg-slate-50 border-r border-slate-200 h-full select-none shrink-0">
            <span className="text-[15px] font-medium text-slate-700">
              {prefix}
            </span>
          </div>

          <input
            ref={ref}
            id={inputId}
            type="tel"
            inputMode="numeric"
            maxLength={10}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={`
              w-full h-full px-3.5 bg-transparent
              text-[16px] text-slate-900 placeholder:text-slate-400
              focus:outline-none
              disabled:cursor-not-allowed
              ${className}
            `}
            {...props}
          />
        </div>

        {error ? (
          <p id={`${inputId}-error`} className="mt-1.5 text-[13px] text-red-600 font-normal">
            {error}
          </p>
        ) : helperText ? (
          <p className="mt-1.5 text-[13px] text-slate-500">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

export default PhoneInput;
