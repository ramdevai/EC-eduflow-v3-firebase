
import admin from 'firebase-admin';
import fs from 'fs';
import Papa from 'papaparse';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function audit() {
  console.log('--- Starting Audit ---');

  // 1. Fetch some leads from Firestore
  const leadsSnapshot = await db.collection('leads').get();
  const leads = leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
  console.log(`Total leads in Firestore: ${leads.length}`);

  // 2. Read CSV
  const csvContent = fs.readFileSync('EduCompass CRM Workspace - Leads.csv', 'utf-8');
  const results = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
  const csvRows = results.data as any[];
  console.log(`Total rows in CSV: ${csvRows.length}`);

  // 3. Search for "Stubborn 2"
  const stubbornNames = ['Shilpi', 'Khyati'];
  stubbornNames.forEach(name => {
    const foundInCsv = csvRows.filter((r: any) => (r.Name || r.name || '').includes(name));
    const foundInDb = leads.filter((l: any) => (l.name || '').includes(name));
    console.log(`\nChecking for "${name}":`);
    console.log(`  CSV matches: ${foundInCsv.length}`);
    console.log(`  DB matches: ${foundInDb.length}`);
    if (foundInCsv.length > 0) {
        console.log(`  CSV Sample Phone: ${foundInCsv[0].Phone || foundInCsv[0].phone}`);
        console.log(`  CSV Sample Email: ${foundInCsv[0].Email || foundInCsv[0].email}`);
    }
  });

  // 4. Audit Field Coverage
  const fieldsToCheck = ['fatherName', 'address', 'feesPaid', 'motherName', 'grade', 'board'];
  console.log('\n--- Field Coverage Audit (Sample of 10 leads) ---');
  // Sort by updatedAt if exists
  const sortedLeads = [...leads].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const sample = sortedLeads.slice(0, 10);
  sample.forEach((l: any, i) => {
    const coverage = fieldsToCheck.filter(f => l[f] && l[f] !== '').length;
    console.log(`${i+1}. ${l.name} (Updated: ${l.updatedAt}): ${coverage}/${fieldsToCheck.length} audit fields populated`);
    if (coverage < fieldsToCheck.length) {
        const missing = fieldsToCheck.filter(f => !l[f] || l[f] === '');
        console.log(`   Missing: ${missing.join(', ')}`);
    }
  });

  // 5. Check duplicate matching keys
  console.log('\n--- Normalization Audit ---');
  const csvSample = csvRows.slice(0, 5);
  csvSample.forEach((r: any) => {
    const rawPhone = (r.Phone || r.phone || '').toString();
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
    console.log(`CSV: ${r.Name} | Raw: ${rawPhone} | Cleaned: ${cleanPhone}`);
  });

}

audit().catch(console.error);
