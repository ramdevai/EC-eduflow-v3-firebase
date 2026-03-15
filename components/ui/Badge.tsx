import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    error: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}
