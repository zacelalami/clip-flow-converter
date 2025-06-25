import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export interface DownloadResult {
  success: boolean;
  filepath?: string;
  error?: string;
  platform?: string;
}

export interface VideoMetadata {
  title: string;
  uploader: string;
  thumbnail: string | null;
  duration: string;
  durationSeconds: number;
  platform: string;
  viewCount: number | null;
  uploadDate: string | null;
}

export class MediaDownloader {
  private static readonly TIMEOUT = 120000; // 2 minutes
  private static readonly MAX_FILESIZE = 100; // MB

  static detectPlatform(url: string): string {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube';
    if (lowerUrl.includes('instagram.com')) return 'instagram';
    if (lowerUrl.includes('tiktok.com')) return 'tiktok';
    if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch')) return 'facebook';
    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'twitter';
    if (lowerUrl.includes('twitch.tv')) return 'twitch';
    return 'generic';
  }

  static async download(url: string, type: 'video' | 'audio', quality: string, outputPath: string): Promise<DownloadResult> {
    const platform = this.detectPlatform(url);
    console.log(`Starting ${platform} download: ${url}`);

    // Remove early returns - we'll attempt downloads for all platforms

    // Clean URL
    const cleanUrl = url.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    
    // Get download strategies for platform
    const strategies = this.getDownloadStrategies(platform, cleanUrl, type, quality, outputPath);
    
    // Try each strategy
    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      console.log(`Trying strategy ${i + 1}/${strategies.length}: ${strategy.name}`);
      
      try {
        await this.executeCommand(strategy.command);
        
        // Check if file was created successfully
        if (this.verifyDownload(outputPath)) {
          console.log(`Download successful with ${strategy.name}`);
          return {
            success: true,
            filepath: outputPath,
            platform: platform
          };
        }
        
        // Clean up any partial files
        this.cleanup(outputPath);
        
      } catch (error) {
        console.log(`Strategy ${strategy.name} failed: ${error.message}`);
        this.cleanup(outputPath);
        
        // Small delay between retries
        if (i < strategies.length - 1) {
          await this.delay(1000);
        }
      }
    }

    return {
      success: false,
      error: `${platform} téléchargement échoué. Vérifiez le lien.`,
      platform: platform
    };
  }

  private static getDownloadStrategies(platform: string, url: string, type: 'video' | 'audio', quality: string, outputPath: string) {
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
    const cleanUrl = url.split('&list=')[0].split('&index=')[0]; // Remove playlist params
    
    return [
      {
        name: "YouTube Simple Mobile",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --socket-timeout 30 --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15" -f "18/mp4/worst" -o "${outputPath}" "${cleanUrl}"`
          : `yt-dlp ${baseOptions} --socket-timeout 30 --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15" -x --audio-format mp3 --audio-quality 128 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${cleanUrl}"`
      },
      {
        name: "YouTube Web Client",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --socket-timeout 30 --extractor-args "youtube:player_client=web" -f "worst" -o "${outputPath}" "${cleanUrl}"`
          : `yt-dlp ${baseOptions} --socket-timeout 30 --extractor-args "youtube:player_client=web" -x --audio-format mp3 --audio-quality 96 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${cleanUrl}"`
      },
      {
        name: "YouTube Android",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --socket-timeout 30 --extractor-args "youtube:player_client=android" -f "17/18/36" -o "${outputPath}" "${cleanUrl}"`
          : `yt-dlp ${baseOptions} --socket-timeout 30 --extractor-args "youtube:player_client=android" -x --audio-format mp3 --audio-quality 64 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${cleanUrl}"`
      }
    ];
  }

  private static getInstagramStrategies(url: string, type: 'video' | 'audio', quality: string, outputPath: string, baseOptions: string) {
    return [
      {
        name: "Instagram Browser Cookies",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --cookies-from-browser firefox --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15" --extractor-retries 5 -f "best[height<=720]/mp4" -o "${outputPath}" "${url}"`
          : `yt-dlp ${baseOptions} --cookies-from-browser firefox --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15" --extractor-retries 5 -x --audio-format mp3 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${url}"`
      },
      {
        name: "Instagram Mobile App Simulation",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --user-agent "Instagram 302.0.0.27.103 Android" --add-header "X-IG-App-ID:936619743392459" -f "mp4" -o "${outputPath}" "${url}"`
          : `yt-dlp ${baseOptions} --user-agent "Instagram 302.0.0.27.103 Android" --add-header "X-IG-App-ID:936619743392459" -x --audio-format mp3 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${url}"`
      },
      {
        name: "Instagram Chrome Extension Bypass",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" --add-header "Sec-Fetch-Site:same-origin" --referer "https://www.instagram.com/" -f "worst" -o "${outputPath}" "${url}"`
          : `yt-dlp ${baseOptions} --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" --add-header "Sec-Fetch-Site:same-origin" --referer "https://www.instagram.com/" -x --audio-format mp3 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${url}"`
      }
    ];
  }

  private static getTikTokStrategies(url: string, type: 'video' | 'audio', quality: string, outputPath: string, baseOptions: string) {
    return [
      {
        name: "TikTok Mobile",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15" --extractor-retries 3 -f "best[height<=720]" -o "${outputPath}" "${url}"`
          : `yt-dlp ${baseOptions} --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15" --extractor-retries 3 -x --audio-format mp3 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${url}"`
      },
      {
        name: "TikTok Watermark Free",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" -f "download" -o "${outputPath}" "${url}"`
          : `yt-dlp ${baseOptions} --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" -x --audio-format mp3 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${url}"`
      }
    ];
  }

  private static getFacebookStrategies(url: string, type: 'video' | 'audio', quality: string, outputPath: string, baseOptions: string) {
    return [
      {
        name: "Facebook Browser Cookies",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --cookies-from-browser chrome --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" --extractor-retries 8 -f "best[height<=720]/mp4" -o "${outputPath}" "${url}"`
          : `yt-dlp ${baseOptions} --cookies-from-browser chrome --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" --extractor-retries 8 -x --audio-format mp3 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${url}"`
      },
      {
        name: "Facebook Mobile Bypass",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15" --add-header "Accept-Language:en-US,en;q=0.9" -f "mp4" -o "${outputPath}" "${url}"`
          : `yt-dlp ${baseOptions} --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15" --add-header "Accept-Language:en-US,en;q=0.9" -x --audio-format mp3 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${url}"`
      },
      {
        name: "Facebook Graph API Simulation",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --user-agent "facebookexternalhit/1.1" --add-header "X-FB-Debug:1" -f "worst" -o "${outputPath}" "${url}"`
          : `yt-dlp ${baseOptions} --user-agent "facebookexternalhit/1.1" --add-header "X-FB-Debug:1" -x --audio-format mp3 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${url}"`
      }
    ];
  }

  private static getTwitterStrategies(url: string, type: 'video' | 'audio', quality: string, outputPath: string, baseOptions: string) {
    return [
      {
        name: "Twitter Standard",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" -f "best[height<=720]" -o "${outputPath}" "${url}"`
          : `yt-dlp ${baseOptions} --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" -x --audio-format mp3 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${url}"`
      }
    ];
  }

  private static getTwitchStrategies(url: string, type: 'video' | 'audio', quality: string, outputPath: string, baseOptions: string) {
    return [
      {
        name: "Twitch Standard",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" -f "best[height<=720]" -o "${outputPath}" "${url}"`
          : `yt-dlp ${baseOptions} --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" -x --audio-format mp3 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${url}"`
      }
    ];
  }

  private static getGenericStrategies(url: string, type: 'video' | 'audio', quality: string, outputPath: string, baseOptions: string) {
    return [
      {
        name: "Generic Standard",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" -f "best[height<=720]" -o "${outputPath}" "${url}"`
          : `yt-dlp ${baseOptions} --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" -x --audio-format mp3 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${url}"`
      }
    ];
  }

  private static async executeCommand(command: string): Promise<void> {
    console.log(`Executing: ${command.substring(0, 100)}...`);
    try {
      await execAsync(command, { 
        timeout: this.TIMEOUT,
        maxBuffer: 1024 * 1024 * 20 // 20MB buffer
      });
    } catch (error) {
      throw new Error(`Command failed: ${error.message}`);
    }
  }

  private static verifyDownload(filepath: string): boolean {
    try {
      if (!fs.existsSync(filepath)) {
        // Check for alternative extensions
        const alternatives = [
          filepath.replace('.mp4', '.webm'),
          filepath.replace('.mp4', '.mkv'),
          filepath.replace('.mp3', '.m4a'),
          filepath.replace('.mp3', '.webm')
        ];
        
        for (const alt of alternatives) {
          if (fs.existsSync(alt)) {
            // Rename to expected extension
            fs.renameSync(alt, filepath);
            break;
          }
        }
      }
      
      if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        return stats.size > 1000; // At least 1KB
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  private static cleanup(filepath: string): void {
    try {
      const extensions = ['.mp4', '.webm', '.mkv', '.mp3', '.m4a', '.part', '.tmp'];
      const basePath = filepath.replace(path.extname(filepath), '');
      
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
  static async getMetadata(url: string): Promise<VideoMetadata | null> {
    const platform = this.detectPlatform(url);
    
    // Try to get metadata for all platforms now
    
    try {
      // Only try metadata for working platforms
      const command = `yt-dlp --dump-json --no-download --no-warnings --socket-timeout 20 "${url}"`;
      console.log(`Getting metadata for ${platform}...`);
      const { stdout } = await execAsync(command, { timeout: 25000 });
      const data = JSON.parse(stdout.trim());
      
      // Extract best thumbnail
      let thumbnail = null;
      if (data.thumbnails && Array.isArray(data.thumbnails)) {
        const validThumbnails = data.thumbnails.filter(t => t.url && t.width);
        if (validThumbnails.length > 0) {
          thumbnail = validThumbnails.sort((a, b) => (b.width || 0) - (a.width || 0))[0].url;
        }
      } else if (data.thumbnail) {
        thumbnail = data.thumbnail;
      }
      
      return {
        title: data.title || data.alt_title || `${platform} Video`,
        uploader: data.uploader || data.channel || data.creator || `${platform} User`,
        thumbnail: thumbnail,
        duration: this.formatDuration(data.duration),
        durationSeconds: data.duration || 0,
        platform: platform,
        viewCount: data.view_count || null,
        uploadDate: data.upload_date || null
      };
      
    } catch (error) {
      console.log(`Failed to get metadata for ${platform}: ${error.message}`);
      
      // Return basic metadata
      return {
        title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Video`,
        uploader: `${platform.charAt(0).toUpperCase() + platform.slice(1)} User`,
        thumbnail: null,
        duration: "Durée inconnue",
        durationSeconds: 0,
        platform: platform,
        viewCount: null,
        uploadDate: null
      };
    }
  }

  private static formatDuration(seconds: number | null): string {
    if (!seconds || seconds === 0) return "Durée inconnue";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }
}