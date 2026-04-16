import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Test connection to Firestore
async function testConnection() {
  try {
    // Attempt to fetch a non-existent doc just to test connectivity
    await getDocFromServer(doc(db, 'system', 'config'));
    console.log("Firestore connection successful");
  } catch (error: any) {
    if (error.message?.includes('the client is offline') || error.message?.includes('Could not reach Cloud Firestore backend')) {
      console.error("Firestore connection failed: The client is offline or backend is unreachable. Check your Firebase configuration and network.");
    }
  }
}

testConnection();
