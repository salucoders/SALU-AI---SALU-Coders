import { Message, Mode, UserPreferences, Persona } from "../types";
import { GoogleGenAI } from "@google/genai";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export async function getSystemConfig(): Promise<{ apiKey: string, defaultModel: string, imageGenApiKey?: string }> {
  let apiKey = "";
  let imageGenApiKey = "";
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
      if (data.geminiImageGenApiKey) {
        imageGenApiKey = data.geminiImageGenApiKey;
      }
      if (data.defaultModel) defaultModel = data.defaultModel;
    }
  } catch (e) {
    console.error("Failed to fetch config from Firestore:", e);
  }

  // 2. Fallback to Express backend `/api/config` (if running as Web Service)
  if (!apiKey || !imageGenApiKey) {
    try {
      const res = await fetch(`/api/config?t=${new Date().getTime()}`);
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data.geminiApiKey && !apiKey) {
          apiKey = data.geminiApiKey;
          keySource = "Backend API";
        }
        if (data.geminiImageGenApiKey && !imageGenApiKey) {
          imageGenApiKey = data.geminiImageGenApiKey;
        }
        if (data.defaultModel && defaultModel === "gemini-3-flash-preview") defaultModel = data.defaultModel;
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

  return { apiKey, defaultModel, imageGenApiKey };
}

export async function getHiddenConfig(): Promise<{ assistantName: string, activationResponses: string[], customSystemInstructions: string }> {
  try {
    const configDoc = await getDoc(doc(db, 'system', 'hidden_config'));
    if (configDoc.exists()) {
      const data = configDoc.data();
      return {
        assistantName: data.assistantName || 'SALU AI',
        activationResponses: (data.activationResponses || 'Yes boss, Yes sir, G jan, Ji hukum').split(',').map((s: string) => s.trim()),
        customSystemInstructions: data.customSystemInstructions || ''
      };
    }
  } catch (e) {
    console.error("Failed to fetch hidden config:", e);
  }
  return {
    assistantName: 'SALU AI',
    activationResponses: ['G Jan', 'Yes Boss', 'Yes Sir', 'Ji Janab'],
    customSystemInstructions: ''
  };
}

function getSystemInstruction(mode: Mode, preferences: UserPreferences, persona: Persona, hiddenConfig?: any) {
  const assistantName = preferences?.assistantName || hiddenConfig?.assistantName || "SALU AI";
  
  const SYSTEM_INSTRUCTIONS: Record<string, string> = {
    student: "You are in STUDENT MODE. Focus on assignment solving, notes generation, summaries, quiz creation, and explaining concepts in simple language for students.",
    developer: "You are in DEVELOPER MODE. Focus on code generation, debugging, line-by-line explanations, project ideas, and best practices/optimization.",
    creator: "You are in CREATOR MODE. Focus on YouTube titles, SEO, descriptions, hashtags, thumbnail ideas, scripts, and social media content.",
    assistant: "You are in ASSISTANT MODE. Focus on formal/informal messaging, email drafting, scheduling, productivity advice, and daily life help.",
    salu: "You are in SALU MODE. Focus on university updates, scholarships, announcements, student guidance, and community support for the SALU community.",
    live: `You are in LIVE MODE. Focus on real-time voice conversation and quick, smart responses. Your name is ${assistantName}. If the user calls you by name, respond with one of these: ${hiddenConfig?.activationResponses?.join(', ') || 'Yes boss'}.`
  };

  const PERSONA_INSTRUCTIONS: Record<string, string> = {
    professional: "Your tone is formal, professional, and precise. Use sophisticated vocabulary and maintain a respectful distance.",
    friendly: "Your tone is warm, approachable, and friendly. Use casual language and emojis where appropriate to make the user feel comfortable.",
    witty: "Your tone is clever, humorous, and slightly sarcastic. Use wordplay, jokes, and sharp observations to keep the conversation entertaining.",
    encouraging: "Your tone is highly supportive, motivational, and positive. Focus on building the user's confidence and celebrating their progress.",
    creative: "Your tone is imaginative, artistic, and unconventional. Use metaphors, vivid descriptions, and think outside the box."
  };

  const CREATOR_INFO = "The owner and creator of SALU Coders is Babar Ali Arain, a student of IT Batch 2026. Only share this information if explicitly asked about the owner, creator, or Babar Ali Arain.";
  const EXTRA_TRAINING = hiddenConfig?.customSystemInstructions ? `\nADDITIONAL TRAINING: ${hiddenConfig.customSystemInstructions}` : "";
  const TRAINING_CONSENT = preferences?.aiTrainingEnabled ? "\nAI TRAINING: This user has enabled AI Training. You may use this conversation to improve your context and adaptation to this user." : "";

  return `Your name is ${assistantName}. ${SYSTEM_INSTRUCTIONS[mode] || ""} ${PERSONA_INSTRUCTIONS[persona] || ""} User Name: ${preferences?.name || "User"}. ${CREATOR_INFO}${EXTRA_TRAINING}${TRAINING_CONSENT}`;
}

async function prepareParts(content: string, attachments?: string[]): Promise<any[]> {
  const parts: any[] = [{ text: content || " " }];
  
  if (attachments && attachments.length > 0) {
    for (const data of attachments) {
      if (!data) continue;
      
      if (data.startsWith('http')) {
        try {
          // Handle ImageKit or other URLs by fetching and converting to base64
          // Note: Frontend fetches might fail due to CORS if not configured on ImageKit
          // Fallback: If fetch fails, we skip it or use a placeholder
          const response = await fetch(data);
          const blob = await response.blob();
          const mimeType = blob.type;
          
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
          });
          reader.readAsDataURL(blob);
          const base64 = await base64Promise;
          
          parts.push({ inlineData: { data: base64, mimeType } });
        } catch (e) {
          console.warn("Failed to fetch remote attachment for AI analysis:", data, e);
          // Don't break the whole message if one attachment fails
        }
      } else if (data.includes('base64,')) {
        const [header, base64] = data.split('base64,');
        if (base64) {
          const mimeTypeMatch = header.match(/:(.*?);/);
          let mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
          if (mimeType.includes(';')) {
            mimeType = mimeType.split(';')[0];
          }
          parts.push({ inlineData: { data: base64, mimeType } });
        }
      }
    }
  }
  
  return parts;
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

  const hiddenConfig = await getHiddenConfig();
  const assistantName = preferences?.assistantName || hiddenConfig.assistantName || "SALU AI";
  const systemInstruction = `You are ${assistantName}. ${getSystemInstruction(mode, preferences, persona, hiddenConfig)} ${userContext} 
    Be friendly, to the point, smart, and motivational. Avoid unnecessary repetition. Use clear, structured formatting with headings and bullet points.
    
    IMAGE GENERATION PROTOCOL:
    If the user requests an image, painting, or picture, or uses the "/image" command, or if specifically asked to "Respond EXCLUSIVELY with the image generation tag":
    1. EXCLUSIVELY output the tag: [IMAGE_GEN: expanded_artistic_prompt]
    2. Expand the user's simple request into a 50-80 word cinematic-grade masterpiece prompt.
    3. Include lighting, texture, camera angle, and artistic style (e.g., hyper-realistic, photorealistic, 8k resolution).
    4. You MUST include the square brackets and the "IMAGE_GEN:" prefix exactly.
    5. Provide NO OTHER TEXT besides the tag when asked for image generation.
    6. Be bold and highly descriptive. Use terms like 'cinematic lighting', 'hyper-detailed', 'unreal engine 5'.`;

  // Filter history to avoid duplicates if the new message is already in there
  const recentHistory = history.filter(m => m.content !== message).slice(-8);
  
  const contents: any[] = await Promise.all(recentHistory.map(async (msg: any) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: await prepareParts(msg.content, msg.attachments)
  })));

  const currentParts = await prepareParts(message, attachments);
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

  const hiddenConfig = await getHiddenConfig();
  const assistantName = preferences?.assistantName || hiddenConfig.assistantName || "SALU AI";
  const systemInstruction = `You are ${assistantName}. ${getSystemInstruction(mode, (preferences as UserPreferences), persona, hiddenConfig)} ${userContext} 
    Be friendly, to the point, smart, and motivational. Avoid unnecessary repetition. Use clear, structured formatting with headings and bullet points.
    
    IMAGE GENERATION PROTOCOL:
    If the user requests an image, painting, or picture, or uses the "/image" command, or if specifically asked to "Respond EXCLUSIVELY with the image generation tag":
    1. EXCLUSIVELY output the tag: [IMAGE_GEN: expanded_artistic_prompt]
    2. Expand the user's simple request into a 50-80 word cinematic-grade masterpiece prompt.
    3. Include lighting, texture, camera angle, and artistic style (e.g., hyper-realistic, photorealistic, 8k resolution).
    4. You MUST include the square brackets and the "IMAGE_GEN:" prefix exactly.
    5. Provide NO OTHER TEXT besides the tag when asked for image generation.
    6. Be bold and highly descriptive. Use terms like 'cinematic lighting', 'hyper-detailed', 'unreal engine 5'.`;

  // Filter history to avoid duplicates and slice for performance
  const recentHistory = history.filter(m => m.content !== message).slice(-8);
  
  const contents: any[] = await Promise.all(recentHistory.map(async (msg: any) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: await prepareParts(msg.content, msg.attachments)
  })));

  const currentParts = await prepareParts(message, attachments);
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
  // ... existing gemini image code ...
  try {
    const config = await getSystemConfig();
    const activeKey = config.imageGenApiKey || config.apiKey;
    if (!activeKey) {
      throw new Error("SALU AI Engine key is missing for image generation");
    }

    const ai = new GoogleGenAI({ apiKey: activeKey });
    
    // Using gemini-2.5-flash-image for standard free-tier availability
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

export async function performWebSearch(query: string): Promise<string> {
  try {
    const config = await getSystemConfig();
    if (!config.apiKey) {
      throw new Error("SALU AI Engine key is missing");
    }

    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    const response = await ai.models.generateContent({
      model: config.defaultModel && config.defaultModel.includes('flash') ? config.defaultModel : 'gemini-2.0-flash', 
      contents: query,
      config: {
        systemInstruction: "You are an expert web search researcher. Provide a highly organized, beautifully formatted Markdown response based on your search results. Use markdown H3 (###) for main sections, bullet points, and always provide clickable markdown links [Source Name](URL) for your references at the end.",
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No results found or empty response from AI.");
    }

    return text;
  } catch (error: any) {
    console.error("Web Search Error Details:", error);
    throw new Error(error.message || "Failed to perform web search.");
  }
}
