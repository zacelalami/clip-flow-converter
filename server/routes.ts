import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import Anthropic from "@anthropic-ai/sdk";

const execAsync = promisify(exec);

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Download endpoint for videos/audio
  app.post("/api/download", async (req, res) => {
    try {
      const { url, type, quality } = req.body;

      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      // Validate URL format and detect platform
      const platformPatterns = {
        youtube: /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/i,
        instagram: /^https?:\/\/(www\.)?instagram\.com/i,
        tiktok: /^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com)/i,
        facebook: /^https?:\/\/(www\.)?(facebook\.com|fb\.watch)/i,
        twitter: /^https?:\/\/(www\.)?(twitter\.com|x\.com)/i,
        twitch: /^https?:\/\/(www\.)?twitch\.tv/i
      };

      let detectedPlatform = null;
      for (const [platform, pattern] of Object.entries(platformPatterns)) {
        if (pattern.test(url)) {
          detectedPlatform = platform;
          break;
        }
      }

      if (!detectedPlatform) {
        return res.status(400).json({ error: "Unsupported platform. Please use YouTube, Instagram, TikTok, Facebook, Twitter, or Twitch URLs." });
      }

      // Create downloads directory if it doesn't exist
      const downloadsDir = path.join(process.cwd(), "downloads");
      if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
      }

      // Generate filename
      const timestamp = Date.now();
      const extension = type === "video" ? "mp4" : "mp3";
      const filename = `download_${timestamp}.${extension}`;
      const filepath = path.join(downloadsDir, filename);

      // Clean URL - remove playlist parameters for single video downloads
      let cleanUrl = url;
      if (detectedPlatform === 'youtube' && url.includes('list=')) {
        cleanUrl = url.split('&list=')[0]; // Remove playlist parameter
      }

      // Prepare platform-specific yt-dlp command
      let ytDlpCommand;
      let baseOptions = "--no-check-certificate --no-playlist --max-filesize 100M --user-agent \"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36\"";
      
      // Platform-specific optimizations
      if (detectedPlatform === 'youtube') {
        baseOptions += " --add-header \"Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8\" --add-header \"Accept-Language:en-US,en;q=0.5\" --add-header \"Sec-Fetch-Dest:document\" --add-header \"Sec-Fetch-Mode:navigate\" --extractor-retries 10 --fragment-retries 10 --retry-sleep exp=1:60 --throttled-rate 100K --embed-subs --write-auto-sub";
      } else if (detectedPlatform === 'instagram') {
        baseOptions += " --extractor-retries 8 --fragment-retries 8 --retry-sleep linear=2::10";
      } else if (detectedPlatform === 'tiktok') {
        baseOptions += " --extractor-retries 5 --fragment-retries 5 --retry-sleep linear=1::5";
      } else {
        baseOptions += " --extractor-retries 8 --fragment-retries 8 --retry-sleep exp=1:30";
      }

      if (type === "video") {
        const format = quality === "1080p" ? "best[height<=1080]" : 
                      quality === "720p" ? "best[height<=720]" : 
                      quality === "480p" ? "best[height<=480]" : 
                      quality === "360p" ? "best[height<=360]" : "best";
        
        ytDlpCommand = `yt-dlp ${baseOptions} -f "${format}" -o "${filepath}" "${cleanUrl}"`;
      } else {
        const audioQuality = quality === "320kbps" ? "320" :
                           quality === "256kbps" ? "256" :
                           quality === "192kbps" ? "192" :
                           quality === "128kbps" ? "128" : "320";
        
        ytDlpCommand = `yt-dlp ${baseOptions} -x --audio-format mp3 --audio-quality ${audioQuality} -o "${filepath.replace('.mp3', '.%(ext)s')}" "${cleanUrl}"`;
      }

      // Execute download with timeout and multiple fallback strategies
      console.log(`Executing: ${ytDlpCommand}`);
      let downloadSuccess = false;
      let lastError = null;

      // Strategy 1: Primary attempt
      try {
        await execAsync(ytDlpCommand, { timeout: 180000 });
        downloadSuccess = true;
      } catch (error) {
        lastError = error;
        console.log("Primary download failed, trying fallback strategies...", error.message);
        
        // Strategy 2: Try with different user agents and simpler formats
        const fallbackStrategies = [
          {
            name: "Mobile Safari",
            ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            options: "--no-playlist --extractor-retries 10 --fragment-retries 10 --retry-sleep linear=1::5"
          },
          {
            name: "Android Chrome",
            ua: "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
            options: "--no-playlist --extractor-retries 8 --fragment-retries 8 --retry-sleep linear=2::8"
          },
          {
            name: "Simple approach",
            ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            options: "--no-playlist --no-check-certificate --ignore-errors"
          }
        ];

        for (const strategy of fallbackStrategies) {
          if (downloadSuccess) break;
          
          try {
            console.log(`Trying ${strategy.name} strategy...`);
            
            let fallbackCommand;
            if (type === "video") {
              fallbackCommand = `yt-dlp --user-agent "${strategy.ua}" ${strategy.options} -f "18/mp4/best[height<=480]/worst" --max-filesize 80M -o "${filepath}" "${cleanUrl}"`;
            } else {
              fallbackCommand = `yt-dlp --user-agent "${strategy.ua}" ${strategy.options} -x --audio-format mp3 --audio-quality 192 --max-filesize 50M -o "${filepath.replace('.mp3', '.%(ext)s')}" "${cleanUrl}"`;
            }
            
            console.log(`Executing fallback: ${fallbackCommand}`);
            await execAsync(fallbackCommand, { timeout: 240000 });
            downloadSuccess = true;
            console.log(`${strategy.name} strategy succeeded!`);
            break;
          } catch (strategyError) {
            console.log(`${strategy.name} strategy failed:`, strategyError.message);
            lastError = strategyError;
          }
        }
      }

      // If all strategies failed, throw the last error
      if (!downloadSuccess) {
        throw lastError || new Error("All download strategies failed");
      }

      // Check if file was created
      const actualFiles = fs.readdirSync(downloadsDir).filter(f => f.startsWith(`download_${timestamp}`));
      
      if (actualFiles.length === 0) {
        return res.status(500).json({ error: "Download failed - no file created" });
      }

      const actualFilepath = path.join(downloadsDir, actualFiles[0]);
      const actualFilename = actualFiles[0];

      // Send file for download
      res.download(actualFilepath, actualFilename, (err) => {
        if (err) {
          console.error("Download error:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Failed to send file" });
          }
        }
        
        // Clean up file after download
        setTimeout(() => {
          try {
            if (fs.existsSync(actualFilepath)) {
              fs.unlinkSync(actualFilepath);
            }
          } catch (cleanupErr) {
            console.error("Cleanup error:", cleanupErr);
          }
        }, 5000); // Delete after 5 seconds
      });

    } catch (error) {
      console.error("Download error:", error);
      
      if (!res.headersSent) {
        if (error.message.includes("not available") || error.message.includes("private")) {
          res.status(404).json({ error: "Video not available, private, or region-blocked" });
        } else if (error.message.includes("Unsupported URL")) {
          res.status(400).json({ error: "Unsupported platform or URL format" });
        } else if (error.message.includes("403") || error.message.includes("Forbidden")) {
          res.status(403).json({ error: "Vidéo protégée ou nécessite une authentification. Essayez une autre vidéo." });
        } else if (error.message.includes("timeout") || error.message.includes("TIMEOUT")) {
          res.status(408).json({ error: "Délai d'attente dépassé. La vidéo est peut-être trop volumineuse." });
        } else if (error.message.includes("Sign in to confirm") || error.message.includes("bot")) {
          res.status(429).json({ error: "YouTube a détecté une activité automatisée. Veuillez réessayer dans quelques minutes." });
        } else {
          res.status(500).json({ error: "Échec du téléchargement. Cette vidéo pourrait être protégée ou indisponible." });
        }
      }
    }
  });

  // Claude AI Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, conversationHistory } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(500).json({ error: "Claude AI service not configured" });
      }

      // Prepare conversation context
      const systemPrompt = `Tu es un assistant spécialisé dans MediaSync, une application de téléchargement de médias. Tu aides les utilisateurs avec:

1. **Téléchargement de vidéos/audio** depuis YouTube, Instagram, TikTok, Facebook, Twitter/X, Twitch
2. **Résolution des erreurs** de téléchargement
3. **Formats et qualités** disponibles
4. **Utilisation de l'application**

Réponds en français de manière claire et utile. Si un utilisateur a des problèmes de téléchargement, propose des solutions concrètes.`;

      // Format conversation history for Claude
      const messages: any[] = [];
      
      if (conversationHistory && conversationHistory.length > 0) {
        conversationHistory.forEach((msg: any) => {
          messages.push({
            role: msg.isUser ? "user" : "assistant",
            content: msg.text
          });
        });
      }

      // Add current message
      messages.push({
        role: "user",
        content: message
      });

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages
      });

      const assistantResponse = response.content[0].type === 'text' ? response.content[0].text : '';

      res.json({
        response: assistantResponse,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ 
        error: "Erreur du service de chat. Veuillez réessayer.",
        fallback: "Désolé, je ne peux pas répondre en ce moment. Pour les problèmes de téléchargement, vérifiez que l'URL est correcte et que la vidéo est publique."
      });
    }
  });

  // Get video info endpoint
  app.post("/api/video-info", async (req, res) => {
    try {
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      // Get video information using yt-dlp
      const infoCommand = `yt-dlp --dump-json --no-download "${url}"`;
      const { stdout } = await execAsync(infoCommand);
      
      const info = JSON.parse(stdout);
      
      res.json({
        title: info.title,
        duration: info.duration,
        thumbnail: info.thumbnail,
        uploader: info.uploader,
        platform: info.extractor_key
      });

    } catch (error) {
      console.error("Info fetch error:", error);
      res.status(500).json({ error: "Failed to fetch video information" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
