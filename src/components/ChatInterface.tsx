import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, Paperclip, Image as ImageIcon, X, Loader2, Bot, User as UserIcon, AlertCircle, Copy, Check, Sparkles, 
  Code, PenTool, Search, GraduationCap, ImagePlus, ArrowUp, Plus, Mic, MicOff, Telescope, MousePointer2, 
  BookOpen, Globe, AudioLines, Pause, Play, RotateCcw, Bug, Code2, TestTube, Cpu, Video, Volume2, 
  Mail, ListChecks, Clock, ClipboardList, Info, Building2, Megaphone, FileText, Lightbulb, 
  Calendar, MessageSquare, PlayCircle, Share2, Camera, FileJson, StickyNote, FileSpreadsheet, Presentation,
  Download, Maximize2, Layout, Wand2, ThumbsUp, ThumbsDown
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { Message, Mode, UserPreferences } from '../types';
import { cn } from '../lib/utils';
import { LOGO_URL } from '../constants';
import { CameraModal } from './CameraModal';
import { GoogleGenAI, Modality } from "@google/genai";
import { useNotification } from '../context/NotificationContext';
import { useUserProfile } from '../context/UserProfileContext';
import { useAuth } from '../context/AuthContext';
import { useSessions } from '../context/SessionContext';
import { generateImageWithSALU } from '../services/gemini';
import { uploadToImageKit } from '../lib/imagekit';
import { Toolbox } from './Toolbox';
import { MagicImageModal } from './MagicImageModal';

// Voice Visualizer Component
const VoiceVisualizer = ({ isListening }: { isListening: boolean }) => {
  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          animate={isListening ? {
            height: [8, Math.random() * 40 + 10, 8],
            opacity: [0.3, 1, 0.3]
          } : { height: 4, opacity: 0.2 }}
          transition={{
            duration: 0.5 + Math.random() * 0.5,
            repeat: Infinity,
            delay: i * 0.05,
            ease: "easeInOut"
          }}
          className="w-1.5 bg-brand-500 rounded-full"
        />
      ))}
    </div>
  );
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 
  'image/png', 
  'image/webp', 
  'application/pdf', 
  'text/plain',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
];

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (content: string, attachments?: string[]) => void;
  isLoading: boolean;
  mode: Mode;
  isStreaming?: boolean;
  streamedText?: string;
}

const MODE_QUICK_ACTIONS: Record<Mode, { label: string; prompt: string; icon: React.ReactNode }[]> = {
  student: [
    { label: "Study Tips", prompt: "Give me some effective study tips for my upcoming exams.", icon: <Lightbulb className="w-3.5 h-3.5" /> },
    { label: "Summarize", prompt: "Can you help me summarize my lecture notes?", icon: <FileText className="w-3.5 h-3.5" /> },
    { label: "Explain Concept", prompt: "Explain a complex academic concept in simple terms.", icon: <BookOpen className="w-3.5 h-3.5" /> },
    { label: "Exam Prep", prompt: "Create a 7-day study plan for a difficult subject.", icon: <Calendar className="w-3.5 h-3.5" /> }
  ],
  developer: [
    { label: "Debug Code", prompt: "Help me find the bug in this code snippet.", icon: <Bug className="w-3.5 h-3.5" /> },
    { label: "Refactor", prompt: "How can I refactor this function for better performance?", icon: <Code2 className="w-3.5 h-3.5" /> },
    { label: "Write Test", prompt: "Write a unit test for this React component.", icon: <TestTube className="w-3.5 h-3.5" /> },
    { label: "Explain Logic", prompt: "Explain how this complex algorithm works step-by-step.", icon: <Cpu className="w-3.5 h-3.5" /> }
  ],
  creator: [
    { label: "Content Ideas", prompt: "Give me 5 viral content ideas for my tech blog.", icon: <PlayCircle className="w-3.5 h-3.5" /> },
    { label: "Script Outline", prompt: "Help me outline a script for a 10-minute educational video.", icon: <Video className="w-3.5 h-3.5" /> },
    { label: "Social Post", prompt: "Draft a compelling LinkedIn post about my new project.", icon: <Share2 className="w-3.5 h-3.5" /> },
    { label: "Creative Prompt", prompt: "Give me a creative writing prompt to start my day.", icon: <PenTool className="w-3.5 h-3.5" /> }
  ],
  assistant: [
    { label: "Draft Email", prompt: "Draft a professional email to my professor about my project.", icon: <Mail className="w-3.5 h-3.5" /> },
    { label: "Summarize Text", prompt: "Summarize this long article into 5 key bullet points.", icon: <ListChecks className="w-3.5 h-3.5" /> },
    { label: "Plan Day", prompt: "Help me organize my tasks for a highly productive day.", icon: <Clock className="w-3.5 h-3.5" /> },
    { label: "Meeting Notes", prompt: "Create a template for taking effective meeting notes.", icon: <ClipboardList className="w-3.5 h-3.5" /> }
  ],
  salu: [
    { label: "Scholarships", prompt: "What are the current scholarship opportunities at SALU?", icon: <GraduationCap className="w-3.5 h-3.5" /> },
    { label: "Admissions", prompt: "When do the admissions for the next semester start?", icon: <Info className="w-3.5 h-3.5" /> },
    { label: "Department Info", prompt: "Tell me more about the IT department at SALU.", icon: <Building2 className="w-3.5 h-3.5" /> },
    { label: "Event News", prompt: "Are there any upcoming events or seminars at SALU?", icon: <Megaphone className="w-3.5 h-3.5" /> }
  ],
  live: [
    { label: "Voice Chat", prompt: "Start a voice conversation with me.", icon: <Mic className="w-3.5 h-3.5" /> }
  ]
};

const CopyButton = ({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-brand-500 hover:border-brand-500 transition-all shadow-sm opacity-60 hover:opacity-100 cursor-pointer"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

const ReactionButtons = () => {
  const [reaction, setReaction] = useState<'good' | 'bad' | null>(null);
  const { notify } = useNotification();

  const handleReact = (type: 'good' | 'bad') => {
    if (reaction === type) {
      setReaction(null);
    } else {
      setReaction(type);
      if (type === 'good') {
        notify('Response rated good! 👍', 'success', 2000);
      } else {
        notify('Feedback submitted 👎', 'info', 2000);
      }
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleReact('good')}
        className={cn(
          "p-1.5 rounded-lg border transition-all shadow-2xs opacity-70 hover:opacity-100 cursor-pointer",
          reaction === 'good'
            ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 opacity-100"
            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-emerald-600 hover:border-emerald-400"
        )}
        title="Good response"
      >
        <ThumbsUp className={cn("w-3.5 h-3.5", reaction === 'good' && "fill-current")} />
      </button>
      <button
        onClick={() => handleReact('bad')}
        className={cn(
          "p-1.5 rounded-lg border transition-all shadow-2xs opacity-70 hover:opacity-100 cursor-pointer",
          reaction === 'bad'
            ? "bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 opacity-100"
            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:border-rose-400"
        )}
        title="Bad response"
      >
        <ThumbsDown className={cn("w-3.5 h-3.5", reaction === 'bad' && "fill-current")} />
      </button>
    </div>
  );
};

const RetryButton = ({ onRetry, isLoading }: { onRetry: () => void; isLoading?: boolean }) => {
  return (
    <button
      onClick={onRetry}
      disabled={isLoading}
      className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-brand-500 hover:border-brand-500 transition-all shadow-2xs opacity-70 hover:opacity-100 disabled:opacity-30 cursor-pointer"
      title="Retry / Regenerate response"
    >
      <RotateCcw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
    </button>
  );
};

const CodeBlock = ({ language, value }: { language?: string; value: string }) => {
  const [copied, setCopied] = useState(false);
  const { notify } = useNotification();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      notify('Code copied to clipboard', 'success', 2000);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  return (
    <div className="relative group/code w-full my-6 rounded-2xl border border-slate-700/60 bg-[#0d0d0d] shadow-xl overflow-hidden font-sans">
      {/* Header bar area */}
      <div className="flex items-center justify-between pl-4 pr-3 py-2 bg-[#1a1a1a] border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-3">
          {/* Mac-like dots */}
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-600/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-slate-600/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-slate-600/50"></div>
          </div>
          <div className="text-[11px] font-medium text-slate-400 lowercase tracking-wide truncate">
            {language || 'text'}
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors text-xs shrink-0"
          title="Copy Code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline font-medium">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      
      {/* Code area - strictly width limited for responsiveness */}
      <div className="w-full bg-[#0d0d0d]">
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language || 'text'}
          PreTag="div"
          customStyle={{ 
            margin: 0, 
            padding: '1.25rem', 
            width: '100%', 
            fontSize: '0.8125rem',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            background: 'transparent'
          }}
          className="!m-0 md:text-sm font-mono"
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

const TypingIndicator = () => {
  const [text, setText] = useState('Thinking');
  const [dots, setDots] = useState('');

  useEffect(() => {
    const messages = ['Thinking', 'Analyzing', 'Creating', 'Searching', 'Processing'];
    let msgIndex = 0;
    
    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setText(messages[msgIndex]);
    }, 2000);

    const dotInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => {
      clearInterval(msgInterval);
      clearInterval(dotInterval);
    };
  }, []);

  return (
    <div className="flex items-center gap-3 ml-2 my-2">
      <div className="relative flex items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-100 shadow-sm">
        <motion.div 
          className="flex gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ 
                y: [0, -6, 0],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut"
              }}
              className="w-1.5 h-1.5 rounded-full bg-slate-400"
            />
          ))}
        </motion.div>
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={text}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 5 }}
          className="text-xs font-black text-brand-500 uppercase tracking-widest"
        >
          {text}{dots}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

// Cache the AI instance for TTS
let aiInstance: GoogleGenAI | null = null;
const getAI = () => {
  if (!aiInstance) {
     const apiKey = process.env.GEMINI_API_KEY;
     if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
     aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

const SpeakButton = ({ content, voicePreference }: { content: string, voicePreference: 'male' | 'female' }) => {
  const [speaking, setSpeaking] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  const stopSpeaking = useCallback(() => {
     setSpeaking(false);
     if (audioContext) audioContext.close();
     setAudioContext(null);
  }, [audioContext]);

  const handleSpeak = async () => {
    if (speaking) {
      stopSpeaking();
      return;
    }

    // Clean markdown for better speech
    const cleanContent = content
      .replace(/#+\s/g, '') // Remove headers
      .replace(/\*\*/g, '') // Remove bold
      .replace(/\*/g, '') // Remove italic
      .replace(/```[\s\S]*?```/g, ' [Code block omitted] ') // Omit code blocks
      .replace(/`[^`]+`/g, (match) => match.slice(1, -1)); // Keep inline code content

    setSpeaking(true);
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: cleanContent }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voicePreference === 'male' ? 'Puck' : 'Kore' },
                },
            },
          },
        });
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Gemini TTS returns raw 16-bit PCM Mono at 24kHz
            const int16Array = new Int16Array(bytes.buffer);
            const float32Array = new Float32Array(int16Array.length);
            for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768.0;
            }
            
            const ctx = new AudioContext({ sampleRate: 24000 });
            setAudioContext(ctx);
            
            const buffer = ctx.createBuffer(1, float32Array.length, 24000);
            buffer.getChannelData(0).set(float32Array);
            
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.onended = () => stopSpeaking();
            source.start(0);
        } else {
            throw new Error("No audio returned");
        }
    } catch (err) {
        console.error(err);
        setSpeaking(false);
    }
  };

  useEffect(() => {
    return () => stopSpeaking();
  }, [stopSpeaking]);

  return (
    <button
      onClick={handleSpeak}
      className={cn(
        "p-1.5 rounded-lg border transition-all shadow-sm opacity-60 hover:opacity-100",
        speaking 
          ? "bg-brand-500 border-brand-500 text-white opacity-100" 
          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-brand-500 hover:border-brand-500"
      )}
      title={speaking ? "Stop Speaking" : "Speak Response"}
    >
      {speaking ? <Pause className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
    </button>
  );
};

const ImageResult = ({ prompt }: { prompt: string }) => {
  const { user } = useAuth();
  const { preferences, updatePreferences } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000000));
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [engine, setEngine] = useState<'together' | 'gemini' | null>(null);
  const [step, setStep] = useState(0);
  const generationStarted = React.useRef(false);
  
  const steps = [
    { label: 'Analyzing Prompt', icon: Search },
    { label: 'Expanding Vision', icon: Wand2 },
    { label: 'Conceiving Canvas', icon: Layout },
    { label: 'Refining Masterpiece', icon: Sparkles }
  ];

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setStep(s => (s + 1) % steps.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [loading]);

  const generateImage = useCallback(async (retryCount = 0) => {
    if (generationStarted.current && retryCount === 0) return;
    
    // Quota check
    const maxImages = preferences.subscription === 'paid' ? 5 : 3;
    if ((preferences.imagesUsedToday || 0) >= maxImages) {
        setError(`You have reached your daily image generation limit (${maxImages} images/day). Upgrade for higher limits.`);
        setLoading(false);
        return;
    }

    if (retryCount === 0) {
      generationStarted.current = true;
      setLoading(true);
      setError(null);
      setEngine(null);
    }
    
    try {
      // 1. Try SALU AI Engine (Primary)
      try {
        const imageUrl = await generateImageWithSALU(prompt);
        
        // Update quota
        await updatePreferences({ imagesUsedToday: (preferences.imagesUsedToday || 0) + 1 });

        // Auto-save to ImageKit
        try {
          const ikResult = await uploadToImageKit(imageUrl, `salu-art-${Date.now()}.png`, user ? [user.uid] : undefined, user ? `/salu-ai-generated/${user.uid}` : undefined);
          setImageUrl(ikResult.url);
        } catch (ikErr) {
          console.warn("Saving SALU image to Vault failed:", ikErr);
          setImageUrl(imageUrl);
        }

        setEngine('gemini');
        setLoading(false);
        return;
      } catch (e: any) {
        console.warn("SALU generation failed, trying Together AI fallback...", e);
        
        let saluError = e.message || "";
        if (saluError.includes("403") || saluError.includes("PERMISSION_DENIED")) {
          saluError = "SALU AI Engine (Gemini) denied permission. This often happens if the API key is restricted, the model is not enabled for your region, or it's a free-tier limitation.";
        }

        // 2. Try Together AI (Secondary)
        const togetherResponse = await fetch('/api/generate-together-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, saveToImageKit: true, userId: user?.uid }),
        });

        if (togetherResponse.ok) {
          const data = await togetherResponse.json();
          if (data.image) {
            // Update quota on success
            await updatePreferences({ imagesUsedToday: (preferences.imagesUsedToday || 0) + 1 });
            setImageUrl(data.image);
            setEngine('together');
            setLoading(false);
            return;
          }
        }
        
        throw new Error(e.message || "Primary and secondary generation engines failed.");
      }
    } catch (err: any) {
      if (retryCount < 1) {
        console.warn("Generation failed, retrying once...", err);
        setTimeout(() => generateImage(retryCount + 1), 2000);
        return;
      }
      console.error("Image generation failed after retries:", err);
      setError(err.message || "Failed to generate image. All engines are currently unreachable.");
      setLoading(false);
    }
  }, [prompt, seed, preferences.subscription, preferences.imagesUsedToday, user, updatePreferences]);

  useEffect(() => {
    generateImage();
  }, [generateImage]);

  const handleRetry = () => {
    generationStarted.current = false;
    setSeed(Math.floor(Math.random() * 1000000));
  };

  const handleCopyPrompt = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    // Dispatched custom event for notification to reach context
    window.dispatchEvent(new CustomEvent('salu_notification', {
      detail: { message: 'Prompt copied to clipboard!', type: 'success' }
    }));
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `salu-ai-generated-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download image:", err);
    }
  };

  const StepIcon = steps[step].icon;

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl py-2">
      <div className="relative group overflow-hidden rounded-[2.5rem] border border-slate-200 shadow-2xl bg-white aspect-square">
        {/* Immersive Loading UI */}
        <AnimatePresence>
          {loading && !error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white"
            >
              {/* Artistic Background Animation */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 90, 180, 270, 360],
                  }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_50%_50%,#f43f5e,transparent_50%),radial-gradient(circle_at_80%_20%,#8b5cf6,transparent_40%),radial-gradient(circle_at_20%_80%,#0ea5e9,transparent_40%)] blur-[80px]"
                />
              </div>

              <div className="relative flex flex-col items-center">
                {/* Visual Core */}
                <div className="w-24 h-24 mb-8">
                  <div className="absolute inset-0 bg-brand-500/10 rounded-full blur-2xl animate-pulse" />
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="w-full h-full rounded-full border-2 border-dashed border-slate-200 p-2"
                  >
                    <div className="w-full h-full rounded-full border-t-2 border-brand-500 animate-[spin_2s_linear_infinite]" />
                  </motion.div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      key={step}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-brand-600"
                    >
                      <StepIcon className="w-8 h-8" />
                    </motion.div>
                  </div>
                </div>

                {/* Status Text */}
                <div className="text-center space-y-1">
                  <motion.h4 
                    key={step}
                    initial={{ y: 5, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-sm font-black text-slate-900 uppercase tracking-widest"
                  >
                    {steps[step].label}
                  </motion.h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    drawing picture...
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="absolute bottom-12 left-12 right-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                  className="h-full bg-brand-500 rounded-full"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {imageUrl && (
          <motion.img 
            initial={{ scale: 1.1, filter: 'blur(20px)' }}
            animate={{ 
              scale: loading ? 1.1 : 1, 
              filter: loading ? 'blur(20px)' : 'blur(0px)' 
            }}
            src={imageUrl} 
            alt={prompt}
            key={imageUrl}
            onLoad={() => {
              // Extra timeout to ensure smooth transition
              setTimeout(() => setLoading(false), 500);
            }}
            onError={() => {
              setLoading(false);
              setError("Failed to load the generated image.");
            }}
            className={cn(
              "w-full h-full object-cover transition-all duration-1000",
              loading ? "opacity-0" : "opacity-100"
            )}
            referrerPolicy="no-referrer"
          />
        )}

        {/* Overlay Actions */}
        {!loading && !error && imageUrl && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-[2px] flex items-center justify-center gap-4 z-20">
            <motion.button 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              onClick={handleDownload}
              className="p-4 bg-white text-slate-900 rounded-3xl hover:scale-110 active:scale-95 transition-all shadow-2xl font-black flex items-center gap-3 text-xs uppercase tracking-widest"
              title="Save Art"
            >
              <Download className="w-5 h-5" /> Save
            </motion.button>
            <motion.button 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              onClick={handleCopyPrompt}
              className="p-4 bg-white text-slate-900 rounded-3xl hover:scale-110 active:scale-95 transition-all shadow-2xl font-black flex items-center gap-3 text-xs uppercase tracking-widest"
              title="Copy Prompt"
            >
              <Copy className="w-5 h-5" /> Copy
            </motion.button>
            <motion.a 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              href={imageUrl} 
              target="_blank" 
              rel="noreferrer"
              className="p-4 bg-white/20 backdrop-blur-xl text-white border border-white/30 rounded-3xl hover:scale-110 active:scale-95 transition-all shadow-2xl font-black flex items-center gap-3 text-xs uppercase tracking-widest"
            >
              <Maximize2 className="w-5 h-5" /> Full
            </motion.a>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-50 p-12 text-center z-30">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>
            <h4 className="text-rose-950 font-black uppercase tracking-widest text-sm">Vision Interrupted</h4>
            <p className="text-rose-600 text-xs mt-3 mb-8 leading-relaxed font-medium">{error}</p>
            <button 
              onClick={handleRetry}
              className="px-8 py-4 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center gap-2 shadow-lg shadow-rose-200 active:scale-95"
            >
              <RotateCcw className="w-4 h-4" /> Restart Generation
            </button>
          </div>
        )}
      </div>

      {/* Footer Label */}
      <div className="px-6 py-4 bg-white border border-slate-200 rounded-[2rem] shadow-xl flex items-center gap-4 group/label hover:border-brand-200 transition-colors">
        <div className="p-2.5 rounded-2xl bg-brand-50 flex items-center justify-center group-hover/label:bg-brand-500 group-hover/label:text-white transition-all">
          <ImageIcon className="w-5 h-5 text-brand-500 group-hover/label:text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Generation Prompt</p>
          <p className="text-xs text-slate-700 italic font-medium line-clamp-1">"{prompt}"</p>
        </div>
        <button 
          onClick={handleCopyPrompt}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-brand-500"
          title="Copy Prompt"
        >
          <Copy className="w-4 h-4" />
        </button>
        {!loading && imageUrl && (
          <div className="flex flex-col items-end shrink-0">
            <span className={cn(
              "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md border",
              engine === 'gemini' ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
            )}>
              {engine === 'gemini' ? 'SALU Version' : 'Together FLUX'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const MessageContent = ({ content, role, preferences }: { content: string, role: 'user' | 'model' | 'assistant', preferences: any }) => {
  const imageRegex = /\[IMAGE_GEN:\s*([^\]]+)\]/i;
  const imageMatch = content.match(imageRegex);
  
  // Handle partial matching for better UX during streaming
  const isStartingImageGen = content.toLowerCase().includes('[image_gen:') && !content.includes(']');

  const renderContent = (text: string) => (
    <div className="markdown-body prose prose-slate dark:prose-invert max-w-none prose-sm md:prose-base overflow-hidden prose-pre:!max-w-full prose-p:leading-relaxed prose-li:marker:text-slate-400 prose-a:text-brand-600 dark:prose-a:text-brand-400">
      <Markdown 
        remarkPlugins={[remarkGfm]}
        components={{
          p: 'div',
          img: ({ src, ...props }) => <img src={src || null} {...props} referrerPolicy="no-referrer" />,
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeContent = String(children).replace(/\n$/, '');
            
            if (!inline && match) {
              return <CodeBlock language={match[1]} value={codeContent} {...props} />;
            }

            if (!inline && !match) {
              return <CodeBlock value={codeContent} {...props} />;
            }

            return (
              <code className={cn("bg-slate-100 text-brand-600 px-1.5 py-0.5 rounded-md font-bold", className)} {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {text}
      </Markdown>
    </div>
  );

  if (!imageMatch && !isStartingImageGen) {
    return renderContent(content);
  }

  const parts = content.split(imageRegex);
  const textBefore = parts[0];
  const textAfter = parts[2];

  return (
    <div className="space-y-4 w-full">
      {textBefore && textBefore.trim() && renderContent(textBefore)}

      {isStartingImageGen && !imageMatch && (
        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-pulse">
          <Sparkles className="w-5 h-5 text-brand-500" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">drawing picture...</p>
        </div>
      )}

      {imageMatch && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="mt-2"
        >
          <ImageResult key={imageMatch[1].trim()} prompt={imageMatch[1].trim()} />
        </motion.div>
      )}

      {textAfter && textAfter.trim() && renderContent(textAfter)}
    </div>
  );
};

export const ChatInterface = React.memo(({ messages, onSendMessage, isLoading, mode, isStreaming, streamedText }: ChatInterfaceProps) => {
  const { notify } = useNotification();
  const { preferences } = useUserProfile();
  const { user } = useAuth();
  const { sessions, setCurrentSessionId } = useSessions();
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);
  const [isMagicImageModalOpen, setIsMagicImageModalOpen] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const recentActivities = React.useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    const getTimestamp = (val: any) => {
      if (!val) return 0;
      if (typeof val === 'string') return new Date(val).getTime();
      if (val.seconds) return val.seconds * 1000;
      if (val instanceof Date) return val.getTime();
      return 0;
    };

    const formatRelativeTime = (timeMs: number) => {
      if (!timeMs) return '';
      const diff = Date.now() - timeMs;
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}d ago`;
      return new Date(timeMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    return sessions
      .filter(s => !s.isArchived && s.title && s.title !== 'Untitled Chat' && s.title !== 'New Chat')
      .map(session => {
        const titleLower = (session.title || '').toLowerCase();
        const lastMsgLower = (session.lastMessage || '').toLowerCase();
        const timeMs = getTimestamp(session.updatedAt) || getTimestamp(session.createdAt);

        let category = 'AI Chat';
        let icon = <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
        let badgeColor = 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-800/50';

        const sessionModeStr = (session.mode as string) || '';

        if (sessionModeStr === 'quiz' || titleLower.includes('quiz') || titleLower.includes('mcq')) {
          category = 'Quiz & MCQs';
          icon = <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
          badgeColor = 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/50';
        } else if (sessionModeStr === 'analysis' || titleLower.includes('pdf') || titleLower.includes('file') || titleLower.includes('doc') || lastMsgLower.includes('attachment analysis') || lastMsgLower.includes('.pdf')) {
          category = 'File / PDF Analysis';
          icon = <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
          badgeColor = 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-800/50';
        } else if (sessionModeStr === 'research' || titleLower.includes('research') || titleLower.includes('search')) {
          category = 'Research & Search';
          icon = <Search className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />;
          badgeColor = 'bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/50 dark:border-cyan-800/50';
        } else if (sessionModeStr === 'live' || titleLower.includes('study') || titleLower.includes('pomodoro')) {
          category = 'Study Session';
          icon = <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
          badgeColor = 'bg-purple-50 dark:bg-purple-950/40 border border-purple-200/50 dark:border-purple-800/50';
        }

        return {
          id: session.id,
          sessionId: session.id,
          title: session.title || 'Untitled Chat',
          category,
          snippet: session.lastMessage ? (session.lastMessage.length > 40 ? session.lastMessage.slice(0, 40) + '...' : session.lastMessage) : '',
          timeMs,
          formattedTime: formatRelativeTime(timeMs),
          icon,
          badgeColor
        };
      })
      .sort((a, b) => b.timeMs - a.timeMs);
  }, [sessions]);

  // Dynamic Greeting Generator based on user profile, time of day, day of week, and active mode
  const dynamicGreetingData = React.useMemo(() => {
    const rawName = (preferences?.name && preferences.name !== 'Guest User')
      ? preferences.name 
      : (user?.displayName || (user?.email ? user.email.split('@')[0] : ''));
    
    const firstName = rawName.trim().split(' ')[0] || '';
    const formattedName = firstName ? (firstName.charAt(0).toUpperCase() + firstName.slice(1)) : '';

    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dayOfWeek];

    let timeGreeting = 'Good morning';
    let timeEmoji = '🌅';
    if (hour >= 5 && hour < 12) {
      timeGreeting = 'Good morning';
      timeEmoji = '🌅';
    } else if (hour >= 12 && hour < 17) {
      timeGreeting = 'Good afternoon';
      timeEmoji = '☀️';
    } else if (hour >= 17 && hour < 22) {
      timeGreeting = 'Good evening';
      timeEmoji = '🌆';
    } else {
      timeGreeting = 'Late night study';
      timeEmoji = '🌙';
    }

    let specialDayText = '';
    if (dayOfWeek === 5) {
      specialDayText = 'Happy Friday! 🎉';
    } else if (dayOfWeek === 6 || dayOfWeek === 0) {
      specialDayText = `Happy ${dayName}! ☕`;
    } else {
      specialDayText = `Happy ${dayName}! ✨`;
    }

    const deptText = preferences?.department ? `${preferences.department} • ` : '';

    let headline = '';
    let subtitle = '';
    let badge = '';

    switch (mode) {
      case 'student':
        headline = formattedName ? `${timeGreeting}, ${formattedName}! ${timeEmoji}` : `${timeGreeting}! ${timeEmoji}`;
        subtitle = "What topic, assignment, or lecture material are we mastering today?";
        badge = `${deptText}${specialDayText} • Student Mode`;
        break;
      case 'developer':
        headline = formattedName ? `What are we coding, ${formattedName}? 💻` : `Ready to code & debug? 💻`;
        subtitle = "Architect systems, debug errors, review scripts, or design database models.";
        badge = `${specialDayText} • Developer Mode`;
        break;
      case 'creator':
        headline = formattedName ? `Unleash your spark, ${formattedName}! ✨` : `Unleash your creativity! ✨`;
        subtitle = "Draft articles, write persuasive essays, script videos, or generate AI artwork.";
        badge = `${specialDayText} • Creator Mode`;
        break;
      case 'assistant':
        headline = formattedName ? `At your service, ${formattedName} 💼` : `How may I assist you today? 💼`;
        subtitle = "Structure schedules, draft emails, organize task lists, or summarize documents.";
        badge = `${specialDayText} • Executive Assistant`;
        break;
      case 'live':
        headline = formattedName ? `Ready to speak, ${formattedName}? 🎙️` : `Ready for live voice AI? 🎙️`;
        subtitle = "Start a real-time spoken dialogue to practice language, study, or brainstorm.";
        badge = `${specialDayText} • Live Voice Mode`;
        break;
      case 'salu':
      default:
        headline = formattedName ? `Welcome back, ${formattedName}! 🏛️` : `Welcome to SALU AI! 🏛️`;
        subtitle = "Your intelligent campus assistant at Shah Abdul Latif University.";
        badge = `${deptText}${specialDayText} • SALU Core AI`;
        break;
    }

    return { headline, subtitle, badge };
  }, [preferences, user, mode]);

  const getFileName = (data: string) => {
    if (!data || typeof data !== 'string') return 'File';
    if (data.startsWith('http')) {
      return data.split('/').pop()?.split('?')[0] || 'Image';
    }
    if (data.includes('name=')) {
      const nameMatch = data.match(/name=(.*?);/);
      if (nameMatch) return decodeURIComponent(nameMatch[1]);
    }
    return 'Document';
  };

  const getFilePreviewSnippet = (data: string) => {
    try {
      if (data.includes('base64,')) {
        const parts = data.split('base64,');
        const mimeLine = parts[0];
        const mimeMatch = mimeLine.match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : '';
        const base64 = parts[1];
        
        // Handle text-like content previews
        if (mime.startsWith('text/') || mime === 'application/json' || mime === 'application/javascript') {
          const decoded = decodeURIComponent(escape(atob(base64)));
          return decoded.trim().slice(0, 300) + (decoded.length > 300 ? '...' : '');
        }

        // Special handling for Excel/CSV name based labels in data URL
        if (mimeLine.includes('name=') && (mimeLine.includes('.csv') || mimeLine.includes('.txt'))) {
          const decoded = decodeURIComponent(escape(atob(base64)));
          return decoded.trim().slice(0, 300) + (decoded.length > 300 ? '...' : '');
        }
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const getFileIcon = (data: string) => {
    if (!data || typeof data !== 'string') return <Paperclip className="w-5 h-5 text-slate-500" />;
    
    if (data.startsWith('data:image/') || (data.startsWith('http') && (data.includes('.png') || data.includes('.jpg') || data.includes('.jpeg') || data.includes('.gif') || data.includes('.webp') || data.includes('imagekit')))) return <ImageIcon className="w-5 h-5 text-blue-500" />;
    if (data.startsWith('data:application/pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (data.includes('name=') && data.includes('.docx')) return <FileText className="w-5 h-5 text-blue-600" />;
    if (data.includes('name=') && (data.includes('.xlsx') || data.includes('.xls'))) return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    if (data.includes('name=') && (data.includes('.pptx') || data.includes('.ppt'))) return <Presentation className="w-5 h-5 text-orange-500" />;
    if (data.startsWith('data:text/plain')) return <FileText className="w-5 h-5 text-slate-500" />;
    if (data.startsWith('data:text/csv')) return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    if (data.includes('spreadsheetml') || data.includes('ms-excel')) return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    if (data.includes('presentationml') || data.includes('ms-powerpoint')) return <Presentation className="w-5 h-5 text-orange-500" />;
    if (data.includes('wordprocessingml') || data.includes('msword')) return <FileText className="w-5 h-5 text-blue-600" />;
    return <Paperclip className="w-5 h-5 text-slate-500" />;
  };

  const getFileLabel = (data: string) => {
    if (!data || typeof data !== 'string') return 'File';
    
    if (data.startsWith('http')) {
      if (data.includes('.png') || data.includes('.jpg') || data.includes('.jpeg') || data.includes('.webp')) return 'Image';
      if (data.includes('imagekit')) return 'Cloud Media';
      return 'Link';
    }

    let mime = '';
    try {
        const parts = data.split(';');
        if (parts.length > 0) {
            const mimePart = parts[0].split(':');
            if (mimePart.length > 1) {
                mime = mimePart[1];
            }
        }
    } catch (e) {
        mime = '';
    }

    if (data.includes('name=')) {
      const nameMatch = data.match(/name=(.*?);/);
      if (nameMatch) {
        const name = nameMatch[1];
        if (name.endsWith('.docx')) return 'DOCX';
        if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'EXCEL';
        if (name.endsWith('.pptx') || name.endsWith('.ppt')) return 'PPT';
        if (name.endsWith('.csv')) return 'CSV';
      }
    }
    
    if (mime.startsWith('image/')) return 'Image';
    if (mime === 'application/pdf') return 'PDF';
    if (mime === 'text/plain') return 'TXT';
    if (mime === 'text/csv') return 'CSV';
    if (mime.includes('spreadsheetml') || mime.includes('ms-excel')) return 'EXCEL';
    if (mime.includes('presentationml') || mime.includes('ms-powerpoint')) return 'PPT';
    if (mime.includes('wordprocessingml') || mime.includes('msword')) return 'DOCX';
    return 'File';
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading, input, attachments]);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 300);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText) return;

    e.preventDefault();
    
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = input.substring(0, start) + pastedText + input.substring(end);
    
    setInput(newValue);
    
    // Set caret position after the pasted text
    const newCaretPos = start + pastedText.length;
    
    // Use requestAnimationFrame to ensure the DOM has updated before setting selection
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCaretPos, newCaretPos);
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;
    
    // Total payload estimate (for Firestore warnings)
    const totalSize = attachments.reduce((sum, att) => sum + att.length, 0);
    if (totalSize > 12 * 1024 * 1024) { // 12MB limit for the UI
      setFileError("Total attachment size exceeds 10MB. Please remove some files.");
      notify('Message too large', 'error', 5000);
      return;
    }

    console.log("Submitting message:", { input, attachmentCount: attachments.length });
    
    try {
      let finalInput = input;
      if (input.trim().startsWith('/image ')) {
        const prompt = input.trim().slice(7).trim();
        if (prompt) {
          finalInput = `Respond EXCLUSIVELY with the image generation tag for: ${prompt}`;
        }
      }

      // Logic to save images to ImageKit before sending
      const processedAttachments = await Promise.all(attachments.map(async (att, idx) => {
        if (att.startsWith('data:image/')) {
          try {
            const fileName = `chat-upload-${Date.now()}-${idx}.png`;
            const result = await uploadToImageKit(att, fileName, user ? [user.uid] : undefined, user ? `/salu-ai-generated/${user.uid}` : undefined);
            return result.url; // Replace base64 with ImageKit URL
          } catch (e) {
            console.warn("Failed to save to ImageKit, using base64 fallback:", e);
            return att;
          }
        }
        return att;
      }));

      await onSendMessage(finalInput, processedAttachments);
      setInput('');
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setFileError("Failed to send message. Please try again.");
      notify('Failed to send message', 'error', 3000);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setFileError(null);
    setIsUploading(true);

    const newAttachments: string[] = [];
    const fileList = Array.from(files);

    try {
      await Promise.all(fileList.map(async (file) => {
        if (file.size > MAX_FILE_SIZE) {
          setFileError(`"${file.name}" is too large. Max size is 10MB.`);
          return;
        }

        // Handle Office formats (DOCX, XLSX)
        if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            const text = result.value;
            const base64 = btoa(unescape(encodeURIComponent(text)));
            newAttachments.push(`data:text/plain;name=${encodeURIComponent(file.name)};base64,${base64}`);
            return;
          } catch (err) {
            console.error("Error parsing DOCX:", err);
          }
        }

        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.type.includes('spreadsheetml') || file.type.includes('ms-excel')) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer);
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            const base64 = btoa(unescape(encodeURIComponent(csv)));
            newAttachments.push(`data:text/csv;name=${encodeURIComponent(file.name)};base64,${base64}`);
            return;
          } catch (err) {
            console.error("Error parsing Excel:", err);
          }
        }

        // Handle text files (TXT, CSV, JSON, etc.)
        if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.csv') || file.name.endsWith('.json') || file.name.endsWith('.md')) {
            try {
                const text = await file.text();
                const base64 = btoa(unescape(encodeURIComponent(text)));
                const mimeType = file.type || (file.name.endsWith('.csv') ? 'text/csv' : 'text/plain');
                newAttachments.push(`data:${mimeType};name=${encodeURIComponent(file.name)};base64,${base64}`);
                return;
            } catch (err) {
                console.error("Error reading text file:", err);
            }
        }

        // Default to Data URL (for images, pdfs, and others supported natively by Gemini)
        return new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    newAttachments.push(reader.result as string);
                }
                resolve();
            };
            reader.onerror = () => {
                console.error("Error reading file:", file.name);
                resolve();
            };
            reader.readAsDataURL(file);
        });
      }));

      setAttachments(prev => [...prev, ...newAttachments]);
    } catch (err) {
      console.error("Error reading file:", err);
      setFileError("Could not process one or more files.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const startListening = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setFileError("Speech recognition is not supported in this browser.");
      return;
    }

    try {
      // Explicitly request microphone permission first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the tracks immediately as we only needed to trigger the permission prompt
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error("Microphone permission error:", err);
      setFileError("Microphone access denied. If you are in a preview window, please click 'Open in New Tab' (top right) to grant permissions.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setIsPaused(false);
    };

    recognition.onresult = (event: any) => {
      let fullTranscript = '';
      for (let i = 0; i < event.results.length; ++i) {
        fullTranscript += event.results[i][0].transcript;
      }

      if (fullTranscript) {
        setInput(fullTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') return;
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      setIsPaused(false);
      
      if (event.error === 'not-allowed') {
        setFileError("Microphone access denied. If you are in a preview window, please click 'Open in New Tab' (top right) to grant permissions.");
      } else {
        setFileError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // If we didn't manually pause, then it ended unexpectedly or naturally
      if (!isPaused) {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
      setIsPaused(false);
      setFileError("Could not start microphone. It might be in use or blocked.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setIsPaused(false);
  };

  const togglePause = () => {
    if (isPaused) {
      // Resume
      startListening();
    } else {
      // Pause
      if (recognitionRef.current) {
        setIsPaused(true);
        recognitionRef.current.stop();
      }
    }
  };

  const clearTranscription = () => {
    setInput('');
  };

  const handleCameraCapture = (base64: string) => {
    setAttachments(prev => [...prev, base64]);
    notify('Photo captured successfully', 'success', 2000);
  };

  return (
    <div className="flex flex-col h-full relative bg-transparent transition-colors duration-300">
      <CameraModal 
        isOpen={isCameraOpen} 
        onClose={() => setIsCameraOpen(false)} 
        onCapture={handleCameraCapture} 
      />

      <Toolbox 
        isOpen={isToolboxOpen} 
        onClose={() => setIsToolboxOpen(false)} 
      />

      <MagicImageModal
        isOpen={isMagicImageModalOpen}
        onClose={() => setIsMagicImageModalOpen(false)}
        onGenerate={(prompt) => {
          onSendMessage(`Respond EXCLUSIVELY with the image generation tag for: ${prompt}`, []);
        }}
      />
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 md:space-y-12 scroll-smooth relative custom-scrollbar">
        {messages.length === 0 && (
          <div className="min-h-full flex flex-col items-center justify-center max-w-2xl mx-auto py-6 sm:py-10 relative z-10 px-4 w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mb-3 p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-slate-800 flex items-center justify-center"
            >
              <img 
                src={LOGO_URL} 
                alt="SALU AI Logo" 
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain mx-auto"
                referrerPolicy="no-referrer"
              />
            </motion.div>

            {/* Dynamic Context Badge */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50/80 dark:bg-brand-950/50 border border-brand-200/60 dark:border-brand-800/60 text-[11px] font-semibold text-brand-700 dark:text-brand-300 mb-2.5 shadow-2xs"
            >
              <Sparkles className="w-3 h-3 text-brand-500 animate-pulse shrink-0" />
              <span>{dynamicGreetingData.badge}</span>
            </motion.div>

            {/* Dynamic Headline */}
            <motion.h1 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-center text-slate-800 dark:text-slate-100 leading-tight font-serif"
            >
              {dynamicGreetingData.headline}
            </motion.h1>

            {/* Dynamic Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
              className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center max-w-md mb-6 leading-relaxed"
            >
              {dynamicGreetingData.subtitle}
            </motion.p>

            {/* Mode Quick Action Chips */}
            <div className="w-full flex flex-wrap justify-center gap-2 mb-6">
              {MODE_QUICK_ACTIONS[mode]?.map((action, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSendMessage(action.prompt, [])}
                  className="flex items-center gap-2 px-3.5 py-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs transition-all cursor-pointer"
                >
                  <span className="text-brand-600 dark:text-brand-400">{action.icon}</span>
                  <span>{action.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Real-time Recent Activities Section - only shown when real recent activities exist */}
            {recentActivities.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="w-full bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Recent Activities
                    </h2>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    {recentActivities.length} recent
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {recentActivities.slice(0, 5).map((activity) => (
                    <button
                      key={activity.id}
                      onClick={() => activity.sessionId && setCurrentSessionId(activity.sessionId)}
                      className="w-full flex items-center justify-between py-2.5 px-2 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 rounded-xl transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105",
                          activity.badgeColor
                        )}>
                          {activity.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                              {activity.title}
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                            {activity.category} {activity.snippet ? `• ${activity.snippet}` : ''}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 shrink-0 ml-2">
                        {activity.formattedTime}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {messages.map((message, index) => (
          <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.4, 
              ease: [0.23, 1, 0.32, 1] 
            }}
            key={message.id}
            id={`message-${message.id}`}
            className={cn(
              "flex gap-4 md:gap-5 max-w-4xl mx-auto group/message w-full",
              message.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}
          >
            {message.role !== 'user' && (
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center shrink-0 mt-1 ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <img 
                  src={LOGO_URL} 
                  alt="AI Avatar" 
                  className="w-5 h-5 md:w-6 md:h-6 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            
            <div className={cn(
              "flex flex-col gap-2 max-w-[85%] md:max-w-[80%]",
              message.role === 'user' ? "items-end" : "items-start"
            )}>
              <div className={cn(
                "relative group/bubble transition-all duration-300 text-[15px] leading-relaxed",
                message.role === 'user' 
                  ? "bg-[rgba(var(--brand-color-rgb),0.15)] dark:bg-[rgba(var(--brand-color-rgb),0.2)] text-slate-800 dark:text-slate-100 px-5 py-3.5 rounded-[1.5rem] rounded-tr-md shadow-sm border border-[rgba(var(--brand-color-rgb),0.3)]" 
                  : "bg-transparent text-slate-800 dark:text-slate-100 px-1 py-2"
              )}>
                {/* Message Actions (Copy) - User Only */}
                {message.role === 'user' && (
                  <div className={cn(
                    "absolute top-2 right-full mr-2 flex items-center gap-1 opacity-0 group-hover/bubble:opacity-100 transition-all duration-300 translate-x-2 group-hover/bubble:translate-x-0 z-10"
                  )}>
                    <CopyButton content={message.content} />
                  </div>
                )}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-3 mb-3">
                    {message.attachments.map((att, i) => (
                      <div key={i} className="relative group/att">
                        {(att && typeof att === 'string' && (att.startsWith('data:image/') || att.startsWith('http'))) ? (
                          <img 
                            src={att || null} 
                            alt="attachment" 
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            className="max-w-[200px] md:max-w-xs rounded-2xl border border-slate-200/20 shadow-sm" 
                          />
                        ) : (
                          <div className={cn(
                            "flex items-center gap-3 p-3 border rounded-2xl min-w-[180px]",
                            message.role === 'user' ? "bg-white/50 border-[#e1e5ea]" : "bg-slate-50 border-slate-200"
                          )}>
                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                              {getFileIcon(att)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{getFileLabel(att)}</p>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                {att && typeof att === 'string' && att.includes(';') && att.includes(':') 
                                  ? att.split(';')[0].split(':')[1]?.split('/')[1]?.toUpperCase() || 'FILE'
                                  : 'FILE'
                                }
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <MessageContent content={message.content} role={message.role} preferences={preferences} />
                {(message.role === 'model' || message.role === 'assistant') && (
                  <div className="flex items-center gap-1.5 mt-2.5 pt-1 opacity-90 sm:opacity-0 group-hover/message:opacity-100 group-hover/bubble:opacity-100 transition-all duration-200 flex-wrap">
                    <SpeakButton content={message.content} voicePreference={preferences.voice || 'female'} />
                    <CopyButton content={message.content} />
                    <ReactionButtons />
                    <RetryButton 
                      isLoading={isLoading} 
                      onRetry={() => {
                        for (let i = index - 1; i >= 0; i--) {
                          if (messages[i].role === 'user') {
                            onSendMessage(messages[i].content, messages[i].attachments);
                            notify('Regenerating response...', 'info', 2000);
                            break;
                          }
                        }
                      }} 
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4 md:gap-5 max-w-4xl mx-auto w-full"
          >
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center shrink-0 mt-1 ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <img 
                src={LOGO_URL} 
                alt="Logo" 
                className="w-5 h-5 md:w-6 md:h-6 object-contain animate-pulse"
                referrerPolicy="no-referrer"
              />
            </div>
            {isStreaming && streamedText ? (
              <div className="flex flex-col gap-2 max-w-[85%] md:max-w-[80%] items-start">
                <div className="relative group/bubble transition-all duration-300 text-[15px] leading-relaxed bg-transparent text-slate-800 dark:text-slate-100 px-1 py-2 w-full">
                  <div className="flex flex-col">
                    <MessageContent content={streamedText} role="model" preferences={preferences} />
                    <motion.div 
                      className="w-2 h-4 bg-brand-500 mt-2 rounded-[1px]"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center pt-2">
                <TypingIndicator />
              </div>
            )}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={scrollToBottom}
            className="absolute bottom-32 right-8 md:right-12 p-3 bg-white border border-slate-200 text-slate-600 rounded-full shadow-xl hover:bg-slate-50 hover:text-brand-600 transition-all z-50 group"
          >
            <ArrowUp className="w-5 h-5 rotate-180 group-hover:translate-y-0.5 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="px-2.5 pb-2 sm:px-4 sm:pb-3 md:px-6 md:pb-4 relative z-20 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-slate-950 dark:via-slate-950/95 pt-3 transition-colors duration-300 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="max-w-2xl mx-auto w-full">
          <motion.form 
            id="chat-input-area"
            onSubmit={handleSubmit} 
            animate={{
               boxShadow: isTyping ? "0 10px 28px rgba(0,0,0,0.06)" : "0 2px 10px rgba(0,0,0,0.02)"
            }}
            className={cn(
               "relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 transition-all duration-300 ease-out shadow-xs flex flex-col w-full",
               isTyping ? "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900" : ""
            )}
          >
            <AnimatePresence>
              {fileError && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-red-50 border-b border-red-100 p-3 mx-2 mt-2 rounded-xl flex items-center gap-2 text-red-600 text-[10px] font-black uppercase tracking-wider"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1">{fileError}</span>
                  <button onClick={() => setFileError(null)} className="p-1 hover:bg-red-100 rounded-full transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              )}
              {(attachments.length > 0 || isUploading) && (
                <motion.div 
                  initial={{ height: 0, opacity: 0, y: 10 }}
                  animate={{ height: 'auto', opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: 10 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="flex flex-wrap gap-3 p-3 overflow-y-auto max-h-[160px] custom-scrollbar"
                >
                  {attachments.map((att, i) => (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      key={i} 
                      className="relative group/att"
                    >
                      {(att && typeof att === 'string' && (att.startsWith('data:image/') || att.startsWith('http'))) ? (
                        <div className="relative">
                          <img 
                            src={att || null} 
                            alt="preview" 
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-sm transition-all group-hover/att:scale-[1.02]" 
                          />
                        </div>
                      ) : (
                        <div className="w-32 h-16 rounded-xl bg-slate-50 border border-slate-200 shadow-sm flex flex-col p-2 transition-all group-hover/att:scale-[1.02] overflow-hidden relative text-left">
                          <div className="flex items-center gap-1.5 shrink-0">
                              <div className="p-1 rounded flex items-center justify-center">
                                  {getFileIcon(att)}
                              </div>
                              <div className="min-w-0 flex-1">
                                  <p className="text-[9px] font-bold text-slate-700 truncate">
                                      {getFileName(att)}
                                  </p>
                              </div>
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="absolute -top-1.5 -right-1.5 bg-white border border-slate-200 text-slate-600 rounded-full p-1 shadow-sm md:opacity-0 group-hover/att:opacity-100 transition-all hover:bg-slate-100 hover:text-red-500 z-10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                  {isUploading && (
                    <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 relative flex flex-col px-2 pt-2 md:px-3 md:pt-3">
               <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'inherit';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                  }}
                  onPaste={handlePaste}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !isMobile()) {
                      e.preventDefault();
                      handleSubmit(e);
                      textareaRef.current!.style.height = '48px';
                      }
                  }}
                  placeholder={isListening ? "" : "Ask SALU AI anything..."}
                  className={cn(
                      "w-full bg-transparent border-none focus:ring-0 resize-none px-1 text-slate-800 placeholder-slate-400 text-[15px] md:text-[16px] leading-[24px] min-h-[48px] max-h-[200px] outline-none rounded-none py-1",
                      isListening && "blur-[1px] opacity-40"
                  )}
                  rows={1}
                />

                <AnimatePresence>
                  {isListening && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <VoiceVisualizer isListening={isListening} />
                    </motion.div>
                  )}
                </AnimatePresence>
            </div>

            <div className="flex items-center justify-between px-2 pb-2 mt-2">
              <div className="flex items-center gap-0.5 md:gap-1 overflow-x-auto no-scrollbar">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept="image/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  className="hidden"
                />

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  disabled={isUploading}
                  onClick={(e) => {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 rounded-full transition-colors flex items-center justify-center shrink-0"
                  title="Add attachment"
                >
                  <Paperclip className="w-5 h-5" />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={cn(
                    "p-2 rounded-full transition-colors flex items-center justify-center shrink-0",
                    isListening ? "bg-red-50 dark:bg-red-900/20 text-red-500" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                  )}
                  title={isListening ? "Stop listening" : "Voice input"}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={(e) => { e.preventDefault(); setIsCameraOpen(true); }}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 rounded-full transition-colors flex items-center justify-center shrink-0"
                  title="Take Photo"
                >
                  <Camera className="w-5 h-5" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={(e) => { e.preventDefault(); setIsToolboxOpen(true); }}
                  className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 dark:hover:text-purple-400 rounded-full transition-colors flex items-center justify-center shrink-0"
                  title="AI Tools"
                >
                  <Sparkles className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="flex items-center shrink-0 ml-2">
                <motion.button
                  whileHover={(!input.trim() && attachments.length === 0) || isLoading ? {} : { scale: 1.05 }}
                  whileTap={(!input.trim() && attachments.length === 0) || isLoading ? {} : { scale: 0.95 }}
                  type="submit"
                  disabled={(!input.trim() && attachments.length === 0) || isLoading}
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 relative overflow-hidden",
                    isLoading 
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-wait"
                      : (input.trim() || attachments.length > 0)
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md hover:bg-slate-800 dark:hover:bg-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                  )}
                >
                    {isLoading ? (
                      <Loader2 className="w-[18px] h-[18px] animate-spin" />
                    ) : (
                      <ArrowUp className="w-[18px] h-[18px] stroke-[2.5px]" />
                    )}
                </motion.button>
              </div>
            </div>
            </motion.form>

            <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-2">
              SALU AI can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </div>
    );
  }
);

