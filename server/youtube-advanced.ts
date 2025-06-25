import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export async function downloadYouTubeAdvanced(url: string, type: 'video' | 'audio', quality: string, outputPath: string): Promise<boolean> {
  console.log(`Advanced YouTube download: ${url}`);
  
  // Clean URL and extract video ID
  const cleanUrl = url.split('&list=')[0].split('&t=')[0];
  const videoIdMatch = cleanUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  const videoId = videoIdMatch ? videoIdMatch[1] : null;
  
  if (!videoId) {
    throw new Error("Invalid YouTube URL format");
  }

  // Create multiple URL variations
  const urlVariants = [
    `https://www.youtube.com/watch?v=${videoId}`,
    `https://youtu.be/${videoId}`,
    `https://m.youtube.com/watch?v=${videoId}`,
    `https://youtube.com/watch?v=${videoId}`
  ];

  const strategies = [
    {
      name: "Strategy 1: Ultra-stealth with random delays",
      execute: async () => {
        const randomDelay = Math.floor(Math.random() * 10) + 5;
        const userAgents = [
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        ];
        const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
        
        const command = type === 'video'
          ? `yt-dlp --no-playlist --sleep-requests ${randomDelay} --sleep-interval 8 --max-sleep-interval 20 --user-agent "${userAgent}" --referer "https://www.google.com/" -f "worst[height<=${quality.replace('p', '')}]/worst" --max-filesize 100M -o "${outputPath}" "${cleanUrl}"`
          : `yt-dlp --no-playlist --sleep-requests ${randomDelay} --sleep-interval 8 --max-sleep-interval 20 --user-agent "${userAgent}" --referer "https://www.google.com/" -x --audio-format mp3 --audio-quality ${quality.replace('kbps', '')} --max-filesize 70M -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${cleanUrl}"`;
        
        await execAsync(command, { timeout: 180000 });
      }
    },
    {
      name: "Strategy 2: Age-restricted bypass",
      execute: async () => {
        const command = type === 'video'
          ? `yt-dlp --no-playlist --mark-watched --sleep-requests 6 --user-agent "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" -f "18/worst" --max-filesize 80M -o "${outputPath}" "${cleanUrl}"`
          : `yt-dlp --no-playlist --mark-watched --sleep-requests 6 --user-agent "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" -x --audio-format mp3 --audio-quality 128 --max-filesize 60M -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${cleanUrl}"`;
        
        await execAsync(command, { timeout: 180000 });
      }
    },
    {
      name: "Strategy 3: Embedded extraction",
      execute: async () => {
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        const command = type === 'video'
          ? `yt-dlp --no-playlist --sleep-requests 4 --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15" --referer "https://youtube.com/" -f "worst" --max-filesize 60M -o "${outputPath}" "${embedUrl}"`
          : `yt-dlp --no-playlist --sleep-requests 4 --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15" --referer "https://youtube.com/" -x --audio-format mp3 --audio-quality 96 --max-filesize 40M -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${embedUrl}"`;
        
        await execAsync(command, { timeout: 180000 });
      }
    },
    {
      name: "Strategy 4: Multi-URL fallback",
      execute: async () => {
        for (const variant of urlVariants) {
          try {
            const command = type === 'video'
              ? `yt-dlp --no-playlist --quiet --no-warnings --sleep-requests 3 -f "worst" --max-filesize 50M -o "${outputPath}" "${variant}"`
              : `yt-dlp --no-playlist --quiet --no-warnings --sleep-requests 3 -x --audio-format mp3 --audio-quality 96 --max-filesize 30M -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${variant}"`;
            
            await execAsync(command, { timeout: 120000 });
            return; // Success, exit loop
          } catch (error) {
            console.log(`URL variant ${variant} failed, trying next...`);
            continue;
          }
        }
        throw new Error("All URL variants failed");
      }
    },
    {
      name: "Strategy 5: Legacy format bypass",
      execute: async () => {
        const command = type === 'video'
          ? `yt-dlp --no-playlist --legacy-server-connect --sleep-requests 5 --user-agent "Mozilla/4.0 (compatible; MSIE 9.0; Windows NT 6.1)" -f "17/18/worst" --max-filesize 40M -o "${outputPath}" "${cleanUrl}"`
          : `yt-dlp --no-playlist --legacy-server-connect --sleep-requests 5 --user-agent "Mozilla/4.0 (compatible; MSIE 9.0; Windows NT 6.1)" -x --audio-format mp3 --audio-quality 64 --max-filesize 25M -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${cleanUrl}"`;
        
        await execAsync(command, { timeout: 180000 });
      }
    }
  ];

  // Try each strategy with proper error handling
  for (const strategy of strategies) {
    try {
      console.log(`Trying ${strategy.name}...`);
      await strategy.execute();
      
      // Verify file was created
      if (fs.existsSync(outputPath) || fs.existsSync(outputPath.replace('.mp3', '.m4a'))) {
        console.log(`${strategy.name} succeeded!`);
        return true;
      }
    } catch (error) {
      console.log(`${strategy.name} failed: ${error.message}`);
      
      // Clean up any partial files
      try {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        if (fs.existsSync(outputPath.replace('.mp3', '.m4a'))) fs.unlinkSync(outputPath.replace('.mp3', '.m4a'));
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      continue;
    }
  }

  console.log("All advanced YouTube strategies failed");
  throw new Error("YouTube a activé des protections anti-bot très strictes. Essayez dans quelques minutes ou utilisez d'autres plateformes.");
}