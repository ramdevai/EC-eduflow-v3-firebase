import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { parseISO, isValid, format, parse } from 'date-fns';

const REGISTRATION_TOKEN_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const REGISTRATION_SID_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeParseISO(dateInput: any): Date {
  if (!dateInput) return new Date();

  // Handle Google Calendar event object
  let str = dateInput;
  if (typeof dateInput === 'object' && dateInput !== null) {
    str = dateInput.dateTime || dateInput.date || JSON.stringify(dateInput);
  }
  if (typeof str === 'string') {
    str = str.trim();
  }

  // 1. Try standard parseISO
  try {
    const parsed = parseISO(str as string);
    if (isValid(parsed)) return parsed;
  } catch (e) {}

  // 1.5. Try YYYY-MM-DD (common from API)
  try {
    const ymdParsed = parse(str as string, 'yyyy-MM-dd', new Date());
    if (isValid(ymdParsed)) return ymdParsed;
  } catch (e) {}

  // 2. Try Indian Format (DD/MM/YYYY)
  try {
    const indianParsed = parse(str as string, 'dd/MM/yyyy', new Date());
    if (isValid(indianParsed)) return indianParsed;
  } catch (e) {}
  
  // 3. Try Indian Format with time (DD/MM/YYYY HH:mm:ss)
  try {
    const indianDateTimeParsed = parse(str as string, 'dd/MM/yyyy HH:mm:ss', new Date());
    if (isValid(indianDateTimeParsed)) return indianDateTimeParsed;
  } catch (e) {}

  // 4. Try dd MMM yyyy Format
  try {
    const mmmParsed = parse(str as string, 'dd MMM yyyy', new Date());
    if (isValid(mmmParsed)) return mmmParsed;
  } catch (e) {}

  // 5. Try native Date constructor (handles MM/DD/YYYY or YYYY/MM/DD)
  try {
    const native = new Date(str as string);
    if (isValid(native)) return native;
  } catch (e) {}

  // 5. Try Google Serial Date (numeric)
  if (!isNaN(Number(str))) {
    const excelEpoch = new Date(1899, 11, 30);
    const days = Number(str);
    const result = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
    if (isValid(result)) return result;
  }
  
  // Fallback to now
  return new Date();
}

export function safeFormat(date: any, formatStr: string = 'dd MMM yyyy'): string {
  if (!date) return '';
  
  // Handle Google Calendar event objects or complex structures
  let dateInput = date;
  if (typeof date === 'object' && date !== null && ! (date instanceof Date)) {
    dateInput = date.dateTime || date.date || date.toString();
  }
  
  const dateObj = typeof dateInput === 'string' ? safeParseISO(dateInput) : (dateInput instanceof Date ? dateInput : new Date(dateInput));
  
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  return format(dateObj, formatStr);
}

/**
 * Converts any date string to YYYY-MM-DD for HTML inputs
 */
export function toInputFormat(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  return format(safeParseISO(dateStr), 'yyyy-MM-dd');
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

export function computeLeadStatus(stage: string, providedStatus?: string): 'Open' | 'Won' | 'Lost' {
  if (providedStatus && ['Open', 'Won', 'Lost'].includes(providedStatus)) {
    return providedStatus as 'Open' | 'Won' | 'Lost';
  }
  const normalized = normalizeStage(stage);
  if (normalized === 'Session complete' || normalized === 'Report sent') {
    return 'Won';
  }
  return 'Open';
}

function getSecureRandomString(length: number, chars: string): string {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) {
    throw new Error('Secure random generator unavailable');
  }

  const bytes = new Uint8Array(length);
  cryptoApi.getRandomValues(bytes);

  return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
}

export function generateRegistrationToken(): string {
  const parts = Array.from({ length: 3 }, () => getSecureRandomString(6, REGISTRATION_TOKEN_CHARS));
  return parts.join('-');
}

export function generateRegistrationSid(): string {
  return getSecureRandomString(32, REGISTRATION_SID_CHARS);
}

export function generateWhatsAppLink(phone: string, message: string = ''): string {
  const cleanPhone = phone.replace(/\D/g, '');
  // Default to +91 if not specified (common for local projects)
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

/**
 * Formats a Firestore backup timestamp (YYYY-MM-DD-HHmm) into a readable string
 */
export function formatBackupTimestamp(timestamp: string): string {
  if (!timestamp || typeof timestamp !== 'string') return timestamp;
  
  // Format: yyyy-MM-dd-HHmm (e.g., 2026-04-24-0109)
  const parts = timestamp.split('-');
  if (parts.length < 4) return timestamp;
  
  const [year, month, day, time] = parts;
  const hour = time.substring(0, 2);
  const minute = time.substring(2, 4);
  
  try {
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
    if (isValid(date)) {
      return format(date, 'MMM dd, yyyy @ hh:mm a');
    }
  } catch (e) {}
  
  return timestamp;
}
