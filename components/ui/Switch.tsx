'use client';

import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
  'aria-label'?: string;
}

export function Switch({ checked, onChange, disabled = false, label, id, 'aria-label': ariaLabel }: SwitchProps) {
  const switchId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="inline-flex items-center gap-2">
      <div className="min-w-[44px] min-h-[44px] flex items-center justify-center">
        <button
          id={switchId}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={ariaLabel || label || 'Toggle switch'}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            checked ? 'bg-[#1D4ED8]' : 'bg-slate-300'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {label && (
        <label
          htmlFor={switchId}
          onClick={() => !disabled && onChange(!checked)}
          className={`text-[14px] font-medium select-none cursor-pointer ${
            disabled ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700'
          }`}
        >
          {label}
        </label>
      )}
    </div>
  );
}

export default Switch;
