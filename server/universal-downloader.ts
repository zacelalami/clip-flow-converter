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
  private static readonly TIMEOUT = 180000; // 3 minutes for complex bypasses
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

    // Last resort: provide helpful information for blocked platforms
    if (platform === 'instagram' || platform === 'facebook') {
      return {
        success: false,
        error: `${platform.charAt(0).toUpperCase() + platform.slice(1)} bloqué en production. Alternative: utilisez YouTube (vidéo+métadonnées) ou TikTok (stable). Pour ${platform}, essayez en local ou utilisez un VPN.`,
        platform: platform
      };
    } else if (platform === 'youtube' && type === 'audio') {
      return {
        success: false,
        error: "YouTube audio difficile en production due aux protections anti-bot. Alternative: téléchargez la vidéo et extrayez l'audio localement.",
        platform: platform
      };
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
        name: "YouTube Android Client",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --socket-timeout 15 --concurrent-fragments 4 --extractor-args "youtube:player_client=android" -f "18/mp4/worst" -o "${outputPath}" "${cleanUrl}"`
          : `yt-dlp ${baseOptions} --socket-timeout 45 --sleep-interval 1 --max-sleep-interval 3 --extractor-args "youtube:player_client=android,youtube:skip=dash,youtube:player_skip=configs" --no-check-certificate --ignore-errors --retries 3 -x --audio-format mp3 --audio-quality 128 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${cleanUrl}"`
      },
      {
        name: "YouTube Audio Stealth",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --socket-timeout 15 --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15" -f "18/mp4" -o "${outputPath}" "${cleanUrl}"`
          : `yt-dlp ${baseOptions} --socket-timeout 30 --sleep-interval 2 --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1" --add-header "Accept-Language:en-US,en;q=0.9" --no-check-certificate --ignore-errors -x --audio-format mp3 --audio-quality 96 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${cleanUrl}"`
      },
      {
        name: "YouTube Audio Legacy",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --socket-timeout 15 --extractor-args "youtube:player_client=web" -f "worst" -o "${outputPath}" "${cleanUrl}"`
          : `yt-dlp ${baseOptions} --socket-timeout 30 --sleep-interval 3 --extractor-args "youtube:player_client=web,youtube:skip=dash,youtube:player_skip=configs" --no-check-certificate --ignore-errors --legacy-server-connect -x --audio-format mp3 --audio-quality 64 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${cleanUrl}"`
      },
      {
        name: "YouTube Audio Embed",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --socket-timeout 15 --user-agent "Mozilla/5.0 (compatible; Googlebot/2.1)" -f "worst" -o "${outputPath}" "${cleanUrl}"`
          : `yt-dlp ${baseOptions} --socket-timeout 25 --user-agent "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" --referer "https://www.youtube.com/" --no-check-certificate --ignore-errors -x --audio-format mp3 --audio-quality 64 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${videoId ? `https://www.youtube.com/embed/${videoId}` : cleanUrl}"`
      }
    ];
  }

  private static getInstagramStrategies(url: string, type: 'video' | 'audio', quality: string, outputPath: string, baseOptions: string) {
    // Advanced Instagram bypass strategies
    const cleanUrl = url.replace(/\?.*$/, '').replace(/\/$/, '');
    
    return [
      {
        name: "Instagram Stealth Mode",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --socket-timeout 25 --sleep-interval 1 --max-sleep-interval 3 --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1" --add-header "Accept-Language:en-US,en;q=0.9" --add-header "Accept-Encoding:gzip, deflate, br" --referer "https://www.instagram.com/" -f "mp4/worst" --no-check-certificate --ignore-errors -o "${outputPath}" "${cleanUrl}"`
          : `yt-dlp ${baseOptions} --socket-timeout 25 --sleep-interval 1 --max-sleep-interval 3 --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15" --no-check-certificate --ignore-errors -x --audio-format mp3 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${cleanUrl}"`
      },
      {
        name: "Instagram Proxy Mode",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --socket-timeout 30 --sleep-interval 2 --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" --add-header "Sec-Fetch-Dest:document" --add-header "Sec-Fetch-Mode:navigate" --no-check-certificate --ignore-errors -f "mp4" -o "${outputPath}" "${cleanUrl}"`
          : `yt-dlp ${baseOptions} --socket-timeout 30 --sleep-interval 2 --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" --no-check-certificate --ignore-errors -x --audio-format mp3 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${cleanUrl}"`
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
    // Advanced Facebook bypass with URL conversion
    let cleanUrl = url.replace(/\?.*$/, '').replace(/\/$/, '');
    
    // Convert various Facebook URL formats
    if (cleanUrl.includes('/share/v/')) {
      const videoId = cleanUrl.match(/\/share\/v\/([^\/]+)/)?.[1];
      if (videoId) {
        cleanUrl = `https://www.facebook.com/watch/?v=${videoId}`;
      }
    } else if (cleanUrl.includes('/videos/')) {
      // Keep videos URL as is
    } else if (cleanUrl.includes('/reel/')) {
      // Keep reel URL as is  
    }
    
    return [
      {
        name: "Facebook Stealth Browser",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --socket-timeout 30 --sleep-interval 2 --max-sleep-interval 5 --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1" --add-header "Accept-Language:en-US,en;q=0.9" --add-header "Sec-Fetch-Site:none" --referer "https://www.facebook.com/" --no-check-certificate --ignore-errors -f "mp4/worst" -o "${outputPath}" "${cleanUrl}"`
          : `yt-dlp ${baseOptions} --socket-timeout 30 --sleep-interval 2 --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15" --no-check-certificate --ignore-errors -x --audio-format mp3 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${cleanUrl}"`
      },
      {
        name: "Facebook Graph API Emulation",
        command: type === 'video'
          ? `yt-dlp ${baseOptions} --socket-timeout 25 --user-agent "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)" --add-header "X-FB-Debug:1" --add-header "Accept:text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" --no-check-certificate --ignore-errors -f "mp4" -o "${outputPath}" "${cleanUrl}"`
          : `yt-dlp ${baseOptions} --socket-timeout 25 --user-agent "facebookexternalhit/1.1" --no-check-certificate --ignore-errors -x --audio-format mp3 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${cleanUrl}"`
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
      // Fast metadata extraction using the same strategies that work for downloads
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
      const cleanUrl = url.split('&list=')[0].split('&index=')[0];
      
      const strategies = [
        `yt-dlp --dump-json --no-download --no-warnings --socket-timeout 8 --extractor-args "youtube:player_client=android" "${cleanUrl}"`,
        `yt-dlp --dump-json --no-download --no-warnings --socket-timeout 8 --concurrent-fragments 2 --extractor-args "youtube:player_client=android" "${cleanUrl}"`,
        `yt-dlp --dump-json --no-download --no-warnings --socket-timeout 10 --user-agent "Mozilla/5.0 (Android 12; Mobile; rv:68.0) Gecko/68.0 Firefox/122.0" "${cleanUrl}"`
      ];
      
      for (const command of strategies) {
        try {
          console.log(`Getting metadata for ${platform} (fast strategy)...`);
          const { stdout } = await execAsync(command, { timeout: 12000 });
          const data = JSON.parse(stdout.trim());
          
          // Extract best thumbnail
          let thumbnail = null;
          if (data.thumbnails && Array.isArray(data.thumbnails)) {
            const validThumbnails = data.thumbnails.filter(t => t.url && t.width);
            if (validThumbnails.length > 0) {
              // Get medium quality thumbnail for faster loading
              const mediumThumbnail = validThumbnails.find(t => t.width >= 320 && t.width <= 640);
              thumbnail = mediumThumbnail ? mediumThumbnail.url : validThumbnails[0].url;
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
        } catch (strategyError) {
          console.log(`Metadata strategy failed: ${strategyError.message}`);
          continue;
        }
      }
      
      // Fallback if all strategies fail
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