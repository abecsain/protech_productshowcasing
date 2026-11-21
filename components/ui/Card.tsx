'use client';

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  className = '',
  padding = 'md',
  ...props
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  }[padding];

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] ${paddingClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
