import { Message, Mode, UserPreferences, Persona } from "../types";
import { GoogleGenAI } from "@google/genai";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export async function getSystemConfig(): Promise<{ apiKey: string, defaultModel: string }> {
  let apiKey = "";
  let defaultModel = "gemini-3-flash-preview";
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
        if (data.defaultModel) defaultModel = data.defaultModel;
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

  // Removed overzealous key blocking to prevent interference with valid keys
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

  const systemInstruction = `You are SALU Coders AI. ${getSystemInstruction(mode, preferences, persona)} ${userContext} 
    Be friendly, to the point, smart, and motivational. Avoid unnecessary repetition. Use clear, structured formatting with headings and bullet points.
    
    IMAGE GENERATION PROTOCOL:
    If the user requests an image, painting, or picture:
    1. EXCLUSIVELY output the tag: [IMAGE_GEN: expanded_artistic_prompt]
    2. Expand the user's simple request into a 50-80 word cinematic-grade masterpiece prompt.
    3. Include lighting, texture, camera angle, and artistic style (e.g., hyper-realistic, photorealistic, 8k resolution).
    4. You MUST include the square brackets and the "IMAGE_GEN:" prefix exactly.
    5. Provide NO OTHER TEXT besides the tag for image generation.
    6. Be bold and highly descriptive. Use terms like 'cinematic lighting', 'hyper-detailed', 'unreal engine 5'.`;

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
      throw new Error("SALU AI Engine key is missing");
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
    let fallbackModelName = "Unknown";
    try {
       const c = await getSystemConfig();
       fallbackModelName = c.defaultModel;
    } catch(e) {}
    
    if (error.message?.includes("404") || error.message?.includes("not found")) {
      return `System Error: The requested AI model '${fallbackModelName}' was deprecated or not found. Please try switching to SALU AI Lite in the Admin Panel.`;
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

export async function sendMessageStream(
  mode: Mode,
  history: Message[],
  message: string,
  preferences?: UserPreferences,
  persona: Persona = 'friendly',
  attachments?: string[],
  onChunk?: (text: string) => void
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

  const systemInstruction = `You are SALU Coders AI. ${getSystemInstruction(mode, preferences, persona)} ${userContext} 
    Be friendly, to the point, smart, and motivational. Avoid unnecessary repetition. Use clear, structured formatting with headings and bullet points.
    
    IMAGE GENERATION PROTOCOL:
    If the user requests an image, painting, or picture:
    1. EXCLUSIVELY output the tag: [IMAGE_GEN: expanded_artistic_prompt]
    2. Expand the user's simple request into a 50-80 word cinematic-grade masterpiece prompt.
    3. Include lighting, texture, camera angle, and artistic style (e.g., hyper-realistic, photorealistic, 8k resolution).
    4. You MUST include the square brackets and the "IMAGE_GEN:" prefix exactly.
    5. Provide NO OTHER TEXT besides the tag for image generation.
    6. Be bold and highly descriptive. Use terms like 'cinematic lighting', 'hyper-detailed', 'unreal engine 5'.`;

  const recentHistory = history.slice(-10);
  const contents: any[] = recentHistory.map((msg: any) => {
    const parts: any[] = [{ text: msg.content || " " }];
    if (msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach((data: string) => {
        const [header, base64] = data.split(',');
        if (base64) {
          const mimeTypeMatch = header.match(/:(.*?);/);
          let mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
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
      throw new Error("SALU AI Engine key is missing");
    }

    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    const responseStream = await ai.models.generateContentStream({
      model: config.defaultModel,
      contents,
      config: {
        systemInstruction: systemInstruction
      }
    });

    let fullText = "";
    for await (const chunk of responseStream) {
      if (chunk.text) {
        fullText += chunk.text;
        if (onChunk) {
          onChunk(fullText);
        }
      }
    }
    
    if (!fullText) {
      throw new Error("Empty response from AI");
    }

    return fullText;
  } catch (error: any) {
    console.error("AI Service Error Details:", {
      message: error.message,
      stack: error.stack,
      error: error
    });
    
    const keySource = (window as any)._geminiKeySource || "Unknown";
    let errorMessage = "";
    
    if (error.message?.includes("API key not valid")) {
      errorMessage = `System Error: The API key provided is invalid. (Loaded from: ${keySource}). Please check your API key in Google AI Studio.`;
    } else if (error.message?.includes("PERMISSION_DENIED")) {
      errorMessage = `System Error: Access denied. Your API key might be blocked or restricted. (Loaded from: ${keySource}).`;
    } else {
      let fallbackModelName = "Unknown";
      try {
         const c = await getSystemConfig();
         fallbackModelName = c.defaultModel;
      } catch(e) {}
      
      if (error.message?.includes("404") || error.message?.includes("not found")) {
        errorMessage = `System Error: The requested AI model '${fallbackModelName}' was deprecated or not found. Please try switching to SALU AI Lite in the Admin Panel.`;
      } else if (error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED") || error.message?.includes("quota")) {
        errorMessage = `System Error: Google's API returned "Quota Exceeded/Rate Limited" for this key. \nIf this is a completely new key, Google may have restricted the free-tier quota for your Google Cloud project or region (this is a common Google security measure). \nTo fix this: Go to console.cloud.google.com, ensure your project has an active Billing Account linked, or wait a few hours if you've simply hit the free requests limit. \n[Key: ${apiKeyForDebug.substring(0, 10)}...] [Source: ${keySource}]`;
      } else {
        errorMessage = `System Error: ${error.message || "I encountered an unexpected issue."} [Key: ${apiKeyForDebug.substring(0, 10)}] [Source: ${keySource}]`;
      }
    }
    
    return errorMessage;
  }
}

export async function generateImageWithSALU(prompt: string): Promise<string> {
  try {
    const config = await getSystemConfig();
    if (!config.apiKey) {
      throw new Error("SALU AI Engine key is missing");
    }

    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    
    // Using gemini-2.5-flash-image for reliable image generation
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    // Find the image part in the response parts
    const candidates = (response as any).candidates;
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString: string = part.inlineData.data;
          return `data:image/png;base64,${base64EncodeString}`;
        }
      }
    }

    throw new Error("No image was returned by SALU AI Engine");
  } catch (error: any) {
    console.error("SALU Image Generation Error:", error);
    throw new Error(error.message || "Failed to generate image with SALU.");
  }
}
