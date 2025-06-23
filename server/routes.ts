import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

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

      // Prepare platform-specific yt-dlp command
      let ytDlpCommand;
      let baseOptions = "--no-check-certificate --user-agent \"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\"";
      
      // Platform-specific optimizations
      if (detectedPlatform === 'youtube') {
        baseOptions += " --add-header \"Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8\" --add-header \"Accept-Language:en-US,en;q=0.5\" --extractor-retries 15 --fragment-retries 15 --retry-sleep exp=2:120 --throttled-rate 75K";
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
        
        ytDlpCommand = `yt-dlp ${baseOptions} -f "${format}" -o "${filepath}" "${url}"`;
      } else {
        const audioQuality = quality === "320kbps" ? "320" :
                           quality === "256kbps" ? "256" :
                           quality === "192kbps" ? "192" :
                           quality === "128kbps" ? "128" : "320";
        
        ytDlpCommand = `yt-dlp ${baseOptions} -x --audio-format mp3 --audio-quality ${audioQuality} -o "${filepath.replace('.mp3', '.%(ext)s')}" "${url}"`;
      }

      // Execute download with timeout
      console.log(`Executing: ${ytDlpCommand}`);
      try {
        await execAsync(ytDlpCommand, { timeout: 120000 }); // 2 minute timeout
      } catch (error) {
        // If download fails, try with different format fallbacks
        console.log("Primary download failed, trying fallback formats...");
        
        console.log("Primary download failed, trying alternative methods...");
        
        // Try with different approach - using mobile user agent and simpler format
        const mobileUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
        
        if (type === "video") {
          // Try mobile format first
          try {
            const mobileCommand = `yt-dlp --user-agent "${mobileUA}" --extractor-retries 15 --fragment-retries 15 --retry-sleep exp=2:120 --throttled-rate 50K -f "18/mp4/worst" -o "${filepath}" "${url}"`;
            console.log(`Trying mobile fallback: ${mobileCommand}`);
            await execAsync(mobileCommand, { timeout: 300000 });
          } catch (mobileError) {
            // Final fallback - try without format specification
            const finalCommand = `yt-dlp --user-agent "${mobileUA}" --extractor-retries 20 --fragment-retries 20 --retry-sleep exp=3:180 --throttled-rate 25K --format-sort "res:480,ext:mp4:m4a" -o "${filepath}" "${url}"`;
            console.log(`Trying final video fallback: ${finalCommand}`);
            await execAsync(finalCommand, { timeout: 300000 });
          }
        } else {
          // Try audio extraction with mobile approach
          try {
            const mobileAudioCommand = `yt-dlp --user-agent "${mobileUA}" --extractor-retries 15 --fragment-retries 15 --retry-sleep exp=2:120 --throttled-rate 50K -x --audio-format mp3 --audio-quality 192 -o "${filepath.replace('.mp3', '.%(ext)s')}" "${url}"`;
            console.log(`Trying mobile audio fallback: ${mobileAudioCommand}`);
            await execAsync(mobileAudioCommand, { timeout: 300000 });
          } catch (mobileError) {
            // Final audio fallback
            const finalAudioCommand = `yt-dlp --user-agent "${mobileUA}" --extractor-retries 20 --fragment-retries 20 --retry-sleep exp=3:180 --throttled-rate 25K -x --audio-format mp3 -o "${filepath.replace('.mp3', '.%(ext)s')}" "${url}"`;
            console.log(`Trying final audio fallback: ${finalAudioCommand}`);
            await execAsync(finalAudioCommand, { timeout: 300000 });
          }
        }
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
          res.status(403).json({ error: "Video is protected or requires authentication. Try a different video." });
        } else if (error.message.includes("timeout") || error.message.includes("TIMEOUT")) {
          res.status(408).json({ error: "Download timeout. The video might be too large or the server is busy." });
        } else {
          res.status(500).json({ error: "Download failed. This video might be protected or unavailable." });
        }
      }
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
