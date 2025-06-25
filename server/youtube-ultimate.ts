import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export async function downloadYouTubeUltimate(url: string, type: 'video' | 'audio', quality: string, outputPath: string): Promise<boolean> {
  console.log(`Ultimate YouTube download attempt: ${url}`);
  
  // Clean URL and extract video ID
  const cleanUrl = url.split('&list=')[0].split('&t=')[0];
  const videoIdMatch = cleanUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  const videoId = videoIdMatch ? videoIdMatch[1] : null;
  
  if (!videoId) {
    throw new Error("Invalid YouTube URL format");
  }

  // Ultimate strategies with maximum stealth
  const ultimateStrategies = [
    {
      name: "Strategy 1: Maximum stealth with proxy rotation",
      execute: async () => {
        const randomDelay = Math.floor(Math.random() * 15) + 10;
        const stealthUserAgents = [
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0"
        ];
        const userAgent = stealthUserAgents[Math.floor(Math.random() * stealthUserAgents.length)];
        
        const command = type === 'video'
          ? `yt-dlp --no-playlist --sleep-requests ${randomDelay} --sleep-interval 12 --max-sleep-interval 25 --user-agent "${userAgent}" --referer "https://www.google.com/" --add-header "Accept-Language:en-US,en;q=0.9" --add-header "Accept-Encoding:gzip, deflate, br" -f "worst[height<=${quality.replace('p', '')}]/worst" --max-filesize 120M -o "${outputPath}" "${cleanUrl}"`
          : `yt-dlp --no-playlist --sleep-requests ${randomDelay} --sleep-interval 12 --max-sleep-interval 25 --user-agent "${userAgent}" --referer "https://www.google.com/" --add-header "Accept-Language:en-US,en;q=0.9" -x --audio-format mp3 --audio-quality ${quality.replace('kbps', '')} --max-filesize 80M -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${cleanUrl}"`;
        
        await execAsync(command, { timeout: 300000 }); // 5 minutes timeout
      }
    },
    {
      name: "Strategy 2: Googlebot simulation",
      execute: async () => {
        const command = type === 'video'
          ? `yt-dlp --no-playlist --sleep-requests 8 --user-agent "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" --referer "https://www.google.com/search?q=youtube" -f "18/worst" --max-filesize 100M -o "${outputPath}" "${cleanUrl}"`
          : `yt-dlp --no-playlist --sleep-requests 8 --user-agent "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" --referer "https://www.google.com/search?q=youtube" -x --audio-format mp3 --audio-quality 128 --max-filesize 60M -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${cleanUrl}"`;
        
        await execAsync(command, { timeout: 240000 });
      }
    },
    {
      name: "Strategy 3: Embedded bypass with session rotation",
      execute: async () => {
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        const mobileAgents = [
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
          "Mozilla/5.0 (Android 13; Mobile; rv:68.0) Gecko/68.0 Firefox/122.0",
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/122.0.0.0 Mobile/15E148 Safari/604.1"
        ];
        const userAgent = mobileAgents[Math.floor(Math.random() * mobileAgents.length)];
        
        const command = type === 'video'
          ? `yt-dlp --no-playlist --sleep-requests 6 --user-agent "${userAgent}" --referer "https://youtube.com/" --add-header "X-Forwarded-For:8.8.8.8" -f "worst" --max-filesize 80M -o "${outputPath}" "${embedUrl}"`
          : `yt-dlp --no-playlist --sleep-requests 6 --user-agent "${userAgent}" --referer "https://youtube.com/" --add-header "X-Forwarded-For:8.8.8.8" -x --audio-format mp3 --audio-quality 96 --max-filesize 50M -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${embedUrl}"`;
        
        await execAsync(command, { timeout: 240000 });
      }
    },
    {
      name: "Strategy 4: API endpoint extraction",
      execute: async () => {
        // Try multiple URL variations
        const urlVariants = [
          `https://www.youtube.com/watch?v=${videoId}`,
          `https://youtu.be/${videoId}`,
          `https://m.youtube.com/watch?v=${videoId}`,
          `https://youtube.com/watch?v=${videoId}`
        ];
        
        for (const variant of urlVariants) {
          try {
            const command = type === 'video'
              ? `yt-dlp --no-playlist --quiet --no-warnings --sleep-requests 10 --user-agent "Mozilla/5.0 (Smart TV; Tizen 4.0)" -f "worst" --max-filesize 60M -o "${outputPath}" "${variant}"`
              : `yt-dlp --no-playlist --quiet --no-warnings --sleep-requests 10 --user-agent "Mozilla/5.0 (Smart TV; Tizen 4.0)" -x --audio-format mp3 --audio-quality 96 --max-filesize 40M -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${variant}"`;
            
            await execAsync(command, { timeout: 180000 });
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
      name: "Strategy 5: Legacy protocol bypass",
      execute: async () => {
        const command = type === 'video'
          ? `yt-dlp --no-playlist --legacy-server-connect --sleep-requests 12 --user-agent "Mozilla/4.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)" --add-header "Accept:text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" -f "17/18/worst" --max-filesize 50M -o "${outputPath}" "${cleanUrl}"`
          : `yt-dlp --no-playlist --legacy-server-connect --sleep-requests 12 --user-agent "Mozilla/4.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)" -x --audio-format mp3 --audio-quality 64 --max-filesize 30M -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${cleanUrl}"`;
        
        await execAsync(command, { timeout: 240000 });
      }
    }
  ];

  // Execute strategies with proper verification
  for (const strategy of ultimateStrategies) {
    try {
      console.log(`Trying ${strategy.name}...`);
      await strategy.execute();
      
      // Verify file was created and has reasonable size
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        if (stats.size > 1000) { // At least 1KB
          console.log(`${strategy.name} succeeded! File size: ${stats.size} bytes`);
          return true;
        } else {
          console.log(`${strategy.name} created file but too small (${stats.size} bytes), trying next...`);
          fs.unlinkSync(outputPath);
        }
      }
      
      // Check for alternative extensions
      const altPaths = [
        outputPath.replace('.mp4', '.webm'),
        outputPath.replace('.mp4', '.mkv'),
        outputPath.replace('.mp3', '.m4a'),
        outputPath.replace('.mp3', '.webm')
      ];
      
      for (const altPath of altPaths) {
        if (fs.existsSync(altPath)) {
          console.log(`${strategy.name} succeeded with alternative format!`);
          // Move to expected path
          fs.renameSync(altPath, outputPath);
          return true;
        }
      }
      
    } catch (error) {
      console.log(`${strategy.name} failed: ${error.message}`);
      
      // Clean up any partial files
      try {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        ['.webm', '.mkv', '.m4a'].forEach(ext => {
          const altPath = outputPath.replace(path.extname(outputPath), ext);
          if (fs.existsSync(altPath)) fs.unlinkSync(altPath);
        });
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      continue;
    }
  }

  console.log("All ultimate YouTube strategies failed");
  throw new Error("Impossible de télécharger cette vidéo YouTube. Les protections sont trop strictes.");
}