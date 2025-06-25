import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export interface DownloadResult {
  success: boolean;
  filepath?: string;
  error?: string;
  metadata?: {
    title: string;
    duration: number;
    thumbnail: string;
    uploader: string;
  };
}

export class UniversalDownloader {
  private static readonly MAX_FILESIZE = 200; // MB
  private static readonly TIMEOUT = 120000; // 2 minutes
  
  // Comprehensive user agents for stealth
  private static readonly USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Android 14; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0"
  ];

  static detectPlatform(url: string): string {
    const normalizedUrl = url.toLowerCase();
    if (normalizedUrl.includes('youtube.com') || normalizedUrl.includes('youtu.be')) return 'youtube';
    if (normalizedUrl.includes('instagram.com')) return 'instagram';
    if (normalizedUrl.includes('tiktok.com')) return 'tiktok';
    if (normalizedUrl.includes('facebook.com') || normalizedUrl.includes('fb.watch')) return 'facebook';
    if (normalizedUrl.includes('twitter.com') || normalizedUrl.includes('x.com')) return 'twitter';
    if (normalizedUrl.includes('twitch.tv')) return 'twitch';
    return 'unknown';
  }

  static async downloadWithRetry(url: string, type: 'video' | 'audio', quality: string, outputPath: string): Promise<DownloadResult> {
    const platform = this.detectPlatform(url);
    console.log(`Starting download: ${platform} - ${url}`);

    // Platform-specific download strategies
    const strategies = this.getStrategiesForPlatform(platform, url, type, quality, outputPath);
    
    let lastError: Error | null = null;
    
    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      console.log(`Trying strategy ${i + 1}/${strategies.length}: ${strategy.name}`);
      
      try {
        const result = await this.executeStrategy(strategy);
        if (result.success) {
          console.log(`Strategy ${strategy.name} succeeded!`);
          return result;
        }
      } catch (error) {
        console.log(`Strategy ${strategy.name} failed:`, error.message);
        lastError = error;
        
        // Clean up partial files
        this.cleanupPartialFiles(outputPath);
        
        // Add delay between retries
        if (i < strategies.length - 1) {
          await this.delay(2000 + Math.random() * 3000);
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'All download strategies failed'
    };
  }

  private static getStrategiesForPlatform(platform: string, url: string, type: 'video' | 'audio', quality: string, outputPath: string) {
    const baseOptions = `--no-check-certificate --no-playlist --max-filesize ${this.MAX_FILESIZE}M --no-warnings`;
    
    switch (platform) {
      case 'youtube':
        return this.getYouTubeStrategies(url, type, quality, outputPath, baseOptions);
      case 'instagram':
        return this.getInstagramStrategies(url, type, quality, outputPath, baseOptions);
      case 'tiktok':
        return this.getTikTokStrategies(url, type, quality, outputPath, baseOptions);
      case 'facebook':
        return this.getFacebookStrategies(url, type, quality, outputPath, baseOptions);
      case 'twitter':
        return this.getTwitterStrategies(url, type, quality, outputPath, baseOptions);
      case 'twitch':
        return this.getTwitchStrategies(url, type, quality, outputPath, baseOptions);
      default:
        return this.getGenericStrategies(url, type, quality, outputPath, baseOptions);
    }
  }

  private static getYouTubeStrategies(url: string, type: 'video' | 'audio', quality: string, outputPath: string, baseOptions: string) {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
    const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    
    return [
      {
        name: "YouTube Mobile Bypass",
        command: type === 'video' 
          ? `yt-dlp ${baseOptions} --user-agent "${this.USER_AGENTS[2]}" -f "worst[height<=720]" -o "${outputPath}" "${url}"`
          : `yt-dlp ${baseOptions} --user-agent "${this.USER_AGENTS[2]}" -x --audio-format mp3 --audio-quality 128 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${url}"`
      },
      {
        name: "YouTube Embed Bypass",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --user-agent "${this.USER_AGENTS[0]}" -f "18/worst" -o "${outputPath}" "${embedUrl}"`
          : `yt-dlp ${baseOptions} --user-agent "${this.USER_AGENTS[0]}" -x --audio-format mp3 --audio-quality 96 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${embedUrl}"`
      },
      {
        name: "YouTube Legacy Format",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --legacy-server-connect -f "17/18/36" -o "${outputPath}" "${url}"`
          : `yt-dlp ${baseOptions} --legacy-server-connect -x --audio-format mp3 --audio-quality 64 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${url}"`
      }
    ];
  }

  private static getInstagramStrategies(url: string, type: 'video' | 'audio', quality: string, outputPath: string, baseOptions: string) {
    return [
      {
        name: "Instagram Mobile",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --user-agent "${this.USER_AGENTS[2]}" --extractor-retries 5 -f "best[height<=720]" -o "${outputPath}" "${url}"`
          : `yt-dlp ${baseOptions} --user-agent "${this.USER_AGENTS[2]}" --extractor-retries 5 -x --audio-format mp3 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${url}"`
      },
      {
        name: "Instagram Embed",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --user-agent "${this.USER_AGENTS[0]}" --referer "https://www.instagram.com/" -f "mp4" -o "${outputPath}" "${url}"`
          : `yt-dlp ${baseOptions} --user-agent "${this.USER_AGENTS[0]}" --referer "https://www.instagram.com/" -x --audio-format mp3 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${url}"`
      }
    ];
  }

  private static getTikTokStrategies(url: string, type: 'video' | 'audio', quality: string, outputPath: string, baseOptions: string) {
    return [
      {
        name: "TikTok Standard",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --user-agent "${this.USER_AGENTS[2]}" --extractor-retries 3 -f "best[height<=720]" -o "${outputPath}" "${url}"`
          : `yt-dlp ${baseOptions} --user-agent "${this.USER_AGENTS[2]}" --extractor-retries 3 -x --audio-format mp3 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${url}"`
      },
      {
        name: "TikTok Watermark Free",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --user-agent "${this.USER_AGENTS[0]}" -f "download" -o "${outputPath}" "${url}"`
          : `yt-dlp ${baseOptions} --user-agent "${this.USER_AGENTS[0]}" -x --audio-format mp3 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${url}"`
      }
    ];
  }

  private static getFacebookStrategies(url: string, type: 'video' | 'audio', quality: string, outputPath: string, baseOptions: string) {
    return [
      {
        name: "Facebook Standard",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --user-agent "${this.USER_AGENTS[0]}" --extractor-retries 8 -f "best[height<=720]" -o "${outputPath}" "${url}"`
          : `yt-dlp ${baseOptions} --user-agent "${this.USER_AGENTS[0]}" --extractor-retries 8 -x --audio-format mp3 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${url}"`
      }
    ];
  }

  private static getTwitterStrategies(url: string, type: 'video' | 'audio', quality: string, outputPath: string, baseOptions: string) {
    return [
      {
        name: "Twitter Standard",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --user-agent "${this.USER_AGENTS[0]}" -f "best[height<=720]" -o "${outputPath}" "${url}"`
          : `yt-dlp ${baseOptions} --user-agent "${this.USER_AGENTS[0]}" -x --audio-format mp3 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${url}"`
      }
    ];
  }

  private static getTwitchStrategies(url: string, type: 'video' | 'audio', quality: string, outputPath: string, baseOptions: string) {
    return [
      {
        name: "Twitch Standard",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --user-agent "${this.USER_AGENTS[0]}" -f "best[height<=720]" -o "${outputPath}" "${url}"`
          : `yt-dlp ${baseOptions} --user-agent "${this.USER_AGENTS[0]}" -x --audio-format mp3 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${url}"`
      }
    ];
  }

  private static getGenericStrategies(url: string, type: 'video' | 'audio', quality: string, outputPath: string, baseOptions: string) {
    return [
      {
        name: "Generic Standard",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --user-agent "${this.USER_AGENTS[0]}" -f "best[height<=720]" -o "${outputPath}" "${url}"`
          : `yt-dlp ${baseOptions} --user-agent "${this.USER_AGENTS[0]}" -x --audio-format mp3 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${url}"`
      }
    ];
  }

  private static async executeStrategy(strategy: { name: string; command: string }): Promise<DownloadResult> {
    try {
      console.log(`Executing: ${strategy.command}`);
      const { stdout, stderr } = await execAsync(strategy.command, { 
        timeout: this.TIMEOUT,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      // Check if file was created
      const outputPath = this.extractOutputPath(strategy.command);
      if (outputPath && fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        if (stats.size > 1000) { // At least 1KB
          return {
            success: true,
            filepath: outputPath
          };
        }
      }
      
      return {
        success: false,
        error: 'File not created or too small'
      };
    } catch (error) {
      throw new Error(`Command failed: ${error.message}`);
    }
  }

  private static extractOutputPath(command: string): string | null {
    const match = command.match(/-o\s+"([^"]+)"/);
    return match ? match[1] : null;
  }

  private static cleanupPartialFiles(outputPath: string): void {
    try {
      const extensions = ['.mp4', '.webm', '.mkv', '.mp3', '.m4a', '.part', '.tmp'];
      const basePath = outputPath.replace(path.extname(outputPath), '');
      
      extensions.forEach(ext => {
        const filePath = basePath + ext;
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get video metadata
  static async getVideoMetadata(url: string): Promise<any> {
    try {
      const command = `yt-dlp --dump-json --no-download "${url}"`;
      const { stdout } = await execAsync(command, { timeout: 30000 });
      return JSON.parse(stdout);
    } catch (error) {
      console.log("Failed to get metadata:", error.message);
      return null;
    }
  }
}