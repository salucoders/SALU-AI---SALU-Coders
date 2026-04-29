import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, Paperclip, Image as ImageIcon, X, Loader2, Bot, User as UserIcon, AlertCircle, Copy, Check, Sparkles, 
  Code, PenTool, Search, GraduationCap, ImagePlus, ArrowUp, Plus, Mic, MicOff, Telescope, MousePointer2, 
  BookOpen, Globe, AudioLines, Pause, Play, RotateCcw, Bug, Code2, TestTube, Cpu, Video, Volume2, 
  Mail, ListChecks, Clock, ClipboardList, Info, Building2, Megaphone, FileText, Lightbulb, 
  Calendar, MessageSquare, PlayCircle, Share2, Camera, FileJson, StickyNote, FileSpreadsheet, Presentation,
  Download, Maximize2, Layout, Wand2
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
      className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-brand-500 hover:border-brand-500 transition-all shadow-sm opacity-60 hover:opacity-100"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
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
    <div className="relative group/code w-full my-4 rounded-xl border border-slate-700 bg-[#1e1e1e] overflow-hidden">
      {/* Header bar area */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700 shrink-0">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate mr-2">
          {language || 'code'}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white transition-all text-xs border border-slate-600 shrink-0"
          title="Copy Code"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      
      {/* Code area - strictly width limited for responsiveness */}
      <div className="w-full">
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language || 'text'}
          PreTag="div"
          customStyle={{ 
            margin: 0, 
            padding: '0.75rem', 
            width: '100%', 
            fontSize: '0.75rem',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
          className="!m-0 md:text-sm"
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
    <div className="markdown-body prose prose-slate max-w-none prose-sm md:prose-base overflow-hidden prose-pre:!max-w-full">
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
          <div className="min-h-full flex flex-col items-center justify-center max-w-3xl mx-auto py-12 relative z-10">
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-[2rem] md:text-[2.75rem] font-medium tracking-tight mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-brand-500 via-purple-500 to-rose-400"
            >
              How can I help you today?
            </motion.h1>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-4">
              {MODE_QUICK_ACTIONS[mode]?.map((action, idx) => (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                  onClick={() => onSendMessage(action.prompt)}
                  className="flex items-start gap-4 p-4 md:p-5 bg-white border border-slate-100 rounded-[1.5rem] md:rounded-[2rem] text-left hover:bg-slate-50 hover:shadow-sm transition-all active:scale-[0.98] group"
                >
                  <div className="p-2.5 rounded-2xl bg-brand-50/50 text-brand-600 transition-colors shrink-0">
                    {action.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 mb-0.5">{action.label}</p>
                    <p className="text-[13px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                      {action.prompt}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <motion.div
            layout
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              duration: 0.5, 
              ease: [0.23, 1, 0.32, 1],
              delay: index === messages.length - 1 ? 0 : 0.05 
            }}
            key={message.id}
            id={`message-${message.id}`}
            className={cn(
              "flex gap-3 md:gap-4 max-w-5xl mx-auto group/message",
              message.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}
          >
            {message.role !== 'user' && (
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 mt-1">
                <img 
                  src={LOGO_URL} 
                  alt="AI Avatar" 
                  className="w-6 h-6 md:w-8 md:h-8 object-contain drop-shadow-sm"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            
            <div className={cn(
              "flex flex-col gap-2 max-w-[88%] md:max-w-[80%]",
              message.role === 'user' ? "items-end" : "items-start"
            )}>
              <div className={cn(
                "relative group/bubble transition-all duration-300",
                message.role === 'user' 
                  ? "bg-[var(--brand-color)] text-white px-6 py-4 rounded-3xl rounded-br-none shadow-lg shadow-brand-500/20" 
                  : "bg-white text-slate-800 px-6 py-4 rounded-3xl rounded-bl-none shadow-sm border border-slate-200/60"
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
                {message.role === 'model' && (
                  <div className="flex items-center gap-1.5 mt-2 opacity-0 group-hover/bubble:opacity-100 transition-all duration-300">
                    <SpeakButton content={message.content} voicePreference={preferences.voice || 'female'} />
                    <CopyButton content={message.content} />
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
            className="flex gap-3 md:gap-4 max-w-5xl mx-auto"
          >
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 mt-1">
              <img 
                src={LOGO_URL} 
                alt="Logo" 
                className="w-6 h-6 md:w-8 md:h-8 object-contain drop-shadow-sm animate-pulse"
                referrerPolicy="no-referrer"
              />
            </div>
            {isStreaming && streamedText ? (
              <div className="flex flex-col gap-2 max-w-[88%] md:max-w-[80%] items-start">
                <div className="relative pt-1 transition-all duration-300 text-slate-800 bg-transparent w-full">
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

      <div className="px-2 pb-2 md:px-8 md:pb-6 relative z-20 bg-gradient-to-t from-white via-white to-transparent pt-10">
        <div className="max-w-4xl mx-auto">
          <motion.form 
            id="chat-input-area"
            onSubmit={handleSubmit} 
            animate={{
               boxShadow: isTyping ? "0 8px 30px rgba(0,0,0,0.08)" : "0 4px 24px rgba(0,0,0,0.04)"
            }}
            className={cn(
               "relative bg-white border border-slate-200 rounded-[2rem] p-1.5 transition-all duration-500 ease-out",
               isTyping ? "border-slate-300 transform -translate-y-1" : "border-slate-200"
            )}
          >
            {/* Backdrop for closing menu */}
            <AnimatePresence>
              {showAttachmentMenu && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowAttachmentMenu(false)}
                  className="fixed inset-0 z-[90] bg-transparent"
                />
              )}
            </AnimatePresence>


              <AnimatePresence>
                {showAttachmentMenu && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowAttachmentMenu(false)}
                    className="fixed inset-0 z-[150] bg-slate-900/10 backdrop-blur-[2px]"
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {fileError && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-red-50 border-b border-red-100 p-3 flex items-center gap-2 text-red-600 text-[10px] font-black uppercase tracking-wider"
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
                    className="flex flex-wrap gap-3 p-4 border-b border-slate-100 bg-white rounded-t-[2rem]"
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
                              className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-2xl border-2 border-white shadow-md transition-all group-hover/att:scale-[1.02] group-hover/att:shadow-lg" 
                            />
                            <div className="absolute inset-0 bg-black/5 rounded-2xl pointer-events-none" />
                          </div>
                        ) : (
                          <div className="w-40 md:w-48 h-20 md:h-24 rounded-2xl bg-white border-2 border-slate-100 shadow-sm flex flex-col p-2.5 transition-all group-hover/att:scale-[1.02] group-hover/att:shadow-md group-hover/att:border-brand-100 overflow-hidden relative text-left">
                            <div className="flex items-center gap-2 mb-1.5 shrink-0">
                                <div className="p-1.5 rounded-lg bg-slate-50 group-hover/att:bg-brand-50 transition-colors">
                                    {getFileIcon(att)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-black text-slate-900 truncate uppercase mt-0.5">
                                        {getFileName(att)}
                                    </p>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                                        {getFileLabel(att)}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Document Content Preview Snippet */}
                            <div className="flex-1 bg-slate-50/50 rounded-lg p-2 overflow-hidden border border-slate-100 group-hover/att:bg-white transition-colors">
                                {getFilePreviewSnippet(att) ? (
                                    <div className="h-full">
                                        <p className="text-[9px] text-slate-500 leading-tight line-clamp-4 font-mono select-none">
                                            {getFilePreviewSnippet(att)}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center gap-1.5 opacity-30">
                                        {att.startsWith('data:application/pdf') ? (
                                            <>
                                                <FileText className="w-5 h-5 text-red-500" />
                                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">Portable Doc</span>
                                            </>
                                        ) : (
                                            <>
                                                <FileText className="w-5 h-5 text-slate-400" />
                                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Analysis Ready</span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeAttachment(i)}
                          className="absolute -top-2 -right-2 bg-slate-900 text-white rounded-full p-1.5 shadow-xl md:opacity-0 group-hover/att:opacity-100 transition-all hover:bg-red-500 hover:scale-110 z-10"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                    {isUploading && (
                      <div className="w-16 h-16 rounded-xl border border-dashed border-slate-200 bg-white flex flex-col items-center justify-center gap-1">
                        <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
                        <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Reading</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2 px-1">
                {/* File Input Source (Hidden) */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept="image/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  className="hidden"
                />

                <div className="flex items-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    disabled={isUploading}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowAttachmentMenu(!showAttachmentMenu);
                    }}
                    className={cn(
                      "p-1.5 md:p-2 rounded-full transition-all shrink-0 relative z-[160] ml-1 flex items-center justify-center",
                      showAttachmentMenu ? "text-brand-500 bg-brand-50" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/80"
                    )}
                    title="Add attachment"
                  >
                    <Plus className={cn("w-[22px] h-[22px] stroke-[2.5px] transition-transform duration-300", showAttachmentMenu && "rotate-45")} />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsToolboxOpen(true);
                    }}
                    className={cn(
                      "p-1.5 md:p-2 rounded-full transition-all shrink-0 ml-0.5 flex items-center justify-center",
                      isToolboxOpen ? "text-brand-500 bg-brand-50" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/80"
                    )}
                    title="Study Toolbox"
                  >
                    <Sparkles className="w-5 h-5 md:w-[22px] md:h-[22px] stroke-[2px]" />
                  </motion.button>

                  <AnimatePresence>
                    {showAttachmentMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10, x: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10, x: -10 }}
                        className="absolute bottom-full left-0 mb-6 w-80 bg-white rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.25)] border border-slate-100 overflow-hidden z-[160] p-3"
                      >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50 mb-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Quick Actions</span>
                          <Sparkles className="w-3.5 h-3.5 text-brand-500 animate-pulse" />
                        </div>
                        <div className="grid grid-cols-1 gap-1.5">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsMagicImageModalOpen(true);
                              setShowAttachmentMenu(false);
                            }}
                            className="w-full flex items-center gap-4 p-4 hover:bg-emerald-50/50 rounded-2xl transition-all text-left group border border-transparent hover:border-emerald-100"
                          >
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 shrink-0 shadow-sm group-hover:shadow-[0_4px_12px_rgba(16,185,129,0.3)] group-hover:scale-110">
                              <ImageIcon className="w-6 h-6 text-emerald-500 group-hover:text-white transition-colors" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors">Magic Image</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider group-hover:text-emerald-500/70 transition-colors">AI Art Generation</p>
                            </div>
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                              setShowAttachmentMenu(false);
                            }}
                            className="w-full flex items-center gap-4 p-4 hover:bg-blue-50/50 rounded-2xl transition-all text-left group border border-transparent hover:border-blue-100"
                          >
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shrink-0 shadow-sm group-hover:shadow-[0_4px_12px_rgba(59,130,246,0.3)] group-hover:scale-110">
                              <FileText className="w-6 h-6 text-blue-500 group-hover:text-white transition-colors" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-black text-slate-900 group-hover:text-blue-700 transition-colors">Upload Files</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider group-hover:text-blue-500/70 transition-colors">PDF, Docs, Images</p>
                            </div>
                          </motion.button>
                          
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsCameraOpen(true);
                              setShowAttachmentMenu(false);
                            }}
                            className="w-full flex items-center gap-4 p-4 hover:bg-purple-50/50 rounded-2xl transition-all text-left group border border-transparent hover:border-purple-100"
                          >
                            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-all duration-300 shrink-0 shadow-sm group-hover:shadow-[0_4px_12px_rgba(168,85,247,0.3)] group-hover:scale-110">
                              <Camera className="w-6 h-6 text-purple-500 group-hover:text-white transition-colors" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-black text-slate-900 group-hover:text-purple-700 transition-colors">Take Photo</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider group-hover:text-purple-500/70 transition-colors">Use Device Camera</p>
                            </div>
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInput("Please generate a detailed study note and summary based on our conversation so far.");
                              setShowAttachmentMenu(false);
                            }}
                            className="w-full flex items-center gap-4 p-4 hover:bg-amber-50/50 rounded-2xl transition-all text-left group border border-transparent hover:border-amber-100"
                          >
                            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shrink-0 shadow-sm group-hover:shadow-[0_4px_12px_rgba(245,158,11,0.3)] group-hover:scale-110">
                              <StickyNote className="w-6 h-6 text-amber-500 group-hover:text-white transition-colors" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-black text-slate-900 group-hover:text-amber-700 transition-colors">Generate Note</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider group-hover:text-amber-500/70 transition-colors">AI Study Summary</p>
                            </div>
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Textarea: Auto-expanding */}
                <div className="flex-1 relative flex items-center">
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
                        textareaRef.current!.style.height = '52px';
                        }
                    }}
                    placeholder={isListening 
                      ? "" 
                      : MODE_QUICK_ACTIONS[mode] 
                        ? `Try: "${MODE_QUICK_ACTIONS[mode][0].label}" or "${MODE_QUICK_ACTIONS[mode][1].label}"...`
                        : "Ask SALU AI..."
                    }
                    className={cn(
                        "w-full bg-transparent border-none focus:ring-0 resize-none py-3 px-1 min-h-[52px] max-h-[200px] text-slate-800 placeholder-slate-500 no-scrollbar text-[15px] md:text-[16px] font-medium leading-[28px] transition-all self-center mt-0.5",
                        isListening && "blur-[1px] opacity-40"
                    )}
                    rows={1}
                  />

                  {/* Inline Voice Visualizer */}
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

                  {/* Clear Attachments Button */}
                  {attachments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAttachments([])}
                      className="absolute -top-10 right-0 flex items-center gap-1 text-[10px] bg-slate-100 px-3 py-1 rounded-full font-bold uppercase tracking-widest text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" /> Clear All
                    </button>
                  )}
                </div>
                
                {/* Right Actions: Mic & Send */}
                <div className="flex items-center gap-1.5 md:gap-2 shrink-0 py-1.5 pr-1.5 md:pr-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    className={cn(
                      "w-[38px] h-[38px] md:w-[42px] md:h-[42px] rounded-full transition-all duration-300 shrink-0 flex items-center justify-center border",
                      isListening 
                        ? "bg-brand-500 text-white shadow-[0_0_20px_rgba(14,165,233,0.4)] border-transparent" 
                        : "text-slate-500 bg-transparent border-transparent hover:bg-slate-100/80 hover:text-slate-800"
                    )}
                    title={isListening ? "Stop listening" : "Voice input"}
                  >
                    {isListening ? (
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            <AudioLines className="w-5 h-5 md:w-[22px] md:h-[22px]" />
                        </motion.div>
                    ) : (
                        <Mic className="w-5 h-5 md:w-[22px] md:h-[22px]" />
                    )}
                  </motion.button>

                  <motion.button
                    whileHover={(input.trim() || attachments.length > 0) && !isLoading ? { scale: 1.05 } : {}}
                    whileTap={(input.trim() || attachments.length > 0) && !isLoading ? { scale: 0.95 } : {}}
                    type="submit"
                    disabled={(!input.trim() && attachments.length === 0) || isLoading}
                    className={cn(
                      "w-[38px] h-[38px] md:w-[42px] md:h-[42px] rounded-full transition-all duration-300 flex items-center justify-center shrink-0 ml-1 relative overflow-hidden",
                      isLoading 
                        ? "bg-slate-100 text-slate-400 cursor-wait"
                        : (input.trim() || attachments.length > 0)
                          ? "bg-slate-900 text-white shadow-xl hover:bg-black hover:shadow-2xl"
                          : "bg-slate-100 text-slate-400"
                    )}
                  >
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div
                          key="loading"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                        >
                          <Loader2 className="w-[18px] h-[18px] md:w-[20px] md:h-[20px] animate-spin" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="send"
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -20, opacity: 0 }}
                          className="flex items-center justify-center"
                        >
                          <ArrowUp className="w-[18px] h-[18px] md:w-[20px] md:h-[20px] stroke-[2.5px]" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>
              </div>
            </motion.form>

            <p className="text-xs text-center text-slate-500 mt-4">
              SALU AI can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </div>
    );
  }
);

