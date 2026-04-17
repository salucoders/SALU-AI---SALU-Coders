import { Message, Mode, UserPreferences, Persona } from "../types";
import { GoogleGenAI } from "@google/genai";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export async function getSystemConfig(): Promise<{ apiKey: string, defaultModel: string }> {
  let apiKey = "";
  let defaultModel = "gemini-2.0-flash";
  let keySource = "";

  // 1. Try fetching from Firestore (Most reliable for Admin Panel saves on Static Sites)
  try {
    const configDoc = await getDoc(doc(db, 'system', 'config'));
    if (configDoc.exists()) {
      const data = configDoc.data();
      if (data.geminiApiKey) {
        apiKey = data.geminiApiKey;
        keySource = "Firestore Config";
      }
      if (data.defaultModel) defaultModel = data.defaultModel;
    }
  } catch (e) {
    console.error("Failed to fetch config from Firestore:", e);
  }

  // 2. Fallback to Express backend `/api/config` (if running as Web Service)
  if (!apiKey) {
    try {
      const res = await fetch(`/api/config?t=${new Date().getTime()}`);
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data.geminiApiKey) {
          apiKey = data.geminiApiKey;
          keySource = "Backend API";
        }
        if (data.defaultModel && data.defaultModel !== "gemini-2.0-flash") defaultModel = data.defaultModel;
      }
    } catch (e) {
      console.warn("Failed to fetch config from backend:", e);
    }
  }

  // 3. Fallback to Vite/Node Environment Variables
  if (!apiKey) {
    if (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
      apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      keySource = "Vite Environment Variable";
    } else if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
      apiKey = process.env.GEMINI_API_KEY;
      keySource = "Node Environment Variable";
    }
  }

  // Actively reject the old leaked keys so it forces the UI to prompt for a new one
  if (apiKey && (apiKey.includes('AIzaSyA9TH') || apiKey.includes('AIzaSyCU6n'))) {
    console.warn(`Blocked known rate-limited API key coming from: ${keySource}`);
    apiKey = ""; 
    keySource = "Blocked/Empty";
  }

  if (apiKey === "") {
    keySource = "Blocked/Empty";
  }

  // Attach the source for debugging purposes on error
  (window as any)._geminiKeySource = keySource;

  return { apiKey, defaultModel };
}

function getSystemInstruction(mode: Mode, preferences: UserPreferences, persona: Persona) {
  const SYSTEM_INSTRUCTIONS: Record<string, string> = {
    student: "You are in STUDENT MODE. Focus on assignment solving, notes generation, summaries, quiz creation, and explaining concepts in simple language for students.",
    developer: "You are in DEVELOPER MODE. Focus on code generation, debugging, line-by-line explanations, project ideas, and best practices/optimization.",
    creator: "You are in CREATOR MODE. Focus on YouTube titles, SEO, descriptions, hashtags, thumbnail ideas, scripts, and social media content.",
    assistant: "You are in ASSISTANT MODE. Focus on formal/informal messaging, email drafting, scheduling, productivity advice, and daily life help.",
    salu: "You are in SALU MODE. Focus on university updates, scholarships, announcements, student guidance, and community support for the SALU community.",
    live: "You are in LIVE MODE. Focus on real-time voice conversation and quick, smart responses."
  };

  const PERSONA_INSTRUCTIONS: Record<string, string> = {
    professional: "Your tone is formal, professional, and precise. Use sophisticated vocabulary and maintain a respectful distance.",
    friendly: "Your tone is warm, approachable, and friendly. Use casual language and emojis where appropriate to make the user feel comfortable.",
    witty: "Your tone is clever, humorous, and slightly sarcastic. Use wordplay, jokes, and sharp observations to keep the conversation entertaining.",
    encouraging: "Your tone is highly supportive, motivational, and positive. Focus on building the user's confidence and celebrating their progress.",
    creative: "Your tone is imaginative, artistic, and unconventional. Use metaphors, vivid descriptions, and think outside the box."
  };

  const CREATOR_INFO = "The owner and creator of SALU Coders is Babar Ali Arain, a student of IT Batch 2026. Only share this information if explicitly asked about the owner, creator, or Babar Ali Arain.";

  return `${SYSTEM_INSTRUCTIONS[mode] || ""} ${PERSONA_INSTRUCTIONS[persona] || ""} User Name: ${preferences?.name || "User"}. ${CREATOR_INFO}`;
}

export async function sendMessage(
  mode: Mode,
  history: Message[],
  message: string,
  preferences: UserPreferences,
  persona: Persona = 'friendly',
  attachments?: string[]
): Promise<string> {
  const currentTime = new Date().toLocaleString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit', 
    timeZoneName: 'short' 
  });

  const personalization = `
    User Profile:
    - Name: ${preferences?.name || 'Guest'}
    - Language: ${preferences?.language || 'English'}
    - Department: ${preferences?.department || 'Not specified'}
    - Class/Year: ${preferences?.class || 'Not specified'}
    - Likes: ${preferences?.likes || 'Not specified'}
    - Dislikes: ${preferences?.dislikes || 'Not specified'}
  `.trim();

  const userContext = `Current time: ${currentTime}. ${personalization}. 
    Tailor your responses based on the user's department, class, and preferences. 
    If they like certain topics, use them in examples. If they dislike something, avoid it. 
    If the preferred language is Urdu or Sindhi, respond primarily in that language but keep technical terms in English.`;

  const systemInstruction = `You are SALU Coders AI. ${getSystemInstruction(mode, preferences, persona)} ${userContext} Be friendly, to the point, smart, and motivational. Avoid unnecessary repetition. Use clear, structured formatting with headings and bullet points.`;

  const recentHistory = history.slice(-10);
  const contents: any[] = recentHistory.map((msg: any) => {
    const parts: any[] = [{ text: msg.content || " " }];
    if (msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach((data: string) => {
        const [header, base64] = data.split(',');
        if (base64) {
          const mimeTypeMatch = header.match(/:(.*?);/);
          let mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
          // Clean MIME type (remove ;name=...)
          if (mimeType.includes(';')) {
            mimeType = mimeType.split(';')[0];
          }
          parts.push({ inlineData: { data: base64, mimeType } });
        }
      });
    }
    return { role: msg.role === 'user' ? 'user' : 'model', parts };
  });

  const currentParts: any[] = [];
  if (attachments && attachments.length > 0) {
    attachments.forEach((data: string) => {
      const [header, base64] = data.split(',');
      if (base64) {
        const mimeTypeMatch = header.match(/:(.*?);/);
        let mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
        // Clean MIME type (remove ;name=...)
        if (mimeType.includes(';')) {
          mimeType = mimeType.split(';')[0];
        }
        currentParts.push({ inlineData: { data: base64, mimeType } });
      }
    });
  }

  if (message.trim() || currentParts.length === 0) {
    currentParts.push({ text: message || "Analyze this attachment" });
  }

  contents.push({ role: 'user', parts: currentParts });

  let apiKeyForDebug = "";
  try {
    const config = await getSystemConfig();
    apiKeyForDebug = config.apiKey || "";
    
    if (!config.apiKey) {
      throw new Error("Gemini API key is missing");
    }

    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    const response = await ai.models.generateContent({
      model: config.defaultModel,
      contents,
      config: {
        systemInstruction: systemInstruction
      }
    });

    const text = response.text;
    
    if (!text) {
      throw new Error("Empty response from AI");
    }

    return text;
  } catch (error: any) {
    console.error("AI Service Error Details:", {
      message: error.message,
      stack: error.stack,
      error: error
    });
    
    const keySource = (window as any)._geminiKeySource || "Unknown";
    
    if (error.message?.includes("API key not valid")) {
      return `System Error: The API key provided is invalid. (Loaded from: ${keySource}). Please check your API key in Google AI Studio.`;
    }
    if (error.message?.includes("PERMISSION_DENIED")) {
      return `System Error: Access denied. Your API key might be blocked or restricted. (Loaded from: ${keySource}).`;
    }
    if (error.message?.includes("404") || error.message?.includes("not found")) {
      return "System Error: The requested AI model was not found. Please try again later.";
    }
    if (error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED") || error.message?.includes("quota")) {
      return `System Error: Google's API returned "Quota Exceeded/Rate Limited" for this key. 
If this is a completely new key, Google may have restricted the free-tier quota for your Google Cloud project or region (this is a common Google security measure). 
To fix this: Go to console.cloud.google.com, ensure your project has an active Billing Account linked, or wait a few hours if you've simply hit the free requests limit. 
[Key: ${apiKeyForDebug.substring(0, 10)}...] [Source: ${keySource}]`;
    }
    
    // Try to parse JSON errors if they are returned as a string
    try {
      if (error.message && error.message.startsWith('{')) {
        const parsed = JSON.parse(error.message);
        if (parsed.error && parsed.error.message) {
          return `System Error: ${parsed.error.message} [Key: ${apiKeyForDebug.substring(0, 10)}]`;
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }

    return `System Error: ${error.message || "I encountered an unexpected issue."} [Key: ${apiKeyForDebug.substring(0, 10)}] [Source: ${keySource}]`;
  }
}
