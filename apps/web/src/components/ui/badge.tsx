'use client';

import React from 'react';
import { cn } from '@/lib/utils';

const colorVariants = {
  default: 'bg-gray-100 text-gray-800',
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  purple: 'bg-purple-100 text-purple-800',
} as const;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: keyof typeof colorVariants;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  color = 'default',
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colorVariants[color],
        className,
      )}
      {...props}
    />
  );
};
