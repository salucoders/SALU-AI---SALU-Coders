import { Message, Mode, UserPreferences, Persona } from "../types";
import { GoogleGenAI } from "@google/genai";

export async function getActiveApiKey(): Promise<string> {
  // Use environment variable if provided (e.g., in Netlify), otherwise use the hardcoded key
  return (process.env.GEMINI_API_KEY as string) || "AIzaSyAnHn18NhxNAb8MRb-bSAgOIWJf3WncMZ8";
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

  try {
    const currentApiKey = await getActiveApiKey();
    if (!currentApiKey) {
      throw new Error("Gemini API key is missing");
    }

    const ai = new GoogleGenAI({ apiKey: currentApiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
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
    
    if (error.message?.includes("API key not valid")) {
      return "System Error: The API key provided is invalid. Please check your API key in Google AI Studio.";
    }
    if (error.message?.includes("PERMISSION_DENIED")) {
      return "System Error: Access denied. Your API key might be blocked or restricted. Please ensure it has no website restrictions in Google Cloud Console.";
    }
    if (error.message?.includes("404") || error.message?.includes("not found")) {
      return "System Error: The requested AI model was not found. Please try again later.";
    }
    return `System Error: ${error.message || "I encountered an unexpected issue. Please try again."}`;
  }
}
