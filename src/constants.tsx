import { GraduationCap, Code, Video, School, User, Mic } from 'lucide-react';
import { Mode } from './types';

export const LOGO_URL = '/assets/logo/Shah_Abdul_Latif_University_logo.png?v=2';
export const CREATOR_IMAGE_URL = 'https://ik.imagekit.io/saluai/chat-upload-1776679564148-0_tLyZhIpaG.png?updatedAt=1776679566642';
export const APP_NAME = 'SALU AI';

export const MODES: { id: Mode; label: string; icon: any; color: string; description: string }[] = [
  { id: 'student', label: 'Student', icon: GraduationCap, color: 'text-blue-500 bg-blue-50', description: 'Assignments, Notes, AI Images' },
  { id: 'developer', label: 'Developer', icon: Code, color: 'text-emerald-500 bg-emerald-50', description: 'Code, Debug, AI Diagrams' },
  { id: 'creator', label: 'Creator', icon: Video, color: 'text-purple-500 bg-purple-50', description: 'YouTube, SEO, AI Art' },
  { id: 'assistant', label: 'Assistant', icon: User, color: 'text-orange-500 bg-orange-50', description: 'Emails, Schedules, AI Design' },
  { id: 'salu', label: 'SALU Plus', icon: School, color: 'text-brand-500 bg-brand-50', description: 'University Updates, Community' },
  { id: 'live', label: 'Live AI', icon: Mic, color: 'text-rose-500 bg-rose-50', description: 'Real-time Voice Conversation' },
];
