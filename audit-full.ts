import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}')) });
const db = admin.firestore();
async function run() {
  const snapshot = await db.collection('leads').where('name', '>=', 'Rushil').where('name', '<=', 'Rushil' + '\uf8ff').get();
  if (snapshot.empty) {
    console.log('No matches for Rushil');
  }
  snapshot.forEach(doc => {
    console.log(`\nLead ID: ${doc.id}`);
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}
run();
