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
}

const defaultPreferences: UserPreferences = {
  name: 'Guest User',
  language: 'English',
  accentColor: '#0ea5e9',
  persona: 'friendly',
  voice: 'female',
  likes: '',
  dislikes: '',
  department: '',
  class: '',
};

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const isAdmin = preferences.role === 'admin' || user?.email === 'salucoders@gmail.com';

  useEffect(() => {
    if (!user) {
      setPreferences(defaultPreferences);
      setLoading(false);
      return;
    }

    setLoading(true);
    const userDocRef = doc(db, 'users', user.uid);
    
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setPreferences(docSnap.data() as UserPreferences);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error listening to user profile:", error);
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
    <UserProfileContext.Provider value={{ preferences, updatePreferences, loading, isAdmin }}>
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
