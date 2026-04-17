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
      const newMessage = {
        id: messageId,
        role,
        content,
        attachments: attachments || [],
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
      
      if (role === 'user' && messages.length === 0) {
        sessionUpdate.title = content.slice(0, 40) + (content.length > 40 ? '...' : '');
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
      archiveSession, clearSessions, loading
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
