import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, doc, getDocFromServer, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Silence Firestore offline/connection warnings in console
setLogLevel('silent');

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with settings for restrictive environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

// Robust Error Handling as per Firebase integration guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Handled:', JSON.stringify(errInfo));
  return errInfo;
}

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
