import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple file-based config store for the backend
const CONFIG_FILE = path.join(__dirname, 'system-config.json');

function getSystemConfig() {
  const defaults = {
    geminiApiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "",
    defaultModel: "gemini-2.0-flash",
    appName: "SALU AI",
    welcomeMessage: "What can I help with?"
  };

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      // Don't overwrite with empty string if we have a default from env
      if (!fileConfig.geminiApiKey) delete fileConfig.geminiApiKey;
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

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '100mb' }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Public config endpoint (only safe values)
  app.get("/api/config", (req, res) => {
    const config = getSystemConfig();
    res.json({
      geminiApiKey: config.geminiApiKey,
      defaultModel: config.defaultModel,
      appName: config.appName,
      welcomeMessage: config.welcomeMessage
    });
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
