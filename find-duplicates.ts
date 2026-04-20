import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}')) });
const db = admin.firestore();
async function run() {
  const names = ['Shilpi', 'Khyati'];
  for (const name of names) {
    const snapshot = await db.collection('leads').get();
    const matches = snapshot.docs.filter(doc => (doc.data().name || '').includes(name));
    console.log(`\nMatches for "${name}": ${matches.length}`);
    matches.forEach(doc => console.log(` - ID: ${doc.id}, Name: ${doc.data().name}, Email: ${doc.data().email}, Phone: ${doc.data().phone}`));
  }
}
run();
