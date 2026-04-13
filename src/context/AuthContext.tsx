import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useNotification } from './NotificationContext';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticating: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { notify } = useNotification();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // Fetch system config for registration check
          const configDoc = await getDoc(doc(db, 'system', 'config'));
          const config = configDoc.exists() ? configDoc.data() : { publicRegistration: true };
          
          // Ensure user profile exists in Firestore
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          const isAdmin = currentUser.email === 'salucoders@gmail.com';

          if (!userDoc.exists()) {
            // Check if registration is allowed
            if (!config.publicRegistration && !isAdmin) {
              await signOut(auth);
              notify?.('Registration is currently disabled by administrator', 'error', 5000);
              setUser(null);
              setLoading(false);
              return;
            }

            await setDoc(userDocRef, {
              uid: currentUser.uid,
              name: currentUser.displayName || 'Guest',
              email: currentUser.email,
              profilePicture: currentUser.photoURL || '',
              language: 'English',
              accentColor: '#0ea5e9',
              persona: 'friendly',
              voice: 'female',
              role: isAdmin ? 'admin' : 'user',
              updatedAt: serverTimestamp()
            });
          }
        } catch (error) {
          console.error("Error syncing user profile:", error);
        }
      }
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [notify]);

  const loginWithGoogle = async () => {
    if (isAuthenticating || user) return;
    
    setIsAuthenticating(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      await auth.authStateReady();
      await signInWithPopup(auth, provider);
      notify?.('Successfully logged in', 'success', 3000);
    } catch (error: any) {
      console.error("Login Error:", error);
      
      let errorMessage = "Failed to sign in. Please try again.";
      
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = "This domain is not authorized for Firebase Auth. Please add it in the Firebase Console.";
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Login popup was closed. Please try again.";
      } else if (error.code === 'auth/cancelled-by-user') {
        errorMessage = "Login was cancelled.";
      } else if (error.message?.includes('INTERNAL ASSERTION FAILED')) {
        errorMessage = "Authentication system error. Please refresh the page.";
        try { await signOut(auth); } catch (e) {}
      }
      
      notify?.(errorMessage, 'error', 5000);
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticating, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
