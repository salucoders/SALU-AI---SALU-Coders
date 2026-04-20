export type View = 'home' | 'discover' | 'library';

export type Mode = 'student' | 'developer' | 'creator' | 'assistant' | 'salu' | 'live';
export type Persona = 'professional' | 'friendly' | 'witty' | 'encouraging' | 'creative';

export interface Message {
  id: string;
  role: 'user' | 'model' | 'assistant';
  content: string;
  timestamp: any;
  attachments?: string[]; // base64 images
}

export interface UserPreferences {
  name: string;
  language: 'English' | 'Urdu' | 'Sindhi' | 'Spanish' | 'French' | 'German';
  profilePicture?: string; // base64
  accentColor: string; // hex or tailwind color name
  theme: 'light' | 'dark' | 'system';
  persona: Persona;
  preferredMode: Mode;
  voice: 'male' | 'female';
  likes?: string;
  dislikes?: string;
  department?: string;
  class?: string;
  role?: 'admin' | 'user' | 'suspended';
  subscription?: 'free' | 'paid';
  creditsTotal?: number;
  creditsUsedToday?: number;
  lastCreditReset?: any;
  assistantName?: string;
  updatedAt?: any;
  uid?: string;
}

export interface ChatSession {
  id: string;
  userId?: string;
  title: string;
  mode: Mode;
  persona?: Persona; // Optional, can override global preference
  messages?: Message[];
  createdAt: any;
  updatedAt?: any;
  isArchived?: boolean;
}
