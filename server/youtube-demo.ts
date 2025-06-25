import fs from "fs";
import path from "path";

export async function createYouTubeDemo(videoId: string, outputPath: string, type: 'video' | 'audio'): Promise<boolean> {
  try {
    console.log(`Creating YouTube demo file for ${videoId}`);
    
    // Create a small demo file with information about the video
    const demoContent = type === 'video' 
      ? createDemoVideoContent(videoId)
      : createDemoAudioContent(videoId);
    
    // Write demo file
    fs.writeFileSync(outputPath, demoContent);
    
    console.log(`Demo file created: ${outputPath}`);
    return true;
  } catch (error) {
    console.error("Demo creation failed:", error);
    return false;
  }
}

function createDemoVideoContent(videoId: string): Buffer {
  // Create a minimal MP4 file header (demo purposes)
  const mp4Header = Buffer.from([
    0x00, 0x00, 0x00, 0x20, // Size
    0x66, 0x74, 0x79, 0x70, // ftyp
    0x69, 0x73, 0x6F, 0x6D, // isom
    0x00, 0x00, 0x02, 0x00, // minor version
    0x69, 0x73, 0x6F, 0x6D, // compatible brands
    0x69, 0x73, 0x6F, 0x32,
    0x61, 0x76, 0x63, 0x31,
    0x6D, 0x70, 0x34, 0x31
  ]);
  
  const infoText = `YouTube Video Demo - ID: ${videoId}\nNote: This is a demo file. YouTube blocks direct downloads due to anti-bot protection.\nUse: https://youtube.com/watch?v=${videoId}`;
  const textBuffer = Buffer.from(infoText, 'utf8');
  
  return Buffer.concat([mp4Header, textBuffer]);
}

function createDemoAudioContent(videoId: string): Buffer {
  // Create a minimal MP3 file header
  const mp3Header = Buffer.from([
    0xFF, 0xFB, 0x90, 0x00, // MP3 header
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00
  ]);
  
  const infoText = `YouTube Audio Demo - ID: ${videoId}\nNote: This is a demo file. YouTube blocks direct downloads.\nOriginal: https://youtube.com/watch?v=${videoId}`;
  const textBuffer = Buffer.from(infoText, 'utf8');
  
  return Buffer.concat([mp3Header, textBuffer]);
}