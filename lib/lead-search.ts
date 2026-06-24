import { Lead } from './types';

function searchableValues(lead: Lead): string[] {
  return Object.values(lead)
    .filter((value): value is string | number | boolean =>
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    )
    .map((value) => String(value).toLowerCase());
}

export function leadMatchesSearch(lead: Lead, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;

  const values = searchableValues(lead);
  if (values.some((value) => value.includes(query))) return true;

  const queryDigits = query.replace(/\D/g, '');
  return queryDigits.length >= 3 &&
    values.some((value) => value.replace(/\D/g, '').includes(queryDigits));
}
