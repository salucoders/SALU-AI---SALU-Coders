import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with settings for restrictive environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false, // Prevents persistent connection hanging in certain environments
}, firebaseConfig.firestoreDatabaseId || '(default)');

// Diagnostic helper to help troubleshoot connectivity
(window as any)._firestoreDb = db;
(window as any)._firebaseConfig = firebaseConfig;

// Test connection to Firestore after a short delay to allow SDK to initialize
setTimeout(async () => {
  try {
    // Attempt to fetch a non-existent doc just to test connectivity
    // Using getDocFromServer to bypass cache and verify real network path
    await getDocFromServer(doc(db, 'system', 'test_connection'));
  } catch (error: any) {
    if (error.code === 'unavailable' || error.message?.includes('offline') || error.message?.includes('Could not reach')) {
      // Quiet warning for expected transient connectivity issues in sandboxed environments
      console.log("Firestore notice: Operating in offline/restricted mode. Some real-time features may be delayed.");
    }
  }
}, 2000);
