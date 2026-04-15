import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Volume2, VolumeX, X, Loader2, Sparkles, AlertCircle, User, UserCircle } from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { cn } from '../lib/utils';
import { useUserProfile } from '../context/UserProfileContext';
import { getActiveApiKey } from '../services/gemini';

interface LiveChatInterfaceProps {
  onClose: () => void;
}

export function LiveChatInterface({ onClose }: LiveChatInterfaceProps) {
  const { preferences, updatePreferences } = useUserProfile();
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [modelTranscription, setModelTranscription] = useState<string>('');

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);

  const stopLiveSession = useCallback(() => {
    if (sessionRef.current) {
      try {
        const closeResult = sessionRef.current.close();
        if (closeResult && typeof closeResult.catch === 'function') {
          closeResult.catch((err: any) => console.warn("Error closing session:", err));
        }
      } catch (err) {
        console.warn("Error closing session:", err);
      }
      sessionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(err => console.error("Error closing AudioContext:", err));
      audioContextRef.current = null;
    }
    setIsActive(false);
    setIsConnecting(false);
  }, []);

  const playNextChunk = useCallback(() => {
    if (audioQueueRef.current.length === 0 || isPlayingRef.current || !audioContextRef.current || audioContextRef.current.state === 'closed') {
      isPlayingRef.current = false;
      return;
    }

    try {
      isPlayingRef.current = true;
      const chunk = audioQueueRef.current.shift()!;
      if (!chunk) {
        isPlayingRef.current = false;
        return;
      }

      const float32Data = new Float32Array(chunk.length);
      for (let i = 0; i < chunk.length; i++) {
        float32Data[i] = chunk[i] / 32768.0;
      }

      const buffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000);
      buffer.getChannelData(0).set(float32Data);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => {
        isPlayingRef.current = false;
        playNextChunk();
      };
      source.start();
    } catch (err) {
      console.error("Error playing audio chunk:", err);
      isPlayingRef.current = false;
      // Try to recover by playing next chunk after a small delay if still active
      if (audioQueueRef.current.length > 0) {
        setTimeout(playNextChunk, 10);
      }
    }
  }, []);

  const startLiveSession = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const currentApiKey = await getActiveApiKey();
      if (!currentApiKey) {
        setError("Gemini API key is required for Live Voice Chat. Please configure it in the Admin Panel.");
        setIsConnecting(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey: currentApiKey });
      
      // Use 16000 for better compatibility and low latency
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      // Resume context if suspended (browser requirement)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (micErr: any) {
        console.error("Microphone access error:", micErr);
        setError("Microphone access denied. If you are in a preview window, please click 'Open in New Tab' (top right) to grant permissions.");
        setIsConnecting(false);
        return;
      }

      const voiceName = preferences.voice === 'male' ? 'Puck' : 'Kore';
      const genderText = preferences.voice === 'male' ? 'male' : 'female';

      const personaDescriptions = {
        professional: 'Formal, precise, and professional.',
        friendly: 'Warm, approachable, and friendly.',
        witty: 'Clever, humorous, and witty.',
        encouraging: 'Supportive, positive, and encouraging.',
        creative: 'Imaginative, artistic, and creative.'
      };

      const session = await ai.live.connect({
        model: "gemini-2.0-flash-exp",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
          systemInstruction: `You are SALU Coders AI, an advanced real-time AI assistant developed by Babar Ali Arain for the SALU community. You are currently in Live Mode, having a real-time voice conversation with ${preferences.name || 'Guest'}. 

CRITICAL RULES:
1. Your name is SALU AI. 
2. You are a ${genderText} AI assistant. Adopt a ${genderText} persona in your speech and reactions.
3. NEVER mention Google, Gemini, or being an LLM unless specifically asked about your technical architecture, and even then, emphasize your identity as SALU AI.
4. Be extremely concise. Keep responses to 1-2 short sentences to maintain a natural conversation flow.
5. Your personality is ${personaDescriptions[preferences.persona || 'friendly']}.
6. Use the user's name (${preferences.name || 'Guest'}) occasionally to make it personal.
7. Your creator is Babar Ali Arain (IT Batch 2026).`,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            if (!audioContextRef.current || !streamRef.current) {
              console.warn("Live session opened but audio context or stream is missing");
              stopLiveSession();
              return;
            }

            setIsActive(true);
            setIsConnecting(false);
            setTranscription('');
            setModelTranscription('');
            
            // Setup audio capture
            try {
              const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
              processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
              
              processorRef.current.onaudioprocess = (e) => {
                if (isMuted || !sessionRef.current) return;
                
                const inputData = e.inputBuffer.getChannelData(0);
                const int16Data = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                  int16Data[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                }
                
                // Use a more robust way to convert to base64 to avoid "Maximum call stack size exceeded"
                try {
                  const uint8Array = new Uint8Array(int16Data.buffer);
                  let binary = '';
                  const len = uint8Array.byteLength;
                  for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(uint8Array[i]);
                  }
                  const base64Data = btoa(binary);
                  
                  if (sessionRef.current) {
                    try {
                      sessionRef.current.sendRealtimeInput({
                        audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                      });
                    } catch (err) {
                      console.warn("Failed to send audio chunk:", err);
                    }
                  }
                } catch (err) {
                  console.error("Error encoding audio data:", err);
                }
              };
              
              source.connect(processorRef.current);
              processorRef.current.connect(audioContextRef.current.destination);
            } catch (err) {
              console.error("Error setting up audio capture:", err);
              setError("Failed to initialize audio capture. Please try again.");
              stopLiveSession();
            }
          },
          onmessage: (message: LiveServerMessage) => {
            try {
              // Handle audio output
              const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (base64Audio) {
                const binaryString = atob(base64Audio);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                const int16Array = new Int16Array(bytes.buffer);
                audioQueueRef.current.push(int16Array);
                if (!isPlayingRef.current) {
                  playNextChunk();
                }
              }
            } catch (err) {
              console.error("Error decoding audio output:", err);
            }

            // Handle model transcription
            const modelText = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (modelText) {
              setModelTranscription(prev => prev + modelText);
            }

            // Handle user transcription
            const userText = message.serverContent?.inputTranscription?.text;
            if (userText) {
              setTranscription(userText);
              // Clear model transcription when user starts a new sentence
              setModelTranscription('');
            }

            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
            }
          },
          onerror: (err: any) => {
            const errMsg = err.message || String(err);
            // Ignore abort errors as they are usually intentional (e.g. closing the session)
            if (errMsg.includes("aborted") || err.name === "AbortError") {
              return;
            }
            
            console.error("Live API Error:", err);
            if (errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("429")) {
              setError("Quota Exceeded: You've reached the live AI limit. Please wait a moment before trying again.");
            } else if (errMsg.includes("PERMISSION_DENIED") || errMsg.includes("403")) {
              setError("Access Denied: Your API key is restricted or doesn't have access to the Live API.");
            } else {
              setError("Connection error. Please try again.");
            }
            stopLiveSession();
          },
          onclose: () => {
            stopLiveSession();
          }
        }
      });

      sessionRef.current = session;
    } catch (err: any) {
      if (err?.message?.includes("aborted") || err?.name === "AbortError") {
        setIsConnecting(false);
        return;
      }
      console.error("Failed to start live session:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes("Permission denied") || errorMessage.includes("NotAllowedError")) {
        setError("Microphone access denied. If you are in a preview window, please click 'Open in New Tab' (top right) to grant permissions.");
      } else {
        setError(`Failed to start live session: ${errorMessage}`);
      }
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    return () => {
      stopLiveSession();
    };
  }, [stopLiveSession]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 md:p-8 bg-slate-50 overflow-hidden"
    >
      {/* Glowing Edges Animation when Active */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
          >
            {/* Inner shadow glow */}
            <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(244,63,94,0.1)]" />
            
            {/* Moving gradient border on the edges of the screen */}
            <div className="absolute inset-0 m-2 md:m-4 rounded-3xl md:rounded-[3rem] overflow-hidden border border-slate-200/50">
              <div className="absolute inset-0" style={{ padding: '6px' }}>
                <div className="absolute inset-0 bg-slate-50 rounded-[calc(1.5rem-6px)] md:rounded-[calc(3rem-6px)] z-10" />
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200vw] h-[200vw] md:w-[150vh] md:h-[150vh] bg-[conic-gradient(from_0deg,transparent_0_180deg,rgba(59,130,246,0.8)_240deg,rgba(244,63,94,1)_360deg)] z-0"
                />
              </div>
            </div>
            
            {/* Corner glows */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-rose-500/10 blur-[100px] rounded-full animate-pulse" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-rose-500/10 blur-[100px] rounded-full animate-pulse" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-rose-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-3xl bg-white/90 backdrop-blur-3xl rounded-[2.5rem] md:rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-200/50 overflow-hidden relative z-10 flex flex-col h-full max-h-[90vh] md:h-[750px]">
        {/* Header */}
        <div className="p-4 md:p-8 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-rose-50 rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm border border-rose-100">
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-rose-500" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">SALU AI Live</h2>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-1.5 h-1.5 md:w-2 md:h-2 rounded-full",
                  isActive ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300"
                )} />
                <span className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {isActive ? "Connected" : isConnecting ? "Connecting..." : "Ready"}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 md:p-3 hover:bg-slate-100 rounded-xl md:rounded-2xl text-slate-400 transition-all active:scale-90 hover:text-slate-600"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 space-y-8 md:space-y-10 overflow-y-auto no-scrollbar">
          {/* Voice Selection (Only when not active) */}
          {!isActive && !isConnecting && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200"
            >
              <button
                onClick={() => updatePreferences({ voice: 'male' })}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all",
                  preferences.voice === 'male' 
                    ? "bg-slate-900 text-white shadow-lg" 
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                <User className="w-4 h-4" />
                Male Voice
              </button>
              <button
                onClick={() => updatePreferences({ voice: 'female' })}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all",
                  preferences.voice === 'female' 
                    ? "bg-slate-900 text-white shadow-lg" 
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                <UserCircle className="w-4 h-4" />
                Female Voice
              </button>
            </motion.div>
          )}

          {/* Pulse Animation */}
          <div className="relative">
            <AnimatePresence>
              {isActive && (
                <>
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.8, opacity: 0.15 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                    className="absolute inset-0 bg-rose-500 rounded-full"
                  />
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 2.4, opacity: 0.08 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 2, delay: 0.5, ease: "easeOut" }}
                    className="absolute inset-0 bg-rose-500 rounded-full"
                  />
                </>
              )}
            </AnimatePresence>
            
            <motion.div 
              animate={isActive ? {
                scale: [1, 1.05, 1],
              } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className={cn(
                "w-32 h-32 md:w-48 md:h-48 rounded-full flex items-center justify-center transition-all duration-700 relative z-10 border-4",
                isActive 
                  ? "bg-white border-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.2)]" 
                  : "bg-slate-50 border-slate-200"
              )}
            >
              {isActive ? (
                <div className="flex items-center gap-1 md:gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ 
                        height: [10, Math.random() * 50 + 15, 10],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 0.6 + Math.random() * 0.4, 
                        delay: i * 0.05 
                      }}
                      className="w-1.5 md:w-2 bg-gradient-to-t from-rose-500 to-rose-400 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.5)]"
                    />
                  ))}
                </div>
              ) : (
                <div className="relative">
                  <Mic className="w-10 h-10 md:w-16 md:h-16 text-slate-300" />
                  {isConnecting && (
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      className="absolute -inset-4 md:-inset-6 border-4 border-rose-500 border-t-transparent rounded-full"
                    />
                  )}
                </div>
              )}
            </motion.div>
          </div>

          {/* Status/Error */}
          <div className="text-center space-y-4 md:space-y-6 w-full max-w-md">
            {error ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-3 text-rose-600 bg-rose-50 p-4 md:p-5 rounded-2xl md:rounded-[2rem] border border-rose-200 shadow-sm"
              >
                <AlertCircle className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
                <p className="text-xs md:text-sm font-black leading-tight">{error}</p>
              </motion.div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none">
                  {isActive ? "I'm Listening..." : isConnecting ? "Connecting..." : "SALU AI Live"}
                </h3>
                <p className="text-sm md:text-base text-slate-500 font-medium leading-relaxed px-4">
                  {isActive 
                    ? "Go ahead, I'm ready to chat. Your voice is being processed in real-time." 
                    : isConnecting 
                    ? "Establishing secure connection..."
                    : `Talk to SALU AI naturally with a ${preferences.voice} voice.`}
                </p>
              </div>
            )}
          </div>

          {/* Transcription Preview */}
          <AnimatePresence>
            {isActive && (transcription || modelTranscription) && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="w-full space-y-4"
              >
                {transcription && (
                  <div className="bg-slate-50/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-slate-200 shadow-inner">
                    <div className="flex items-center gap-2 mb-2 md:mb-3">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                      <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">You said</p>
                    </div>
                    <p className="text-sm md:text-base text-slate-800 font-bold leading-relaxed">
                      {transcription}
                    </p>
                  </div>
                )}
                
                {modelTranscription && (
                  <div className="bg-rose-50/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-rose-100 shadow-inner">
                    <div className="flex items-center gap-2 mb-2 md:mb-3">
                      <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                      <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">SALU AI Response</p>
                    </div>
                    <p className="text-sm md:text-base text-slate-800 font-bold leading-relaxed">
                      {modelTranscription}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="p-6 md:p-10 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex items-center justify-center gap-4 md:gap-6">
          {!isActive && !isConnecting ? (
            <button
              onClick={() => startLiveSession().catch(err => {
                console.error("Failed to start live session:", err);
                setError(err.message || "Failed to connect to AI service. Please check your microphone and internet connection.");
                setIsConnecting(false);
              })}
              className="group relative flex items-center gap-3 md:gap-4 px-8 md:px-14 py-4 md:py-6 bg-slate-900 text-white rounded-2xl md:rounded-[2.5rem] font-black text-lg md:text-xl hover:bg-slate-800 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)] transition-all active:scale-95 overflow-hidden w-full md:w-auto justify-center"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-rose-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Mic className="w-6 h-6 md:w-7 md:h-7 relative z-10" />
              <span className="relative z-10">Start Live AI</span>
            </button>
          ) : (
            <div className="flex items-center gap-3 md:gap-6 w-full md:w-auto">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={cn(
                  "p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] transition-all shadow-xl active:scale-90 border-2 flex-1 md:flex-none flex justify-center",
                  isMuted 
                    ? "bg-rose-500 text-white border-rose-400 shadow-rose-500/40" 
                    : "bg-white text-slate-600 border-slate-200 hover:border-rose-200"
                )}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff className="w-6 h-6 md:w-7 md:h-7" /> : <Mic className="w-6 h-6 md:w-7 md:h-7" />}
              </button>
              
              <button
                onClick={stopLiveSession}
                className="px-6 md:px-12 py-4 md:py-6 bg-slate-900 text-white rounded-2xl md:rounded-[2.5rem] font-black text-base md:text-lg hover:bg-slate-800 shadow-2xl shadow-slate-900/20 transition-all active:scale-95 border-2 border-slate-900 flex-[2] md:flex-none"
              >
                End Session
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
