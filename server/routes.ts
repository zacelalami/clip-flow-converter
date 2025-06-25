import { exec } from "child_process";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { MediaDownloader } from "./universal-downloader";
import { storage } from "./storage";

const execAsync = promisify(exec);

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure downloads directory exists
  const downloadsDir = path.join(process.cwd(), "downloads");
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }

  // Download endpoint
  app.post("/api/download", async (req, res) => {
    const { url, type, quality } = req.body;

    if (!url || !type || !quality) {
      return res.status(400).json({ error: "URL, type, and quality are required" });
    }

    const downloadStartTime = Date.now();
    
    try {
      const cleanUrl = url.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
      const platform = MediaDownloader.detectPlatform(cleanUrl);
      
      console.log(`Download request: ${platform} - ${cleanUrl}`);
      
      // Generate safe filename
      let filename;
      try {
        const metadata = await MediaDownloader.getMetadata(cleanUrl);
        if (metadata && metadata.title) {
          const cleanTitle = metadata.title
            .replace(/[<>:"/\\|?*]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 80);
          filename = `${cleanTitle}_${Date.now()}`;
        } else {
          filename = `${platform}_${type}_${Date.now()}`;
        }
      } catch (titleError) {
        filename = `${platform}_${type}_${Date.now()}`;
      }

      const extension = type === 'video' ? 'mp4' : 'mp3';
      const filepath = path.join(downloadsDir, `${filename}.${extension}`);

      // Use MediaDownloader
      const result = await MediaDownloader.download(cleanUrl, type, quality, filepath);

      if (result.success && result.filepath && fs.existsSync(result.filepath)) {
        const stats = fs.statSync(result.filepath);
        const downloadTime = Date.now() - downloadStartTime;
        
        console.log(`Download completed successfully in ${downloadTime}ms: ${result.filepath} (${stats.size} bytes)`);
        
        const filename = path.basename(result.filepath);
        console.log(`Sending file with name: ${filename}`);
        
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', type === 'video' ? 'video/mp4' : 'audio/mpeg');
        res.setHeader('Content-Length', stats.size.toString());
        
        const readStream = fs.createReadStream(result.filepath);
        readStream.pipe(res);
        
        // Clean up file after sending
        readStream.on('end', () => {
          setTimeout(() => {
            try {
              if (fs.existsSync(result.filepath!)) {
                fs.unlinkSync(result.filepath!);
                console.log(`Cleaned up temporary file: ${result.filepath}`);
              }
            } catch (cleanupError) {
              console.log("Failed to cleanup file:", cleanupError.message);
            }
          }, 5000);
        });
      } else {
        throw new Error(result.error || "Download failed for unknown reason");
      }

    } catch (error) {
      console.log("Download error:", error);
      
      // Detailed error handling
      if (error.message.includes("timeout")) {
        res.status(408).json({ error: "Délai d'attente dépassé. Réessayez." });
      } else if (error.message.includes("Sign in to confirm") || error.message.includes("bot")) {
        res.status(429).json({ error: "Protection anti-bot activée. Essayez dans quelques minutes." });
      } else if (error.message.includes("private") || error.message.includes("unavailable")) {
        res.status(404).json({ error: "Vidéo non disponible ou privée." });
      } else {
        res.status(500).json({ error: "Échec du téléchargement. Vérifiez le lien et réessayez." });
      }
    }
  });

  // Video info endpoint
  app.post("/api/video-info", async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      console.log("Video info request:", url);
      
      const metadata = await MediaDownloader.getMetadata(url);
      
      if (metadata) {
        res.json(metadata);
      } else {
        res.status(404).json({ error: "Could not retrieve video information" });
      }
    } catch (error) {
      console.error("Video info error:", error);
      res.status(500).json({ error: "Failed to get video information" });
    }
  });

  // Basic health check endpoint  
  app.get("/", (req, res) => {
    res.json({ message: "MediaSync API is running", version: "2.0.0" });
  });

  const server = createServer(app);
  return server;
}