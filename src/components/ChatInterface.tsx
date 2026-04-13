import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Paperclip, Image as ImageIcon, X, Loader2, Bot, User as UserIcon, AlertCircle, Copy, Check, Sparkles, 
  Code, PenTool, Search, GraduationCap, ImagePlus, ArrowUp, Plus, Mic, MicOff, Telescope, MousePointer2, 
  BookOpen, Globe, AudioLines, Pause, Play, RotateCcw, Bug, Code2, TestTube, Cpu, Video, 
  Mail, ListChecks, Clock, ClipboardList, Info, Building2, Megaphone, FileText, Lightbulb, 
  Calendar, MessageSquare, PlayCircle, Share2, Camera
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { Message, Mode } from '../types';
import { cn } from '../lib/utils';
import { CameraModal } from './CameraModal';
import { useNotification } from '../context/NotificationContext';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (content: string, attachments?: string[]) => void;
  isLoading: boolean;
  mode: Mode;
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
      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-brand-500 hover:border-brand-500 transition-all shadow-sm opacity-0 group-hover:opacity-100"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
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
    <div className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ 
              scale: [1, 1.4, 1],
              opacity: [0.3, 1, 0.3],
              y: [0, -4, 0]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
            className="w-1.5 h-1.5 bg-brand-500 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.3)]"
          />
        ))}
      </div>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[80px]">
        SALU AI is {text}{dots}
      </span>
    </div>
  );
};

export const ChatInterface = React.memo(({ messages, onSendMessage, isLoading, mode }: ChatInterfaceProps) => {
  const { notify } = useNotification();
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const getFileIcon = (data: string) => {
    if (data.startsWith('data:image/')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
    if (data.startsWith('data:application/pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (data.startsWith('data:text/')) return <FileText className="w-5 h-5 text-slate-500" />;
    return <Paperclip className="w-5 h-5 text-slate-500" />;
  };

  const getFileName = (data: string) => {
    if (data.startsWith('data:image/')) return 'Image';
    if (data.startsWith('data:application/pdf')) return 'PDF Document';
    if (data.startsWith('data:text/')) return 'Text File';
    return 'Attachment';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;
    
    console.log("Submitting message:", { input, attachmentCount: attachments.length });
    
    try {
      await onSendMessage(input, attachments);
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
      for (const file of fileList) {
        if (file.size > MAX_FILE_SIZE) {
          setFileError(`File "${file.name}" is too large. Max size is 5MB.`);
          continue;
        }

        const reader = new FileReader();
        const promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
        });

        reader.readAsDataURL(file);
        const result = await promise;
        newAttachments.push(result);
      }

      setAttachments(prev => [...prev, ...newAttachments]);
    } catch (err) {
      console.error("Error reading file:", err);
      setFileError("Failed to read one or more files.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setFileError("Speech recognition is not supported in this browser.");
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
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') return;
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      setIsPaused(false);
      setFileError(`Speech recognition error: ${event.error}`);
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
    <div className="flex flex-col h-full relative bg-slate-50">
      <CameraModal 
        isOpen={isCameraOpen} 
        onClose={() => setIsCameraOpen(false)} 
        onCapture={handleCameraCapture} 
      />
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-10 scroll-smooth relative">
        {messages.length === 0 && (
          <div className="min-h-full flex flex-col items-center justify-center text-center max-w-5xl mx-auto space-y-10 md:space-y-16 py-8 md:py-12 relative z-10">
            {/* Animated Background Blobs */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 pointer-events-none overflow-hidden">
              <motion.div 
                animate={{ 
                  scale: [1, 1.2, 1],
                  x: [0, 50, 0],
                  y: [0, -30, 0],
                  opacity: [0.03, 0.08, 0.03]
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-0 left-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-brand-500 rounded-full blur-[80px] md:blur-[120px]" 
              />
              <motion.div 
                animate={{ 
                  scale: [1.2, 1, 1.2],
                  x: [0, -50, 0],
                  y: [0, 30, 0],
                  opacity: [0.03, 0.08, 0.03]
                }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-0 right-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-indigo-500 rounded-full blur-[80px] md:blur-[120px]" 
              />
            </div>

            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-col items-center space-y-6 md:space-y-10"
            >
              <div className="relative group">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-6 md:-inset-10 bg-gradient-to-tr from-brand-500/20 via-purple-500/20 to-pink-500/20 blur-2xl md:blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" 
                />
                <div className="w-24 h-24 md:w-44 md:h-44 bg-white rounded-[2.5rem] md:rounded-[3.5rem] flex items-center justify-center shadow-[0_15px_40px_rgba(0,0,0,0.08)] md:shadow-[0_25px_60px_rgba(0,0,0,0.1)] border border-slate-100 relative overflow-hidden group-hover:scale-105 transition-transform duration-700">
                  <img 
                    src="https://admission.salu.edu.pk/static/media/logo.793ee5b813bb22366372.png" 
                    alt="SALU AI Logo" 
                    className="w-16 h-16 md:w-32 md:h-32 object-contain relative z-10"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1500 ease-in-out" />
                </div>
              </div>

              <div className="space-y-4 md:space-y-6 px-4">
                <div className="space-y-2 md:space-y-3">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="inline-flex items-center gap-2 px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-[9px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.3em] shadow-sm"
                  >
                    <Sparkles className="w-2.5 h-2.5 md:w-3 h-3" />
                    Shah Abdul Latif University
                  </motion.div>
                  <h2 className="text-4xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.9] md:leading-[0.85]">
                    SALU <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600">AI</span>
                  </h2>
                </div>
                <div className="space-y-2 md:space-y-4">
                  <p className="text-lg md:text-3xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium italic tracking-tight">
                    "Empowering the Next Generation of SALU Scholars."
                  </p>
                  <p className="text-sm md:text-xl text-slate-500 max-w-xl mx-auto leading-relaxed font-medium opacity-80">
                    Your professional academic companion for coding, research, and university excellence.
                  </p>
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full px-4">
              {MODE_QUICK_ACTIONS[mode].map((action, idx) => (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + (idx * 0.1), duration: 0.6 }}
                  onClick={() => setInput(action.prompt)}
                  className="group p-6 bg-white/70 backdrop-blur-xl border border-white/50 rounded-[2.5rem] text-left hover:bg-white hover:border-brand-500 hover:shadow-[0_30px_60px_rgba(0,0,0,0.08)] transition-all duration-500 flex flex-col gap-5 relative overflow-hidden shadow-sm"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border border-slate-50">
                    {mode === 'student' && <GraduationCap className="w-7 h-7 text-blue-500" />}
                    {mode === 'developer' && <Code className="w-7 h-7 text-purple-500" />}
                    {mode === 'creator' && <PenTool className="w-7 h-7 text-pink-500" />}
                    {mode === 'assistant' && <Sparkles className="w-7 h-7 text-amber-500" />}
                    {mode === 'salu' && <Search className="w-7 h-7 text-emerald-500" />}
                  </div>
                  <div className="space-y-2 relative z-10">
                    <p className="font-black text-slate-900 text-base group-hover:text-brand-600 transition-colors tracking-tight">{action.label}</p>
                    <p className="text-[11px] text-slate-400 font-bold leading-relaxed line-clamp-2">{action.prompt}</p>
                  </div>
                  <div className="mt-auto pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center gap-1 text-[10px] font-black text-brand-600 uppercase tracking-widest">
                    Try now <ArrowUp className="w-3 h-3 rotate-45" />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <motion.div
            layout
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: Math.min(index * 0.05, 0.3) // Subtle stagger for initial load, capped to avoid long waits
            }}
            key={message.id}
            className={cn(
              "flex gap-4 md:gap-6 max-w-5xl mx-auto group",
              message.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div className={cn(
              "w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md transition-transform group-hover:scale-105 overflow-hidden",
              message.role === 'user' 
                ? "bg-gradient-to-br from-brand-600 to-brand-500 text-white" 
                : "bg-white border border-slate-200"
            )}>
              {message.role === 'user' ? (
                <UserIcon className="w-5 h-5 md:w-6 md:h-6" />
              ) : (
                <img 
                  src="https://admission.salu.edu.pk/static/media/logo.793ee5b813bb22366372.png" 
                  alt="SALU AI" 
                  className="w-7 h-7 md:w-8 md:h-8 object-contain"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              )}
            </div>
            <div className={cn(
              "flex flex-col space-y-2 max-w-[85%] md:max-w-[75%]",
              message.role === 'user' ? "items-end" : "items-start"
            )}>
              <div className={cn(
                "p-4 md:p-5 rounded-3xl shadow-sm relative group/bubble transition-all",
                message.role === 'user' 
                  ? "bg-brand-600 text-white rounded-tr-none" 
                  : "bg-white border border-slate-200 text-slate-800 rounded-tl-none hover:border-slate-300"
              )}>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-3 mb-4">
                    {message.attachments.map((att, i) => (
                      <div key={i} className="relative group/att">
                        {att.startsWith('data:image/') ? (
                          <img 
                            src={att || null} 
                            alt="attachment" 
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            className="max-w-[240px] md:max-w-sm rounded-xl border border-slate-200/20 shadow-lg" 
                          />
                        ) : (
                          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl min-w-[200px]">
                            <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
                              {getFileIcon(att)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-slate-900 truncate">{getFileName(att)}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                {att.split(';')[0].split(':')[1].split('/')[1].toUpperCase()}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="markdown-body prose prose-slate max-w-none prose-sm md:prose-base overflow-hidden">
                  <Markdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      img: ({ src, ...props }) => <img src={src || null} {...props} referrerPolicy="no-referrer" />
                    }}
                  >
                    {message.content}
                  </Markdown>
                </div>
                {message.role === 'model' && (
                  <div className="absolute top-3 right-3 transition-opacity">
                    <CopyButton content={message.content} />
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-2">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4 md:gap-6 max-w-5xl mx-auto"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-md overflow-hidden">
              <img 
                src="https://admission.salu.edu.pk/static/media/logo.793ee5b813bb22366372.png" 
                alt="SALU AI" 
                className="w-7 h-7 md:w-8 md:h-8 object-contain animate-pulse"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            </div>
            <div className="flex items-center">
              <TypingIndicator />
            </div>
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

      <div className="p-4 md:p-10 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
        <div className="max-w-4xl mx-auto">
          {/* Quick Action Bar - Only show on initial screen */}
          {messages.length === 0 && (
            <div className="flex items-center gap-3 mb-6 overflow-x-auto no-scrollbar pb-2 px-1 -mx-1">
              {MODE_QUICK_ACTIONS[mode].map((action, idx) => (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ 
                    delay: idx * 0.05,
                    type: "spring",
                    stiffness: 400,
                    damping: 25
                  }}
                  onClick={() => setInput(action.prompt)}
                  className={cn(
                    "whitespace-nowrap flex items-center gap-2.5 px-5 py-3 rounded-2xl text-[11px] md:text-xs font-black tracking-tight shrink-0 shadow-sm transition-all duration-300",
                    "bg-white border border-slate-200 text-slate-600",
                    "hover:border-brand-400 hover:text-brand-600 hover:shadow-[0_10px_20px_-10px_rgba(var(--brand-color-rgb),0.2)]",
                    "group/action"
                  )}
                >
                  <div className="p-1.5 rounded-lg bg-slate-50 group-hover/action:bg-brand-50 group-hover/action:text-brand-500 transition-colors">
                    {action.icon}
                  </div>
                  {action.label}
                </motion.button>
              ))}
            </div>
          )}

          <form 
            id="chat-input-area"
            onSubmit={handleSubmit} 
            className="relative group/form"
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

            {/* Main Input Container - ChatGPT Style */}
            <div className={cn(
              "relative bg-white border border-slate-200 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-500",
              "focus-within:border-brand-400 focus-within:shadow-[0_20px_50px_rgba(0,0,0,0.08)] focus-within:ring-4 focus-within:ring-brand-500/5"
            )}>
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
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-wrap gap-3 p-4 border-b border-slate-50 bg-slate-50/30"
                  >
                    {attachments.map((att, i) => (
                      <div key={i} className="relative group/att">
                        {att.startsWith('data:image/') ? (
                          <img 
                            src={att || null} 
                            alt="preview" 
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-sm transition-transform group-hover/att:scale-105" 
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-1 transition-transform group-hover/att:scale-105">
                            {getFileIcon(att)}
                            <span className="text-[8px] font-black text-slate-400 uppercase truncate w-full text-center px-1">
                              {att.split(';')[0].split(':')[1].split('/')[1]}
                            </span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeAttachment(i)}
                          className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white rounded-full p-1 shadow-lg opacity-0 group-hover/att:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
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

              <div className="flex items-end gap-1 p-2 md:p-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept="image/*,application/pdf,text/plain"
                  className="hidden"
                />

                {/* Left Actions: Plus & Camera */}
                <div className="flex items-center gap-0.5 mb-0.5">
                  <div className="relative z-[100]">
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowAttachmentMenu(!showAttachmentMenu);
                      }}
                      className={cn(
                        "p-2.5 md:p-3 rounded-2xl transition-all shrink-0",
                        showAttachmentMenu ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30" : "text-slate-400 hover:text-brand-600 hover:bg-slate-50 active:scale-90"
                      )}
                      title="Add attachment"
                    >
                      <Plus className={cn("w-5 h-5 md:w-6 md:h-6 transition-transform duration-300", showAttachmentMenu && "rotate-45")} />
                    </button>

                    <AnimatePresence>
                      {showAttachmentMenu && (
                        <>
                          {/* Local backdrop for this specific menu */}
                          <div 
                            className="fixed inset-0 z-[105]" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAttachmentMenu(false);
                            }}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10, x: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10, x: -10 }}
                            className="absolute bottom-full left-0 mb-4 w-64 bg-white rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden z-[110] p-2"
                          >
                            <div className="space-y-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fileInputRef.current?.click();
                                  setShowAttachmentMenu(false);
                                }}
                                className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-all text-left group active:scale-[0.98]"
                              >
                                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors shrink-0">
                                  <FileText className="w-6 h-6 text-blue-500" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-black text-slate-900">Upload Files</p>
                                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">PDF, Text, Images</p>
                                </div>
                              </button>
                              
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsCameraOpen(true);
                                  setShowAttachmentMenu(false);
                                }}
                                className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-all text-left group active:scale-[0.98]"
                              >
                                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors shrink-0">
                                  <Camera className="w-6 h-6 text-purple-500" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-black text-slate-900">Take Photo</p>
                                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Use Camera</p>
                                </div>
                              </button>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Textarea: Auto-expanding */}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !isMobile()) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Message SALU AI..."
                  className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 px-2 min-h-[44px] max-h-[200px] text-slate-800 placeholder-slate-400 no-scrollbar text-sm md:text-base font-medium leading-relaxed"
                  rows={1}
                />
                
                {/* Right Actions: Mic & Send */}
                <div className="flex items-center gap-1 mb-0.5 pr-1">
                  <AnimatePresence>
                    {!isListening && !input.trim() && attachments.length === 0 && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        type="button"
                        onClick={() => (window as any).handleModeChange?.('live')}
                        className="p-2.5 md:p-3 rounded-2xl transition-all shrink-0 text-rose-500 hover:bg-rose-50 active:scale-90 group/live"
                        title="Open Live AI"
                      >
                        <Sparkles className="w-5 h-5 md:w-6 md:h-6 group-hover:animate-pulse" />
                      </motion.button>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {isListening && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-center gap-1"
                      >
                        <button
                          type="button"
                          onClick={clearTranscription}
                          className="p-2.5 md:p-3 rounded-2xl transition-all shrink-0 text-slate-400 hover:text-red-500 hover:bg-red-50 active:scale-90"
                          title="Clear transcription"
                        >
                          <RotateCcw className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                        <button
                          type="button"
                          onClick={togglePause}
                          className={cn(
                            "p-2.5 md:p-3 rounded-2xl transition-all shrink-0",
                            isPaused ? "text-brand-600 bg-brand-50" : "text-amber-500 bg-amber-50"
                          )}
                          title={isPaused ? "Resume recording" : "Pause recording"}
                        >
                          {isPaused ? <Play className="w-5 h-5 md:w-6 md:h-6" /> : <Pause className="w-5 h-5 md:w-6 md:h-6" />}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    className={cn(
                      "p-2.5 md:p-3 rounded-2xl transition-all shrink-0",
                      isListening && !isPaused ? "text-red-500 bg-red-50 animate-pulse" : "text-slate-400 hover:text-brand-600 hover:bg-slate-50 active:scale-90"
                    )}
                    title={isListening ? "Stop listening" : "Voice input"}
                  >
                    {isListening ? <MicOff className="w-5 h-5 md:w-6 md:h-6" /> : <Mic className="w-5 h-5 md:w-6 md:h-6" />}
                  </button>

                  <button
                    type="submit"
                    disabled={(!input.trim() && attachments.length === 0) || isLoading}
                    className={cn(
                      "w-10 h-10 md:w-12 md:h-12 rounded-2xl transition-all flex items-center justify-center shrink-0",
                      input.trim() || attachments.length > 0
                        ? "bg-slate-900 text-white shadow-xl shadow-slate-200 hover:bg-black active:scale-95"
                        : "bg-slate-100 text-slate-300 cursor-not-allowed",
                      isLoading && "opacity-50 cursor-wait"
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                    ) : (
                      <ArrowUp className="w-5 h-5 md:w-6 md:h-6 stroke-[3px]" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
          <p className="text-[11px] text-center text-slate-400 mt-4 opacity-60">
            SALU AI can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </div>
  );
});

