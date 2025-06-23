import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface VideoInfo {
  title: string;
  duration: string;
  durationSeconds: number;
  thumbnail: string | null;
  uploader: string;
  platform: string;
  viewCount: number | null;
  uploadDate: string | null;
}

export async function getVideoInfo(url: string): Promise<VideoInfo | null> {
  const cleanUrl = url.trim();
  const platform = detectPlatform(cleanUrl);
  
  console.log(`Getting info for ${platform}: ${cleanUrl}`);
  
  // Platform-specific info extraction strategies
  const strategies = [];
  
  if (platform === 'youtube') {
    // YouTube oEmbed API first
    strategies.push({
      name: 'YouTube oEmbed',
      type: 'api',
      exec: async () => {
        const oembedUrl = `https://youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`;
        const response = await fetch(oembedUrl);
        if (response.ok) {
          const data = await response.json();
          return {
            title: data.title,
            uploader: data.author_name,
            thumbnail: data.thumbnail_url,
            duration: "Durée inconnue",
            durationSeconds: 0,
            platform: 'youtube',
            viewCount: null,
            uploadDate: null
          };
        }
        throw new Error('oEmbed failed');
      }
    });
  }
  
  if (platform === 'facebook') {
    strategies.push({
      name: 'Facebook oEmbed',
      type: 'api',
      exec: async () => {
        try {
          // Try multiple Facebook oEmbed endpoints
          const oembedUrls = [
            `https://www.facebook.com/plugins/video/oembed.json/?url=${encodeURIComponent(cleanUrl)}`,
            `https://graph.facebook.com/v19.0/oembed_video?url=${encodeURIComponent(cleanUrl)}`
          ];
          
          for (const oembedUrl of oembedUrls) {
            try {
              const response = await fetch(oembedUrl);
              if (response.ok) {
                const data = await response.json();
                
                // Extract thumbnail from HTML if available
                let thumbnail = data.thumbnail_url;
                if (!thumbnail && data.html) {
                  const thumbnailMatch = data.html.match(/src="([^"]*\.jpg[^"]*)"/);
                  if (thumbnailMatch) {
                    thumbnail = thumbnailMatch[1];
                  }
                }
                
                return {
                  title: data.title || "Vidéo Facebook",
                  uploader: data.author_name || "Facebook User",
                  thumbnail: thumbnail || null,
                  duration: "Durée inconnue",
                  durationSeconds: 0,
                  platform: 'facebook',
                  viewCount: null,
                  uploadDate: null
                };
              }
            } catch (apiError) {
              console.log(`Facebook API ${oembedUrl} failed:`, apiError.message);
              continue;
            }
          }
        } catch (error) {
          console.log('All Facebook oEmbed attempts failed');
        }
        
        // Fallback to basic info
        return {
          title: "Vidéo Facebook",
          uploader: "Facebook User",
          thumbnail: null,
          duration: "Durée inconnue",
          durationSeconds: 0,
          platform: 'facebook',
          viewCount: null,
          uploadDate: null
        };
      }
    });
  }
  
  if (platform === 'instagram') {
    strategies.push({
      name: 'Instagram enhanced info',
      type: 'api',
      exec: async () => {
        // Extract username from URL if possible
        const usernameMatch = cleanUrl.match(/instagram\.com\/([^\/]+)/);
        const username = usernameMatch ? usernameMatch[1] : "Instagram User";
        
        return {
          title: cleanUrl.includes('/reel/') ? "Instagram Reel" : "Instagram Post",
          uploader: `@${username}`,
          thumbnail: null,
          duration: "Durée inconnue",
          durationSeconds: 0,
          platform: 'instagram',
          viewCount: null,
          uploadDate: null
        };
      }
    });
  }
  
  if (platform === 'tiktok') {
    strategies.push({
      name: 'TikTok oEmbed',
      type: 'api',
      exec: async () => {
        try {
          const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(cleanUrl)}`;
          const response = await fetch(oembedUrl);
          if (response.ok) {
            const data = await response.json();
            return {
              title: data.title || "TikTok Video",
              uploader: data.author_name || "TikTok User",
              thumbnail: data.thumbnail_url || null,
              duration: "Durée inconnue",
              durationSeconds: 0,
              platform: 'tiktok',
              viewCount: null,
              uploadDate: null
            };
          }
        } catch (error) {
          console.log('TikTok oEmbed failed');
        }
        
        // Fallback to basic info
        return {
          title: "TikTok Video",
          uploader: "TikTok User",
          thumbnail: null,
          duration: "Durée inconnue",
          durationSeconds: 0,
          platform: 'tiktok',
          viewCount: null,
          uploadDate: null
        };
      }
    });
  }
  
  if (platform === 'twitter') {
    strategies.push({
      name: 'Twitter/X basic info',
      type: 'api',
      exec: async () => {
        return {
          title: "Tweet Video",
          uploader: "Twitter User",
          thumbnail: null,
          duration: "Durée inconnue",
          durationSeconds: 0,
          platform: 'twitter',
          viewCount: null,
          uploadDate: null
        };
      }
    });
  }
  
  if (platform === 'twitch') {
    strategies.push({
      name: 'Twitch basic info',
      type: 'api',
      exec: async () => {
        return {
          title: "Twitch Video",
          uploader: "Twitch User",
          thumbnail: null,
          duration: "Durée inconnue",
          durationSeconds: 0,
          platform: 'twitch',
          viewCount: null,
          uploadDate: null
        };
      }
    });
  }
  
  // Add yt-dlp fallback for all platforms
  strategies.push({
    name: 'yt-dlp info extraction',
    type: 'ytdlp',
    exec: async () => {
      const commands = [
        `yt-dlp --dump-json --no-download --quiet --no-warnings "${cleanUrl}"`,
        `yt-dlp --dump-json --no-download --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" --quiet --no-warnings "${cleanUrl}"`,
        `yt-dlp --dump-json --no-download --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15" --quiet --no-warnings "${cleanUrl}"`
      ];
      
      for (const command of commands) {
        try {
          const { stdout } = await execAsync(command, { timeout: 20000 });
          const info = JSON.parse(stdout);
          
          return {
            title: info.title || `${platform.charAt(0).toUpperCase() + platform.slice(1)} Video`,
            uploader: info.uploader || info.channel || info.creator || `${platform.charAt(0).toUpperCase() + platform.slice(1)} User`,
            thumbnail: info.thumbnail || (info.thumbnails && info.thumbnails[0]?.url) || null,
            duration: formatDuration(info.duration),
            durationSeconds: info.duration || 0,
            platform: platform,
            viewCount: info.view_count || null,
            uploadDate: info.upload_date || null
          };
        } catch (error) {
          console.log(`yt-dlp command failed: ${error.message}`);
          continue;
        }
      }
      throw new Error('All yt-dlp commands failed');
    }
  });
  
  // Try each strategy
  for (const strategy of strategies) {
    try {
      console.log(`Trying ${strategy.name}...`);
      const result = await strategy.exec();
      console.log(`${strategy.name} succeeded!`);
      return result;
    } catch (error) {
      console.log(`${strategy.name} failed: ${error.message}`);
      continue;
    }
  }
  
  console.log("All info extraction strategies failed");
  return null;
}

function detectPlatform(url: string): string {
  const platforms = {
    youtube: /(?:youtube\.com|youtu\.be)/i,
    instagram: /instagram\.com/i,
    tiktok: /tiktok\.com/i,
    facebook: /facebook\.com|fb\.watch/i,
    twitter: /twitter\.com|x\.com/i,
    twitch: /twitch\.tv/i,
  };

  for (const [platform, regex] of Object.entries(platforms)) {
    if (regex.test(url)) {
      return platform;
    }
  }
  return 'unknown';
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "Durée inconnue";
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}