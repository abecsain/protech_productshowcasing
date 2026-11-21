'use client';

import React from 'react';

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

export function PageContainer({
  children,
  className = '',
  as: Component = 'div',
  ...props
}: PageContainerProps) {
  return (
    <Component
      className={`w-full max-w-6xl mx-auto px-4 sm:px-6 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export default PageContainer;
