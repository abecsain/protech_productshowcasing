'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, children, id, className = '', ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-[14px] font-medium text-slate-700 mb-1.5"
          >
            {label}
            {props.required && <span className="text-red-600 ml-1" aria-hidden="true">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={!!error}
            aria-describedby={error ? `${selectId}-error` : undefined}
            className={`w-full min-h-[44px] h-11 px-3.5 pr-10 text-[16px] bg-white text-slate-900 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-[#1D4ED8] disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed appearance-none [appearance:none] [-webkit-appearance:none] [-moz-appearance:none] bg-none cursor-pointer ${
              error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 hover:border-slate-400'
            } ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          {/* Chevron icon */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
            <ChevronDown size={18} strokeWidth={2} />
          </div>
        </div>

        {error ? (
          <p id={`${selectId}-error`} className="mt-1.5 text-[13px] text-red-600 font-normal">{error}</p>
        ) : helperText ? (
          <p className="mt-1.5 text-[13px] text-slate-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
