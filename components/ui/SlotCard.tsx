import React from 'react';
import { cn } from '@/lib/utils';

interface SlotCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'busy' | 'available';
}

export function SlotCard({ children, variant = 'available', className, ...props }: SlotCardProps) {
  const baseStyles = "rounded-3xl border transition-all shadow-sm";

  const variants = {
    busy: "bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800",
    available: "bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-700 hover:border-emerald-300 dark:hover:border-emerald-600",
  };

  return (
    <div 
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}
