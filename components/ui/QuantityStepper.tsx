'use client';

import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';

export interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  variant?: 'default' | 'primary';
  showTrashAtMin?: boolean;
}

export function QuantityStepper({
  value,
  min = 1,
  max = 999,
  onChange,
  disabled = false,
  size = 'md',
  fullWidth = false,
  variant = 'default',
  showTrashAtMin = false,
}: QuantityStepperProps) {
  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (value > min && !disabled) {
      onChange(value - 1);
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (value < max && !disabled) {
      onChange(value + 1);
    }
  };

  const isSmall = size === 'sm';
  const isPrimary = variant === 'primary';
  const showTrash = showTrashAtMin && value === (min + 1) && min === 0;

  const containerClasses = isPrimary
    ? 'border border-[#1D4ED8]/60 bg-blue-50/70 shadow-2xs'
    : 'border border-slate-200/90 bg-white';

  const btnClasses = isPrimary
    ? 'text-[#1D4ED8] hover:bg-blue-100/80 active:bg-blue-200/80'
    : 'text-slate-600 hover:bg-slate-50 active:bg-slate-100';

  const numClasses = isPrimary ? 'text-[#1D4ED8]' : 'text-slate-800';

  return (
    <div
      className={`
        ${fullWidth ? 'flex w-full justify-between' : 'inline-flex'}
        items-center rounded-lg overflow-hidden select-none shrink-0 transition-colors
        ${containerClasses}
        ${isSmall ? 'h-8' : 'h-10'}
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
      `}
      role="group"
      aria-label="Quantity selector"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min || disabled}
        aria-label={showTrash ? 'Remove from cart' : 'Decrease quantity'}
        className={`
          flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1D4ED8]
          ${btnClasses}
          ${isSmall ? (fullWidth ? 'w-8 h-8' : 'w-7 h-8') : fullWidth ? 'w-10 h-10' : 'w-10 h-10'}
        `}
      >
        {showTrash ? (
          <Trash2 size={isSmall ? 13 : 15} strokeWidth={2.2} className="text-red-500" />
        ) : (
          <Minus size={isSmall ? 13 : 16} strokeWidth={2.5} />
        )}
      </button>

      <span
        className={`
          text-center font-bold tabular-nums select-none flex items-center justify-center
          ${numClasses}
          ${isSmall ? 'min-w-[24px] text-[13px] px-1' : 'min-w-[36px] text-[15px] px-2'}
          ${fullWidth ? 'flex-1' : ''}
        `}
        aria-live="polite"
      >
        {value}
      </span>

      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max || disabled}
        aria-label="Increase quantity"
        className={`
          flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1D4ED8]
          ${btnClasses}
          ${isSmall ? (fullWidth ? 'w-8 h-8' : 'w-7 h-8') : fullWidth ? 'w-10 h-10' : 'w-10 h-10'}
        `}
      >
        <Plus size={isSmall ? 13 : 16} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export default QuantityStepper;
