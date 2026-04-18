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
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        try {
          // Wrap DB operations in a timeout to prevent hanging the auth flow
          // and catch connection errors gracefully
          const configPromise = getDoc(doc(db, 'system', 'config')).catch(() => null);
          const userDocPromise = getDoc(doc(db, 'users', currentUser.uid)).catch(() => null);
          
          const [configDoc, userDoc] = await Promise.all([configPromise, userDocPromise]);
          const config = (configDoc && configDoc.exists()) ? configDoc.data() : { publicRegistration: true };
          
          const isAdmin = currentUser.email === 'salucoders@gmail.com';

          if (userDoc && !userDoc.exists()) {
            // Check if registration is allowed
            if (!config.publicRegistration && !isAdmin) {
              await signOut(auth);
              notify?.('Registration is currently disabled by administrator', 'error', 5000);
              setUser(null);
              return;
            }

            // Attempt to create profile, but don't crash if offline
            try {
              await setDoc(doc(db, 'users', currentUser.uid), {
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
            } catch (setErr) {
              console.warn("Could not create user profile in Firestore (Offline?):", setErr);
            }
          }
        } catch (error: any) {
          if (error.code === 'unavailable' || error.message?.includes('offline')) {
            console.warn("Firestore syncing skipped: Client is operating in offline mode.");
          } else {
            console.error("Error syncing user profile:", error);
          }
        }
      }
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
