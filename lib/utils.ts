import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { parseISO, isValid, format, parse } from 'date-fns';

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
