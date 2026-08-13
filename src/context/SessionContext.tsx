import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, 
  serverTimestamp, orderBy, getDocs, writeBatch, setDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';
import { Message, ChatSession, Mode } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface SessionContextType {
  sessions: ChatSession[];
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  messages: Message[];
  createSession: (mode: Mode) => Promise<string>;
  addMessage: (sessionId: string, role: 'user' | 'model', content: string, attachments?: string[]) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  updateSessionTitle: (id: string, title: string) => Promise<void>;
  archiveSession: (id: string, isArchived: boolean) => Promise<void>;
  pinSession: (id: string, isPinned: boolean) => Promise<void>;
  clearSessions: () => Promise<void>;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSessions([]);
      setCurrentSessionId(null);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'sessions'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionList: ChatSession[] = [];
      snapshot.forEach((doc) => {
        sessionList.push(doc.data() as ChatSession);
      });
      
      sessionList.sort((a, b) => {
        const getTimestamp = (val: any) => {
          if (!val) return 0;
          if (typeof val === 'string') return new Date(val).getTime();
          if (val.seconds) return val.seconds * 1000 + (val.nanoseconds / 1000000);
          if (val instanceof Date) return val.getTime();
          return 0;
        };
        return getTimestamp(b.updatedAt) - getTimestamp(a.updatedAt);
      });

      setSessions(sessionList);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to sessions:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!currentSessionId || !user) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'sessions', currentSessionId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageList: Message[] = [];
      snapshot.forEach((doc) => {
        messageList.push(doc.data() as Message);
      });
      setMessages(messageList);
    }, (error) => {
      console.error("Error listening to messages:", error);
    });

    return () => unsubscribe();
  }, [currentSessionId, user]);

  const createSession = async (mode: Mode): Promise<string> => {
    if (!user) throw new Error("User not authenticated");

    try {
      const sessionId = uuidv4();
      const newSession: ChatSession = {
        id: sessionId,
        userId: user.uid,
        title: 'New Conversation',
        mode,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'sessions', sessionId), {
        ...newSession,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setCurrentSessionId(sessionId);
      return sessionId;
    } catch (error) {
      console.error("Error creating session:", error);
      notify?.('Failed to create new chat', 'error', 3000);
      throw error;
    }
  };

  const addMessage = async (sessionId: string, role: 'user' | 'model', content: string, attachments?: string[]) => {
    if (!user) return;

    try {
      const messageId = uuidv4();
      
      // Prepare message data
      let finalAttachments = attachments || [];
      const estimatedSize = JSON.stringify({ content, attachments: finalAttachments }).length;

      // Firestore document limit is 1MB (~1,048,576 bytes)
      // If the message is too large, we save a version without large attachments to history
      // but the AI still gets the full context in the current session
      if (estimatedSize > 900000) {
        finalAttachments = finalAttachments.map(att => {
          if (att.length > 50000) { // If individual attachment is somewhat large
            const mime = att.split(';')[0].split(':')[1] || 'file';
            return `[${mime.toUpperCase()} too large for history storage - sent to AI for this turn]`;
          }
          return att;
        });
        notify?.('Large files sent to AI but skipped for history storage to stay within limits.', 'info', 5000);
      }

      const newMessage = {
        id: messageId,
        role,
        content,
        attachments: finalAttachments,
        timestamp: new Date().toISOString()
      };

      const batch = writeBatch(db);
      
      const messageRef = doc(db, 'sessions', sessionId, 'messages', messageId);
      batch.set(messageRef, {
        ...newMessage,
        timestamp: serverTimestamp()
      });

      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionUpdate: any = { updatedAt: serverTimestamp() };
      
      const targetSession = sessions.find(s => s.id === sessionId);
      const currentTitle = targetSession?.title || '';
      const isGenericTitle = !currentTitle || 
        currentTitle === 'New Conversation' || 
        currentTitle === 'New Student Chat' || 
        currentTitle === 'New Chat' || 
        currentTitle === 'Untitled' || 
        currentTitle.toLowerCase().startsWith('new ');

      if (role === 'user' && (isGenericTitle || messages.length === 0)) {
        const cleanContent = content ? content.trim().replace(/^[\s#*>-]+/, '') : '';
        const preliminaryTitle = cleanContent 
          ? (cleanContent.slice(0, 35) + (cleanContent.length > 35 ? '...' : '')) 
          : (finalAttachments.length > 0 ? "Attachment Analysis" : "New Conversation");

        sessionUpdate.title = preliminaryTitle;

        // Optimistically update local session title
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: preliminaryTitle, updatedAt: new Date().toISOString() } : s));

        // Kick off asynchronous AI title generation
        if (cleanContent) {
          import('../services/gemini').then(({ generateChatTitle }) => {
            generateChatTitle(cleanContent).then(aiTitle => {
              if (aiTitle) {
                updateDoc(sessionRef, { title: aiTitle, updatedAt: serverTimestamp() }).catch(console.error);
                setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: aiTitle } : s));
              }
            }).catch(console.error);
          }).catch(console.error);
        }
      }
      
      batch.update(sessionRef, sessionUpdate);
      await batch.commit();
    } catch (error: any) {
      console.error("Error adding message:", error);
      notify?.(`Failed to save message: ${error.message || String(error)}`, 'error', 5000);
      throw error;
    }
  };

  const deleteSession = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'sessions', id));
      if (currentSessionId === id) {
        setCurrentSessionId(null);
      }
      notify?.('Chat deleted', 'info', 2000);
    } catch (error) {
      console.error("Error deleting session:", error);
      notify?.('Failed to delete chat', 'error', 3000);
    }
  };

  const updateSessionTitle = async (id: string, title: string) => {
    if (!user) return;
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title, updatedAt: new Date().toISOString() } : s));
    try {
      await updateDoc(doc(db, 'sessions', id), { title, updatedAt: serverTimestamp() });
    } catch (error) {
      console.error("Error updating session title:", error);
      notify?.('Failed to rename chat', 'error', 3000);
    }
  };

  const archiveSession = async (id: string, isArchived: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'sessions', id), { isArchived, updatedAt: serverTimestamp() });
      notify?.(isArchived ? 'Chat archived' : 'Chat restored', 'info', 2000);
    } catch (error) {
      console.error("Error archiving session:", error);
      notify?.('Failed to archive chat', 'error', 3000);
    }
  };

  const pinSession = async (id: string, isPinned: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'sessions', id), { isPinned, updatedAt: serverTimestamp() });
      notify?.(isPinned ? 'Chat pinned' : 'Chat unpinned', 'info', 2000);
    } catch (error) {
      console.error("Error pinning session:", error);
      notify?.('Failed to pin chat', 'error', 3000);
    }
  };

  const clearSessions = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'sessions'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      setCurrentSessionId(null);
      notify?.('All chat sessions cleared', 'info', 2000);
    } catch (error) {
      console.error("Error clearing sessions:", error);
      notify?.('Failed to clear sessions', 'error', 3000);
    }
  };

  return (
    <SessionContext.Provider value={{ 
      sessions, currentSessionId, setCurrentSessionId, messages, 
      createSession, addMessage, deleteSession, updateSessionTitle, 
      archiveSession, pinSession, clearSessions, loading
    }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSessions = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSessions must be used within a SessionProvider');
  }
  return context;
};
