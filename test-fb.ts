import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const fbConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({ projectId: fbConfig.projectId });
}

const db = getFirestore(undefined, fbConfig.firestoreDatabaseId);

async function test() {
  const doc = await db.collection('system').doc('config').get();
  console.log('Exists:', doc.exists);
  if (doc.exists) {
    console.log('Data:', doc.data());
  }
}
test().catch(console.error);
