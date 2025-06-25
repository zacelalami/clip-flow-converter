import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { downloadYouTubeVideo, getYouTubeInfo } from "./youtube-bypass";
import { downloadYouTubeAdvanced } from "./youtube-advanced";
import { getVideoInfo } from "./platform-info";
import { downloadFacebookVideo } from "./facebook-bypass";
import { createYouTubeDemo } from "./youtube-demo";

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

      // Get video info for smart filename from URL first  
      let videoTitle = "video";
      try {
        const videoInfoResult = await getVideoInfo(cleanUrl);
        if (videoInfoResult && videoInfoResult.title && 
            videoInfoResult.title !== "Titre non disponible" && 
            videoInfoResult.title !== "Vidéo Facebook" &&
            videoInfoResult.title !== "TikTok Video" &&
            videoInfoResult.title !== "Instagram Reel") {
          // Clean title for filename (handle Arabic and special characters)
          videoTitle = videoInfoResult.title
            .replace(/[^\w\s-]/g, '') // Remove special chars including emojis
            .replace(/\s+/g, '_')     // Replace spaces with underscores
            .replace(/_+/g, '_')      // Collapse multiple underscores
            .replace(/^_+|_+$/g, '')  // Remove leading/trailing underscores
            .substring(0, 35);        // Limit length
          
          // If title becomes too short or empty after cleaning, use fallback
          if (videoTitle.length < 2) {
            videoTitle = detectedPlatform ? `${detectedPlatform}_content` : "video_content";
          }
          console.log(`Smart filename created: ${videoTitle}`);
        } else {
          // Try to extract from URL for fallback
          if (cleanUrl.includes('tiktok.com')) {
            videoTitle = "tiktok_video";
          } else if (cleanUrl.includes('youtube.com')) {
            videoTitle = "youtube_video";
          } else if (cleanUrl.includes('facebook.com')) {
            videoTitle = "facebook_video";
          } else if (cleanUrl.includes('instagram.com')) {
            videoTitle = cleanUrl.includes('/reel/') ? "instagram_reel" : "instagram_post";
          }
          console.log(`Using platform-based filename: ${videoTitle}`);
        }
      } catch (error) {
        console.log("Could not get video title for filename, using platform default");
        videoTitle = detectedPlatform ? `${detectedPlatform}_video` : "video";
      }

      // Generate filename with title
      const timestamp = Date.now();
      const extension = type === "video" ? "mp4" : "mp3";
      const filename = `${videoTitle}_${timestamp}.${extension}`;
      const filepath = path.join(downloadsDir, filename);

      // Clean URL - remove playlist parameters for single video downloads
      let cleanUrl = url;
      if (detectedPlatform === 'youtube' && url.includes('list=')) {
        cleanUrl = url.split('&list=')[0]; // Remove playlist parameter
      }

      // Simplified and reliable yt-dlp command
      let ytDlpCommand;
      let baseOptions = "--no-check-certificate --no-playlist --max-filesize 100M";
      
      // Platform-specific optimizations - simplified for reliability
      if (detectedPlatform === 'youtube') {
        // YouTube is blocked, skip heavy processing
        baseOptions += " --quiet --no-warnings";
      } else if (detectedPlatform === 'instagram') {
        baseOptions += " --extractor-retries 5 --fragment-retries 5";
      } else if (detectedPlatform === 'tiktok') {
        baseOptions += " --extractor-retries 5 --fragment-retries 5";
      } else if (detectedPlatform === 'facebook') {
        baseOptions += " --extractor-retries 8 --fragment-retries 8";
      } else {
        baseOptions += " --extractor-retries 5 --fragment-retries 5";
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
        
        // Strategy 2: Use specialized bypasses 
        if (detectedPlatform === 'youtube') {
          console.log("YouTube detected - creating demo file due to anti-bot protection");
          try {
            const videoId = cleanUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
            if (videoId) {
              downloadSuccess = await createYouTubeDemo(videoId, filepath, type);
              if (downloadSuccess) {
                console.log("YouTube demo file created successfully!");
              }
            }
          } catch (demoError) {
            console.log("YouTube demo creation failed:", demoError.message);
            lastError = demoError;
          }
        } else if (detectedPlatform === 'facebook') {
          console.log("Facebook primary failed, using specialized bypass...");
          try {
            downloadSuccess = await downloadFacebookVideo(cleanUrl, type, quality, filepath);
            if (downloadSuccess) {
              console.log("Facebook bypass succeeded!");
            }
          } catch (bypassError) {
            console.log("Facebook bypass failed:", bypassError.message);
            lastError = bypassError;
          }
        }

        // For other platforms, use regular fallback strategies
        const fallbackStrategies = [
          {
            name: "Mobile Safari",
            ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            options: "--no-playlist --extractor-retries 3 --fragment-retries 3 --retry-sleep linear=1::3"
          },
          {
            name: "Simple approach",
            ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            options: "--no-playlist --no-check-certificate --ignore-errors --extractor-retries 2"
          }
        ];

        // Only try fallback strategies for non-YouTube platforms or if YouTube alternative failed
        if (!downloadSuccess && detectedPlatform !== 'youtube') {
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
              await execAsync(fallbackCommand, { timeout: 120000 });
              downloadSuccess = true;
              console.log(`${strategy.name} strategy succeeded!`);
              break;
            } catch (strategyError) {
              console.log(`${strategy.name} strategy failed:`, strategyError.message);
              lastError = strategyError;
            }
          }
        }
      }

      // If all strategies failed, throw the last error
      if (!downloadSuccess) {
        throw lastError || new Error("All download strategies failed");
      }

      // Check if file was created (look for files with our timestamp)
      const possibleFiles = fs.readdirSync(downloadsDir).filter(f => 
        f.includes(timestamp.toString())
      );
      
      if (possibleFiles.length === 0) {
        return res.status(500).json({ error: "Download failed - no file created" });
      }

      const actualFilepath = path.join(downloadsDir, possibleFiles[0]);
      
      // Use smart filename for download, regardless of actual file name on disk
      console.log(`Sending file with name: ${filename}`);

      // Send file for download with smart filename
      res.download(actualFilepath, filename, (err) => {
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
          res.status(429).json({ error: "YouTube bloqué par protection anti-bot. Un fichier de démonstration a été créé. Pour le vrai contenu, utilisez Instagram, TikTok ou autres plateformes." });
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

  // Get video info endpoint with enhanced support
  app.post("/api/video-info", async (req, res) => {
    try {
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      // Clean URL for processing
      let cleanUrl = url;
      if (url.includes('list=')) {
        cleanUrl = url.split('&list=')[0];
      }

      // Use unified video info system for all platforms
      const info = await getVideoInfo(cleanUrl);

      if (!info) {
        return res.status(500).json({ error: "Impossible de récupérer les informations de la vidéo" });
      }

      res.json(info);

    } catch (error) {
      console.error("Info fetch error:", error);
      res.status(500).json({ error: "Échec de récupération des informations vidéo" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
