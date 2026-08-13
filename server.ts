import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";
import ImageKit from "imagekit";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple file-based config store for the backend with in-memory caching
const CONFIG_FILE = path.join(__dirname, 'system-config.json');
let cachedConfig: any = null;
let cachedConfigTime = 0;
const CONFIG_CACHE_TTL = 15000; // 15 seconds cache

function getSystemConfig() {
  const now = Date.now();
  if (cachedConfig && now - cachedConfigTime < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  const envKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
  const togetherKey = process.env.TOGETHER_API_KEY || "";
  const defaults = {
    geminiApiKey: (envKey && !envKey.includes('AIzaSyA9TH') && !envKey.includes('AIzaSyCU6n')) ? envKey : "",
    geminiApiKey2: "",
    geminiApiKey3: "",
    geminiApiKey4: "",
    geminiApiKey5: "",
    groqApiKey: process.env.GROQ_API_KEY || "",
    geminiImageGenApiKey: "",
    togetherApiKey: togetherKey,
    imageKitPublicKey: process.env.VITE_IMAGEKIT_PUBLIC_KEY || process.env.IMAGEKIT_PUBLIC_KEY || "",
    imageKitPrivateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
    imageKitUrlEndpoint: process.env.VITE_IMAGEKIT_URL_ENDPOINT || process.env.IMAGEKIT_URL_ENDPOINT || "",
    defaultModel: "gemini-3.6-flash",
    appName: "SALU AI",
    welcomeMessage: "What can I help with?"
  };

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      
      // If server has an explicitly set environment variable, ALWAYS prefer it over the saved file, 
      // UNLESS the environment variable is the old broken key.
      if (envKey && !envKey.includes('AIzaSyA9TH') && !envKey.includes('AIzaSyCU6n')) {
        fileConfig.geminiApiKey = envKey;
      } else if (!fileConfig.geminiApiKey || fileConfig.geminiApiKey.includes('AIzaSyA9TH') || fileConfig.geminiApiKey.includes('AIzaSyCU6n')) {
        // Strip out the known bad key if it got stuck in the json file
        delete fileConfig.geminiApiKey; 
      }
      
      if (togetherKey) {
        fileConfig.togetherApiKey = togetherKey;
      }
      
      // Preserve env vars if missing in file
      if (!fileConfig.imageKitPublicKey && defaults.imageKitPublicKey) fileConfig.imageKitPublicKey = defaults.imageKitPublicKey;
      if (!fileConfig.imageKitPrivateKey && defaults.imageKitPrivateKey) fileConfig.imageKitPrivateKey = defaults.imageKitPrivateKey;
      if (!fileConfig.imageKitUrlEndpoint && defaults.imageKitUrlEndpoint) fileConfig.imageKitUrlEndpoint = defaults.imageKitUrlEndpoint;

      cachedConfig = { ...defaults, ...fileConfig };
      cachedConfigTime = now;
      return cachedConfig;
    }
  } catch (e) {
    console.error("Error reading config:", e);
  }

  cachedConfig = defaults;
  cachedConfigTime = now;
  return defaults;
}

function saveSystemConfig(config: any) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  cachedConfig = null; // Invalidate cache
}

function getActiveGeminiKeys() {
  const config = getSystemConfig();
  const keys = [
    config.geminiApiKey,
    config.geminiApiKey2,
    config.geminiApiKey3,
    config.geminiApiKey4,
    config.geminiApiKey5,
    process.env.GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY
  ].filter(k => k && typeof k === 'string' && k.trim() !== '' && !k.includes('AIzaSyA9TH') && !k.includes('AIzaSyCU6n'));
  return Array.from(new Set(keys));
}

function getSafeImageKit(req?: express.Request) {
  const config = getSystemConfig();
  
  // Give priority to headers provided by frontend, fallback to server config
  const publicKey = (req?.headers['x-imagekit-public-key'] as string) || config.imageKitPublicKey || process.env.IMAGEKIT_PUBLIC_KEY || "";
  const privateKey = (req?.headers['x-imagekit-private-key'] as string) || config.imageKitPrivateKey || process.env.IMAGEKIT_PRIVATE_KEY || "";
  const urlEndpoint = (req?.headers['x-imagekit-url-endpoint'] as string) || config.imageKitUrlEndpoint || process.env.IMAGEKIT_URL_ENDPOINT || "";

  if (!publicKey || !privateKey || !urlEndpoint || urlEndpoint === "IMAGEKIT_URL_ENDPOINT") {
    return null;
  }

  try {
    return new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint
    });
  } catch (e) {
    console.error("Failed to initialize ImageKit SDK:", e);
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '100mb' }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Public config endpoint (only safe values)
  app.get("/api/config", (req, res) => {
    const config = getSystemConfig();
    
    // Log why the key might be empty on the backend
    console.log("Serving config:", {
      hasEnvKey: !!process.env.GEMINI_API_KEY,
      hasViteKey: !!process.env.VITE_GEMINI_API_KEY,
      hasTogetherKey: !!config.togetherApiKey,
      keyLength: config.geminiApiKey ? config.geminiApiKey.length : 0,
      configExists: fs.existsSync(CONFIG_FILE)
    });

    res.json({
      geminiApiKey: config.geminiApiKey,
      togetherApiKey: config.togetherApiKey ? "configured" : "",
      imageKitPublicKey: config.imageKitPublicKey,
      imageKitUrlEndpoint: config.imageKitUrlEndpoint,
      defaultModel: config.defaultModel,
      appName: config.appName,
      welcomeMessage: config.welcomeMessage
    });
  });

  // Streaming chat endpoint (Server-Sent Events)
  app.post("/api/chat/stream", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const { contents, systemInstruction, model } = req.body;
    const activeKeys = getActiveGeminiKeys();
    const config = getSystemConfig();
    const selectedModel = model || config.defaultModel || "gemini-3.6-flash";

    if (activeKeys.length === 0 && !config.groqApiKey) {
      res.write(`data: ${JSON.stringify({ error: "System Error: SALU AI Engine key is missing. Please configure it in the Admin Panel." })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    }

    let success = false;
    let lastError: any = null;

    for (let i = 0; i < activeKeys.length; i++) {
      const key = activeKeys[i];
      if (req.destroyed) break;

      try {
        const ai = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });

        const responseStream = await ai.models.generateContentStream({
          model: selectedModel,
          contents,
          config: {
            systemInstruction
          }
        });

        for await (const chunk of responseStream) {
          if (req.destroyed) break;
          if (chunk.text) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        }

        success = true;
        break;
      } catch (e: any) {
        lastError = e;
        console.warn(`[Server Stream] Gemini Key ${i + 1} failed:`, e?.message);
        if (i < activeKeys.length - 1) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }

    // Fallback to Groq if all Gemini keys fail
    if (!success && config.groqApiKey && !req.destroyed) {
      try {
        console.info("[Server Stream] Gemini keys failed, falling back to Groq stream.");
        const messages = [];
        if (systemInstruction) {
          messages.push({ role: 'system', content: systemInstruction });
        }
        if (Array.isArray(contents)) {
          for (const c of contents) {
            let textStr = "";
            if (c.parts) {
              for (const p of c.parts) {
                if (p.text) textStr += p.text + "\n";
              }
            }
            if (textStr.trim()) {
              messages.push({ role: c.role === 'model' ? 'assistant' : 'user', content: textStr.trim() });
            }
          }
        }

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.groqApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.1-70b-versatile',
            messages,
            stream: true
          })
        });

        if (groqRes.ok && groqRes.body) {
          const reader = groqRes.body.getReader();
          const decoder = new TextDecoder();
          while (true) {
            if (req.destroyed) break;
            const { value, done } = await reader.read();
            if (done) break;
            const chunkStr = decoder.decode(value, { stream: true });
            const lines = chunkStr.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
                try {
                  const parsed = JSON.parse(line.slice(6));
                  const delta = parsed.choices?.[0]?.delta?.content || "";
                  if (delta) {
                    res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
                  }
                } catch (e) {}
              }
            }
          }
          success = true;
        }
      } catch (e: any) {
        console.warn("[Server Stream] Groq fallback failed:", e?.message);
        lastError = e;
      }
    }

    if (!success && !req.destroyed) {
      const errorMsg = lastError?.message || "All AI engine attempts failed.";
      res.write(`data: ${JSON.stringify({ error: `System Error: ${errorMsg}` })}\n\n`);
    }

    res.write("data: [DONE]\n\n");
    res.end();
  });

  // Image Generation endpoint
  app.post("/api/chat/image", async (req, res) => {
    try {
      const { prompt } = req.body;
      const activeKeys = getActiveGeminiKeys();
      if (activeKeys.length === 0) {
        return res.status(400).json({ error: "SALU AI Engine key is missing for image generation" });
      }

      let lastError: any = null;
      for (let i = 0; i < activeKeys.length; i++) {
        try {
          const ai = new GoogleGenAI({
            apiKey: activeKeys[i],
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          });
          const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-image',
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio: "1:1" } }
          });

          const candidates = (response as any).candidates;
          if (candidates && candidates[0]?.content?.parts) {
            for (const part of candidates[0].content.parts) {
              if (part.inlineData) {
                return res.json({ image: `data:image/png;base64,${part.inlineData.data}` });
              }
            }
          }
        } catch (err: any) {
          lastError = err;
        }
      }
      res.status(500).json({ error: lastError?.message || "Failed to generate image" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Web Search endpoint
  app.post("/api/chat/search", async (req, res) => {
    try {
      const { query } = req.body;
      const activeKeys = getActiveGeminiKeys();
      const config = getSystemConfig();
      if (activeKeys.length === 0) {
        return res.status(400).json({ error: "SALU AI Engine key is missing" });
      }

      const ai = new GoogleGenAI({
        apiKey: activeKeys[0],
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const response = await ai.models.generateContent({
        model: config.defaultModel || 'gemini-3.6-flash',
        contents: query,
        config: {
          systemInstruction: "You are an expert web search researcher. Provide a highly organized, beautifully formatted Markdown response based on your search results. Use markdown H3 (###) for main sections, bullet points, and always provide clickable markdown links [Source Name](URL) for your references at the end.",
          tools: [{ googleSearch: {} }]
        }
      });

      res.json({ text: response.text || "" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Proxy route for Together AI image generation
  app.post("/api/generate-together-image", async (req, res) => {
    const requestId = Math.random().toString(36).substring(7);
    try {
      const { prompt, saveToImageKit = false, userId = "anonymous" } = req.body;
      const config = getSystemConfig();
      const apiKey = config.togetherApiKey?.trim();

      if (!apiKey) {
        console.error(`[${requestId}] Together AI API key is missing from config or environment.`);
        return res.status(401).json({ 
          error: "Together AI API key is not configured. Please add TOGETHER_API_KEY to your environment or Admin Panel." 
        });
      }

      console.log(`[${requestId}] Generating image with Together AI for prompt:`, prompt.slice(0, 50) + "...");

      const response = await fetch("https://api.together.xyz/v1/images/generations", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ 
          model: "black-forest-labs/FLUX.1-schnell",
          prompt: prompt,
          width: 1024,
          height: 1024,
          steps: 4,
          n: 1,
          response_format: "b64_json"
        }),
      });

      if (!response.ok) {
        const status = response.status;
        const errorData = await response.json().catch(() => ({}));
        console.error("Together AI Error:", status, errorData);
        return res.status(status).json({ error: errorData.error?.message || "Together AI error" });
      }

      const data = await response.json();
      let imageContent = "";
      if (data.data && data.data[0] && data.data[0].b64_json) {
        imageContent = `data:image/png;base64,${data.data[0].b64_json}`;
      } else if (data.data && data.data[0] && data.data[0].url) {
        imageContent = data.data[0].url;
      } else {
        throw new Error("No image data returned from Together AI");
      }

      // Automatically save to ImageKit if requested
      if (saveToImageKit && (config.imageKitPrivateKey || process.env.IMAGEKIT_PRIVATE_KEY)) {
        try {
          const ik = getSafeImageKit();
          if (!ik) {
            console.warn("ImageKit initialization skipped due to missing config");
            return res.json({ image: imageContent });
          }

          const uploadResponse = await ik.upload({
            file: imageContent,
            fileName: `ai-gen-${Date.now()}.png`,
            folder: `/salu-ai-generated/${userId}`,
            tags: [userId]
          });
          
          return res.json({ image: uploadResponse.url, imageKitId: uploadResponse.fileId });
        } catch (ikError) {
          console.error("ImageKit auto-save error:", ikError);
          // Fallback to returning base64 if save fails
          return res.json({ image: imageContent });
        }
      }

      res.json({ image: imageContent });
    } catch (error: any) {
      console.error("Together Proxy Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ImageKit Auth Endpoint
  app.get("/api/imagekit/auth", (req, res) => {
    try {
      const imagekit = getSafeImageKit();
      if (!imagekit) {
        return res.status(503).json({ error: "ImageKit not configured on server" });
      }

      const authenticationParameters = imagekit.getAuthenticationParameters();
      res.send(authenticationParameters);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ImageKit Direct Upload (for existing base64 content)
  app.post("/api/imagekit/upload", async (req, res) => {
    try {
      const { file, fileName, tags, folder } = req.body;
      const imagekit = getSafeImageKit(req);
      if (!imagekit) {
        return res.status(503).json({ error: "ImageKit not configured" });
      }

      const response = await imagekit.upload({
        file: file,
        fileName: fileName || `upload-${Date.now()}`,
        tags: tags || ["user-upload"],
        folder: folder
      });

      res.json(response);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ImageKit List Files
  app.get("/api/imagekit/files", async (req, res) => {
    try {
      const imagekit = getSafeImageKit(req);
      if (!imagekit) {
        return res.status(503).json({ error: "ImageKit not configured" });
      }

      const { userId } = req.query;

      const options: any = {
        sort: "DESC_CREATED",
        limit: 100
      };

      if (userId && typeof userId === 'string') {
        options.path = `/salu-ai-generated/${userId}`;
      }

      const files = await imagekit.listFiles(options);

      res.json(files);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ImageKit Delete File
  app.delete("/api/imagekit/files/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      const imagekit = getSafeImageKit(req);
      if (!imagekit) {
        return res.status(503).json({ error: "ImageKit not configured" });
      }

      await imagekit.deleteFile(fileId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin config endpoint
  app.get("/api/admin/config", (req, res) => {
    // In a real app, verify Firebase ID token here
    res.json(getSystemConfig());
  });

  app.post("/api/admin/config", (req, res) => {
    // In a real app, verify Firebase ID token and admin role here
    const newConfig = { ...getSystemConfig(), ...req.body };
    saveSystemConfig(newConfig);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
