import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeStage(stage: string): string {
  if (!stage) return 'New';
  const s = stage.trim().toLowerCase();
  
  const map: Record<string, string> = {
    'new': 'New',
    'converted': 'Registration requested',
    'registration requested': 'Registration requested',
    'details requested': 'Registration done',
    'registration done': 'Registration done',
    'test sent': 'Test sent',
    'test completed': 'Test completed',
    'appt scheduled': '1:1 scheduled',
    '1:1 scheduled': '1:1 scheduled',
    '1:1 complete': 'Session complete',
    'session complete': 'Session complete',
    'report sent': 'Report sent'
  };

  return map[s] || stage;
}
