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

export function generateRegistrationToken(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 12; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
        if ((i + 1) % 4 === 0 && i !== 11) token += '-';
    }
    return token;
}

export function generateWhatsAppLink(phone: string, message: string = ''): string {
  const cleanPhone = phone.replace(/\D/g, '');
  // Default to +91 if not specified (common for local projects)
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}
