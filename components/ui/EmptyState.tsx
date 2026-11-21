'use client';

import React from 'react';
import Button from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-white border border-slate-200 rounded-xl ${className}`}
    >
      {icon && (
        <div className="mb-3 text-slate-400 flex items-center justify-center">
          {icon}
        </div>
      )}
      <h3 className="text-[18px] font-semibold text-slate-900 mb-1">
        {title}
      </h3>
      <p className="text-[15px] text-slate-600 max-w-sm mb-5 leading-normal">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
