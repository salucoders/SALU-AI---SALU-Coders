import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { UserPreferences } from '../types';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

interface UserProfileContextType {
  preferences: UserPreferences;
  updatePreferences: (newPrefs: Partial<UserPreferences>) => void;
  loading: boolean;
  isAdmin: boolean;
  isPaid: boolean;
}

const defaultPreferences: UserPreferences = {
  name: 'Guest User',
  language: 'English',
  accentColor: '#0ea5e9',
  theme: 'light',
  persona: 'friendly',
  preferredMode: 'student',
  voice: 'female',
  likes: '',
  dislikes: '',
  department: '',
  class: '',
  subscription: 'free',
  creditsTotal: 30,
  creditsUsedToday: 0,
  imagesUsedToday: 0,
  assistantName: 'SALU AI',
  aiTrainingEnabled: false,
};

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const isAdmin = preferences.role === 'admin' || user?.email === 'salucoders@gmail.com';
  const isPaid = preferences.subscription === 'paid' || isAdmin;

  useEffect(() => {
    if (!user || user.uid !== preferences.uid) return; // Prevent logic before data is loaded

    // Daily Credit Reset Logic
    const lastReset = preferences.lastCreditReset?.toDate ? preferences.lastCreditReset.toDate() : new Date(0);
    const now = new Date();
    
    // Use ISO string to ensure consistency across re-renders and logins
    const todayStr = now.toISOString().split('T')[0];
    const lastResetStr = lastReset.toISOString().split('T')[0];

    if (todayStr !== lastResetStr) {
      console.log(`Resetting credits for ${user.email}. Last reset: ${lastResetStr}, Today: ${todayStr}`);
      const dailyAllowance = preferences.subscription === 'paid' ? 100 : 30;
      
      // Update local state immediately to prevent multiple triggers in same session
      setPreferences(prev => ({
        ...prev,
        creditsUsedToday: 0,
        imagesUsedToday: 0,
        creditsTotal: dailyAllowance,
        lastCreditReset: { toDate: () => now } // Mock for local check
      }));

      updatePreferences({
        creditsUsedToday: 0,
        imagesUsedToday: 0,
        creditsTotal: dailyAllowance,
        lastCreditReset: serverTimestamp()
      });
    }
  }, [user, preferences.lastCreditReset, preferences.subscription, preferences.uid]);

  useEffect(() => {
    if (!user) {
      setPreferences(defaultPreferences);
      setLoading(false);
      return;
    }

    // Optimistically set the user's name from Firebase Auth instantly
    setPreferences(prev => ({ 
      ...prev, 
      name: user.displayName || user.email?.split('@')[0] || prev.name, 
      email: user.email || prev.email,
      profilePicture: user.photoURL || prev.profilePicture
    }));

    setLoading(true);
    const userDocRef = doc(db, 'users', user.uid);
    
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setPreferences({
          ...defaultPreferences,
          ...docSnap.data(),
          uid: docSnap.id
        } as UserPreferences);
      }
      setLoading(false);
    }, (error: any) => {
      if (error.code === 'unavailable' || error.message?.includes('offline')) {
        console.warn("User profile sync paused (Offline mode)");
      } else {
        console.error("Error listening to user profile:", error);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    document.documentElement.style.setProperty('--brand-color', preferences.accentColor);
    
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };
    
    const rgb = hexToRgb(preferences.accentColor);
    if (rgb) {
      document.documentElement.style.setProperty('--brand-color-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
  }, [preferences.accentColor]);

  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    if (!user) return;
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        ...newPrefs,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating user preferences:", error);
    }
  };

  return (
    <UserProfileContext.Provider value={{ preferences, updatePreferences, loading, isAdmin, isPaid }}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};
