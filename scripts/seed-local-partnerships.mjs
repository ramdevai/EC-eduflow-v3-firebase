import { createLocalFirestore } from './firestore-admin.mjs';

// Institutions EduCompass already has an active partnership with. No contact
// person, MOU, or commission terms yet - add those from the Partnerships UI
// once you have them; this just gets the relationships into the system.
const PARTNER_INSTITUTIONS = [
  'IISM',
  'CPLC Classes',
  'Akash Classes',
  'IMS Classes',
  'Ecole Intuit Lab',
  'Zell Edtech',
  'School of Luxury Management',
  'Atlas',
  'Aberdeen University',
  'Bristol University',
  'University of York',
  'Whistling Woods',
];

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const db = createLocalFirestore();
const batch = db.batch();
const now = new Date().toISOString();

for (const name of PARTNER_INSTITUTIONS) {
  const institutionId = slugify(name);

  batch.set(
    db.collection('institutions').doc(institutionId),
    {
      name,
      campus: '',
      address: '',
      status: 'active',
      contacts: [],
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  const partnershipRef = db.collection('partnerships').doc(institutionId);
  batch.set(
    partnershipRef,
    {
      institutionId,
      institutionName: name,
      status: 'Active',
      pointOfContact: { name: '', role: '' },
      mouSigned: false,
      commissionTerms: '',
      notes: '',
      tags: [],
      createdAt: now,
      updatedAt: now,
      createdBy: 'seed-script',
    },
    { merge: true }
  );
}

await batch.commit();
console.log(`Seeded ${PARTNER_INSTITUTIONS.length} institutions + partnerships.`);
