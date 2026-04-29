import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";
import ImageKit from "imagekit";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple file-based config store for the backend
const CONFIG_FILE = path.join(__dirname, 'system-config.json');

function getSystemConfig() {
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
    defaultModel: "gemini-3-flash-preview",
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

      return { ...defaults, ...fileConfig };
    }
  } catch (e) {
    console.error("Error reading config:", e);
  }
  return defaults;
}

function saveSystemConfig(config: any) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
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
