import React from 'react';
import { cn } from '@/lib/utils';

export function ToggleSwitch({ checked, onChange, label, disabled = false }: {
  checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean;
}) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label}
    disabled={disabled} onClick={() => onChange(!checked)}
    className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      checked ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600')}>
    <span className={cn('absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform', checked ? 'translate-x-5' : 'translate-x-0')} />
  </button>;
}
