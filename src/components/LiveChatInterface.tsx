import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Volume2, VolumeX, X, Loader2, Sparkles, AlertCircle, User, UserCircle, Camera, CameraOff } from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { cn } from '../lib/utils';
import { useUserProfile } from '../context/UserProfileContext';
import { getSystemConfig, getHiddenConfig } from '../services/gemini';

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
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoIntervalRef = useRef<number | null>(null);
  const isVideoEnabledRef = useRef(isVideoEnabled);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    isVideoEnabledRef.current = isVideoEnabled;
    isMutedRef.current = isMuted;
  }, [isVideoEnabled, isMuted]);

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
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
    }
    if (videoIntervalRef.current) {
      window.clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    setIsVideoEnabled(false);
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

  const startVideoProcessing = () => {
    if (videoIntervalRef.current) window.clearInterval(videoIntervalRef.current);
    videoIntervalRef.current = window.setInterval(() => {
      if (!sessionRef.current || !videoRef.current || !canvasRef.current || !isVideoEnabledRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState >= 2) {
        // Resize to a reasonable dimension for AI vision (max 480px)
        const maxWidth = 480;
        const scale = Math.min(1, maxWidth / video.videoWidth);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          // Slightly higher quality for better feature recognition
          const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
          try {
            // Correct format for Multimodal Live API
            sessionRef.current.sendRealtimeInput({
              video: { data: base64Data, mimeType: 'image/jpeg' }
            });
          } catch (err) {
            console.warn("Failed to send video frame:", err);
          }
        }
      }
    }, 500); // 2 FPS for better temporal understanding
  };

  const toggleVideo = async () => {
    if (isVideoEnabled) {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      }
      if (videoIntervalRef.current) {
        window.clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = null;
      }
      setIsVideoEnabled(false);
      isVideoEnabledRef.current = false;
    } else {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        videoStreamRef.current = videoStream;
        if (videoRef.current) {
          videoRef.current.srcObject = videoStream;
        }
        setIsVideoEnabled(true);
        isVideoEnabledRef.current = true;
        startVideoProcessing();
      } catch (err) {
        console.error("Video access error:", err);
        setError("Camera access denied. Please grant permissions.");
      }
    }
  };

  const startLiveSession = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const config = await getSystemConfig();
      const hiddenConfig = await getHiddenConfig();
      if (!config.apiKey) {
        setError("SALU AI Engine key is required for Live Voice Chat. Please configure it in the Admin Panel.");
        setIsConnecting(false);
        return;
      }

      const ai = new GoogleGenAI({ 
        apiKey: config.apiKey
      });
      
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

      const extraTraining = hiddenConfig.customSystemInstructions ? `\nADDITIONAL TRAINING: ${hiddenConfig.customSystemInstructions}` : "";

      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
          systemInstruction: `You are ${hiddenConfig.assistantName}, an advanced real-time AI assistant developed by Babar Ali Arain for the SALU community. You are currently in Live Mode, having a real-time voice conversation with ${preferences.name || 'Guest'}. 

CRITICAL RULES:
1. Your name is ${hiddenConfig.assistantName}. 
2. If the user calls you by name, respond with one of these: ${hiddenConfig.activationResponses.join(', ')}.
3. You are a ${genderText} AI assistant. Adopt a ${genderText} persona in your speech and reactions.
4. YOUR EYES (VISION): You are a multimodal AI with EYES. You receive a continuous stream of video frames at 2 frames per second. You MUST constantly observe what is being shown.
5. VISION ACTIVATION: When the user asks "what do you see?", "what am I holding?", "is this correct?", or any question involving visual context, look at the most recent frames in your memory and give a precise, intelligent, and detailed response. You are an expert at identifying objects, people, surroundings, text on screens/paper, and math equations.
6. DESCRIBE AUTOMATICALLY: If the user says "Look at this" or "Look here", don't wait for a follow-up question—analyze the frame immediately and tell them what you see. relate your personality (${personaDescriptions[preferences.persona || 'friendly']}) to your visual observations (e.g., if you see a beautiful sunset, describe it warmly).
7. NEVER mention being an LLM or third-party provider. Your identity is ${hiddenConfig.assistantName}, created by Babar Ali Arain (IT Batch 2026). Emphasize your ability to see and hear the user simultaneously.
8. Be extremely concise in speech. 1-2 powerful sentences only. Keep the conversation snappy and natural.
9. ${extraTraining}`,
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
                if (isMutedRef.current || !sessionRef.current) return;
                
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
                      // Correct format for Multimodal Live API
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

      sessionPromise.then(session => {
        sessionRef.current = session;
      });
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-slate-50 overflow-hidden"
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

      <div className="w-full h-full bg-white/90 backdrop-blur-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden relative z-10 flex flex-col">
        {/* Header */}
        <div className="p-4 md:p-8 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-rose-50 rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm border border-rose-100">
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-rose-500" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">{preferences.assistantName || "SALU AI"} Live</h2>
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
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 space-y-8 md:space-y-10 overflow-y-auto no-scrollbar relative">
          
          {/* Video Element for Camera */}
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className={cn(
              "absolute bottom-6 right-6 w-32 h-48 md:w-48 md:h-64 object-cover rounded-2xl shadow-2xl border-4 border-white z-20 transition-all duration-500",
              isVideoEnabled ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
            )}
          />
          <canvas ref={canvasRef} className="hidden" />

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
                  {isActive ? "I'm Listening..." : isConnecting ? "Connecting..." : `${preferences.assistantName || "SALU AI"} Live`}
                </h3>
                <p className="text-sm md:text-base text-slate-500 font-medium leading-relaxed px-4">
                  {isActive 
                    ? "Go ahead, I'm ready to chat. Your voice is being processed in real-time." 
                    : isConnecting 
                    ? "Establishing secure connection..."
                    : `Talk to ${preferences.assistantName || "SALU AI"} naturally with a ${preferences.voice} voice.`}
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
                      <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">{preferences.assistantName || "SALU AI"} Response</p>
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
                onClick={toggleVideo}
                className={cn(
                  "p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] transition-all shadow-xl active:scale-90 border-2 flex-1 md:flex-none flex justify-center",
                  isVideoEnabled 
                    ? "bg-blue-500 text-white border-blue-400 shadow-blue-500/40" 
                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-200"
                )}
                title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
              >
                {isVideoEnabled ? <Camera className="w-6 h-6 md:w-7 md:h-7" /> : <CameraOff className="w-6 h-6 md:w-7 md:h-7" />}
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
