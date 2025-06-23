import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export async function downloadYouTubeVideo(url: string, type: 'video' | 'audio', quality: string, outputPath: string): Promise<boolean> {
  console.log(`Attempting YouTube download: ${url}`);
  
  // Clean URL
  const cleanUrl = url.split('&list=')[0];
  
  // Multiple fallback strategies for YouTube
  const strategies = [
    {
      name: "Strategy 1: Basic yt-dlp with delays",
      command: type === 'video'
        ? `yt-dlp --no-playlist --sleep-requests 2 --sleep-interval 3 --max-sleep-interval 8 --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -f "best[height<=${quality.replace('p', '')}]/best" --max-filesize 100M -o "${outputPath}" "${cleanUrl}"`
        : `yt-dlp --no-playlist --sleep-requests 2 --sleep-interval 3 --max-sleep-interval 8 --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -x --audio-format mp3 --audio-quality ${quality.replace('kbps', '')} --max-filesize 80M -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${cleanUrl}"`
    },
    {
      name: "Strategy 2: Alternative user agent",
      command: type === 'video'
        ? `yt-dlp --no-playlist --user-agent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15" -f "18/mp4/worst" --max-filesize 80M -o "${outputPath}" "${cleanUrl}"`
        : `yt-dlp --no-playlist --user-agent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15" -x --audio-format mp3 --audio-quality 128 --max-filesize 60M -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${cleanUrl}"`
    },
    {
      name: "Strategy 3: Minimal approach",
      command: type === 'video'
        ? `yt-dlp --no-playlist --quiet --no-warnings -f "worst/best" --max-filesize 50M -o "${outputPath}" "${cleanUrl}"`
        : `yt-dlp --no-playlist --quiet --no-warnings -x --audio-format mp3 --audio-quality 96 --max-filesize 40M -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${cleanUrl}"`
    }
  ];

  // Try each strategy
  for (const strategy of strategies) {
    try {
      console.log(`Trying ${strategy.name}...`);
      await execAsync(strategy.command, { timeout: 120000 }); // 2 minutes timeout
      
      // Check if file was created
      const dir = path.dirname(outputPath);
      const baseFileName = path.basename(outputPath, path.extname(outputPath));
      const files = fs.readdirSync(dir).filter(f => f.includes(baseFileName));
      
      if (files.length > 0) {
        console.log(`${strategy.name} succeeded!`);
        return true;
      }
    } catch (error) {
      console.log(`${strategy.name} failed: ${error.message}`);
      continue;
    }
  }

  // If all strategies fail, throw an error to let the main handler deal with it
  console.log("All YouTube strategies failed");
  throw new Error("YouTube a activé ses protections anti-bot. Les téléchargements YouTube sont temporairement bloqués. Essayez avec Instagram, TikTok ou d'autres plateformes qui fonctionnent parfaitement.");
}

export async function getYouTubeInfo(url: string) {
  const cleanUrl = url.split('&list=')[0];
  
  // Try oEmbed first (most reliable)
  try {
    const oembedUrl = `https://youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`;
    const response = await fetch(oembedUrl);
    
    if (response.ok) {
      const data = await response.json();
      return {
        title: data.title,
        uploader: data.author_name,
        thumbnail: data.thumbnail_url,
        duration: "Durée inconnue", // oEmbed doesn't provide duration
        platform: "youtube"
      };
    }
  } catch (error) {
    console.log("oEmbed failed, trying yt-dlp...");
  }
  
  // Fallback to yt-dlp
  try {
    const { stdout } = await execAsync(`yt-dlp --dump-json --no-download --quiet "${cleanUrl}"`, { timeout: 20000 });
    const info = JSON.parse(stdout);
    
    const formatDuration = (seconds) => {
      if (!seconds) return "Durée inconnue";
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };
    
    return {
      title: info.title,
      uploader: info.uploader,
      thumbnail: info.thumbnail,
      duration: formatDuration(info.duration),
      platform: "youtube"
    };
  } catch (error) {
    console.log("yt-dlp info failed:", error.message);
    return null;
  }
}