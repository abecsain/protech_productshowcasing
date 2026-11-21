'use client';

import React from 'react';
import * as LucideIcons from 'lucide-react';

export type AllowedIconSize = 16 | 20 | 24;

export interface IconProps {
  name: keyof typeof LucideIcons;
  size?: AllowedIconSize;
  className?: string;
  color?: string;
  strokeWidth?: number;
}

export function Icon({
  name,
  size = 20,
  className = '',
  color,
  strokeWidth = 2,
}: IconProps) {
  // Validate allowed sizes strictly: 16, 20, 24 only
  const validSize: AllowedIconSize = size === 16 || size === 24 ? size : 20;

  const IconComponent = LucideIcons[name] as React.ComponentType<{
    size?: number;
    className?: string;
    color?: string;
    strokeWidth?: number;
    'aria-hidden'?: boolean;
  }>;

  if (!IconComponent) {
    return null;
  }

  return (
    <IconComponent
      size={validSize}
      className={`shrink-0 ${className}`}
      color={color}
      strokeWidth={strokeWidth}
      aria-hidden={true}
    />
  );
}

export default Icon;
