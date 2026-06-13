const DATE_SUFFIX = /\s+(\d{6})$/;

export function hasRecognizedLeadDateSuffix(contact) {
  const values = [contact.rawName, contact.name, contact.biography, contact.organization].filter(Boolean);
  return values.some((value) => {
    const match = String(value).match(DATE_SUFFIX);
    if (!match) return false;
    const [, code] = match;
    const day = Number(code.slice(0, 2));
    const month = Number(code.slice(2, 4));
    const year = 2000 + Number(code.slice(4, 6));
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day;
  });
}

export function planPrimaryContactRecovery(leads, contacts, recoveredAt) {
  const contactsById = new Map(contacts.map((contact) => [contact.googleContactId, contact]));
  const report = {
    recoverable: [],
    partial: [],
    unmatched: [],
    skipped: [],
  };

  for (const lead of leads) {
    if (!lead.privacy_consent || !lead.privacy_consent_date) {
      report.skipped.push({ id: lead.id, reason: 'missing confirmed registration consent metadata' });
      continue;
    }
    if (lead.studentName || lead.studentPhone || lead.studentEmail || lead.primaryContactRecoveredAt) {
      report.skipped.push({ id: lead.id, reason: 'student fields already populated or recovery already recorded' });
      continue;
    }
    if (!lead.googleContactId) {
      report.unmatched.push({ id: lead.id, reason: 'missing googleContactId' });
      continue;
    }

    const contact = contactsById.get(lead.googleContactId);
    if (!contact) {
      report.unmatched.push({ id: lead.id, reason: 'no exact Google Contact match' });
      continue;
    }
    if (!hasRecognizedLeadDateSuffix(contact)) {
      report.unmatched.push({ id: lead.id, reason: 'Google Contact has no recognized lead date suffix' });
      continue;
    }

    const updates = {
      studentName: lead.name || '',
      studentPhone: lead.phone || '',
      studentEmail: lead.email || '',
      primaryContactRecoveredAt: recoveredAt,
    };
    const restored = [];
    const missing = [];
    for (const field of ['name', 'phone', 'email']) {
      const value = String(contact[field] || '').trim();
      if (value) {
        updates[field] = value;
        restored.push(field);
      } else {
        missing.push(field);
      }
    }

    const item = { id: lead.id, googleContactId: lead.googleContactId, updates, restored, missing };
    if (missing.length > 0) report.partial.push(item);
    else report.recoverable.push(item);
  }

  return report;
}
