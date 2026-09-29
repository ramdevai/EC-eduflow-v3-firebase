export const GOOGLE_CONTACT_PERSON_FIELDS =
  'names,emailAddresses,phoneNumbers,metadata,biographies,organizations';

const DATE_SUFFIX = /\s+(\d{6})$/;
const CONTACT_SOURCE_TYPE = 'CONTACT';
const INDIA_TIME_ZONE = 'Asia/Kolkata';

export interface GoogleContactSource {
  type?: string | null;
  id?: string | null;
  updateTime?: string | null;
}

export interface GoogleContactPerson {
  names?: Array<{ displayName?: string | null }> | null;
  emailAddresses?: Array<{ value?: string | null }> | null;
  phoneNumbers?: Array<{ value?: string | null }> | null;
  biographies?: Array<{ value?: string | null }> | null;
  organizations?: Array<{ name?: string | null }> | null;
  metadata?: {
    deleted?: boolean | null;
    sources?: GoogleContactSource[] | null;
  } | null;
}

interface ConnectionsPage {
  data: {
    connections?: GoogleContactPerson[] | null;
    nextPageToken?: string | null;
  };
}

export type ListConnections = (params: {
  resourceName: 'people/me';
  pageSize: number;
  sortOrder: 'LAST_MODIFIED_DESCENDING';
  personFields: string;
  sources: ['READ_SOURCE_TYPE_CONTACT'];
  pageToken?: string;
}) => Promise<ConnectionsPage>;

export function getContactSource(person: GoogleContactPerson): GoogleContactSource | null {
  return person.metadata?.sources?.find((source) => source.type === CONTACT_SOURCE_TYPE) || null;
}

export function extractLeadDate(person: GoogleContactPerson): { code: string; isoDate: string } | null {
  const values = [
    person.names?.[0]?.displayName,
    person.biographies?.[0]?.value,
    person.organizations?.[0]?.name,
  ];

  for (const value of values) {
    const match = String(value || '').match(DATE_SUFFIX);
    if (!match) continue;

    const code = match[1];
    const day = Number(code.slice(0, 2));
    const month = Number(code.slice(2, 4));
    const year = 2000 + Number(code.slice(4, 6));
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day
    ) {
      return { code, isoDate: date.toISOString().slice(0, 10) };
    }
  }

  return null;
}

function formatIndiaDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: INDIA_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function isLeadDateInCronWindow(leadDate: string, from: Date, to: Date): boolean {
  return leadDate >= formatIndiaDate(from) && leadDate <= formatIndiaDate(to);
}

export async function collectContactsModifiedInWindow(
  listConnections: ListConnections,
  window: { fromExclusive: Date; toInclusive: Date },
): Promise<{ contacts: GoogleContactPerson[]; checked: number; pages: number }> {
  const contacts: GoogleContactPerson[] = [];
  let checked = 0;
  let pages = 0;
  let pageToken: string | undefined;

  do {
    const response = await listConnections({
      resourceName: 'people/me',
      pageSize: 1000,
      sortOrder: 'LAST_MODIFIED_DESCENDING',
      personFields: GOOGLE_CONTACT_PERSON_FIELDS,
      sources: ['READ_SOURCE_TYPE_CONTACT'],
      ...(pageToken ? { pageToken } : {}),
    });
    pages += 1;

    const pageContacts = response.data.connections || [];
    checked += pageContacts.length;
    let reachedCutoff = false;

    for (const person of pageContacts) {
      const updateTimeValue = getContactSource(person)?.updateTime;
      if (!updateTimeValue) continue;

      const updateTime = new Date(updateTimeValue);
      if (Number.isNaN(updateTime.getTime())) continue;

      if (updateTime <= window.fromExclusive) {
        reachedCutoff = true;
        continue;
      }

      if (updateTime <= window.toInclusive && !person.metadata?.deleted) {
        contacts.push(person);
      }
    }

    pageToken = reachedCutoff ? undefined : response.data.nextPageToken || undefined;
  } while (pageToken);

  return { contacts, checked, pages };
}

export function stripLeadDateSuffix(value: string): string {
  return value.replace(DATE_SUFFIX, '').trim();
}
