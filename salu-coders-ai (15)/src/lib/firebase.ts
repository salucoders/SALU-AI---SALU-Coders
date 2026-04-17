import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCP1Wdy2ZYNmv1bFfdwSu7Zb_lEYQio3wc",
  authDomain: "salu-ai-3e7cd.firebaseapp.com",
  projectId: "salu-ai-3e7cd",
  storageBucket: "salu-ai-3e7cd.firebasestorage.app",
  messagingSenderId: "616454920473",
  appId: "1:616454920473:web:45c83d3815c7cc618fcd88",
  measurementId: "G-8LPK76XSYX"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
