import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function downloadFacebookVideo(url: string, type: 'video' | 'audio', quality: string, outputPath: string): Promise<boolean> {
  console.log(`Attempting Facebook download: ${url}`);
  
  const strategies = [
    {
      name: "Strategy 1: Direct Facebook extractor",
      command: type === 'video'
        ? `yt-dlp --no-playlist --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" --referer "https://www.facebook.com/" -f "worst/best" --max-filesize 100M -o "${outputPath}" "${url}"`
        : `yt-dlp --no-playlist --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" --referer "https://www.facebook.com/" -x --audio-format mp3 --audio-quality 128 --max-filesize 60M -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${url}"`
    },
    {
      name: "Strategy 2: Generic extractor fallback",
      command: type === 'video'
        ? `yt-dlp --force-generic-extractor --no-playlist --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15" -f "worst" --max-filesize 80M -o "${outputPath}" "${url}"`
        : `yt-dlp --force-generic-extractor --no-playlist --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15" -x --audio-format mp3 --audio-quality 96 --max-filesize 40M -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${url}"`
    }
  ];

  for (const strategy of strategies) {
    try {
      console.log(`Trying ${strategy.name}...`);
      await execAsync(strategy.command, { timeout: 120000 });
      console.log(`${strategy.name} succeeded!`);
      return true;
    } catch (error) {
      console.log(`${strategy.name} failed: ${error.message}`);
      continue;
    }
  }

  console.log("All Facebook strategies failed");
  throw new Error("Facebook a bloqué ce contenu ou la vidéo n'est pas disponible publiquement. Facebook impose des restrictions strictes sur le téléchargement de contenu.");
}