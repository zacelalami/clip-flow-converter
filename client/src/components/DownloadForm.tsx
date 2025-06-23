
import React, { useState, useRef, useCallback } from 'react';
import { Download, Link, Music, Video, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface DownloadFormProps {
  onDownload: (url: string, type: 'video' | 'audio', quality?: string) => void;
}

const DownloadForm: React.FC<DownloadFormProps> = ({ onDownload }) => {
  const [url, setUrl] = useState('');
  const [downloadType, setDownloadType] = useState<'video' | 'audio'>('video');
  const [videoQuality, setVideoQuality] = useState('720p');
  const [audioQuality, setAudioQuality] = useState('320kbps');
  const [isDragOver, setIsDragOver] = useState(false);
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);
  const [detectedContentType, setDetectedContentType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const detectPlatform = (url: string) => {
    const platforms = {
      youtube: /(?:youtube\.com|youtu\.be)/i,
      instagram: /instagram\.com/i,
      tiktok: /tiktok\.com/i,
      facebook: /facebook\.com|fb\.watch/i,
      twitter: /twitter\.com|x\.com/i,
      twitch: /twitch\.tv/i,
    };

    // Detect specific content types
    if (/instagram\.com\/reel/i.test(url)) {
      setDetectedContentType('Instagram Reel');
    } else if (/instagram\.com\/p\//i.test(url)) {
      setDetectedContentType('Instagram Post');
    } else if (/tiktok\.com/i.test(url)) {
      setDetectedContentType('TikTok Video');
    } else if (/youtube\.com\/shorts/i.test(url)) {
      setDetectedContentType('YouTube Short');
    } else {
      setDetectedContentType(null);
    }

    for (const [platform, regex] of Object.entries(platforms)) {
      if (regex.test(url)) {
        return platform;
      }
    }
    return null;
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setDetectedPlatform(detectPlatform(value));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedText = e.dataTransfer.getData('text');
    if (droppedText) {
      handleUrlChange(droppedText);
      toast({
        title: "URL detected!",
        description: "Dropped URL has been added to the input field.",
      });
    }
  }, [toast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a valid URL from any supported platform.",
        variant: "destructive",
      });
      return;
    }

    const quality = downloadType === 'video' ? videoQuality : audioQuality;
    onDownload(url, downloadType, quality);
  };

  const platformColors = {
    youtube: 'bg-red-500',
    instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
    tiktok: 'bg-black',
    facebook: 'bg-blue-600',
    twitter: 'bg-black',
    twitch: 'bg-purple-600',
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Tabs defaultValue="video" onValueChange={(value) => setDownloadType(value as 'video' | 'audio')}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="video" className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Video Download
          </TabsTrigger>
          <TabsTrigger value="audio" className="flex items-center gap-2">
            <Music className="w-4 h-4" />
            MP3 Download
          </TabsTrigger>
        </TabsList>

        <TabsContent value="video" className="space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">Download Videos</h2>
            <p className="text-muted-foreground">
              Téléchargez des vidéos depuis Instagram Reels, TikTok, Facebook, X et plus
            </p>
          </div>
          <div className="flex justify-center">
            <Select value={videoQuality} onValueChange={setVideoQuality}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select video quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                <SelectItem value="720p">720p (HD)</SelectItem>
                <SelectItem value="480p">480p (SD)</SelectItem>
                <SelectItem value="360p">360p</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent value="audio" className="space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">Download MP3s</h2>
            <p className="text-muted-foreground">
              Extract high-quality audio and download as MP3 from any video platform
            </p>
          </div>
          <div className="flex justify-center">
            <Select value={audioQuality} onValueChange={setAudioQuality}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select audio quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="320kbps">320kbps (High Quality)</SelectItem>
                <SelectItem value="256kbps">256kbps</SelectItem>
                <SelectItem value="192kbps">192kbps</SelectItem>
                <SelectItem value="128kbps">128kbps</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>
      </Tabs>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div 
          className={`relative transition-all duration-300 ${
            isDragOver ? 'drag-over' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="relative">
            <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              type="url"
              placeholder="Paste any video URL here (Instagram Reels, TikTok, YouTube, etc.) or drag and drop..."
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="pl-12 pr-12 h-14 text-lg rounded-2xl border-2 transition-all duration-300 focus:ring-2 focus:ring-primary/20"
            />
            {url && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setUrl('');
                  setDetectedPlatform(null);
                  setDetectedContentType(null);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {isDragOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-2xl border-2 border-dashed border-primary">
              <div className="text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-primary font-medium">Drop URL here</p>
              </div>
            </div>
          )}
        </div>

        {(detectedPlatform || detectedContentType) && (
          <div className="flex items-center justify-center gap-2">
            {detectedPlatform && (
              <Badge 
                variant="secondary" 
                className={`${platformColors[detectedPlatform as keyof typeof platformColors]} text-white border-0 animate-fade-in`}
              >
                {detectedPlatform.charAt(0).toUpperCase() + detectedPlatform.slice(1)} detected
              </Badge>
            )}
            {detectedContentType && (
              <Badge variant="outline" className="animate-fade-in">
                {detectedContentType}
              </Badge>
            )}
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full h-14 text-lg rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 transform hover:scale-[1.02] animate-pulse-glow"
          disabled={!url.trim()}
        >
          <Download className="w-5 h-5 mr-2" />
          Download {downloadType === 'video' ? `Video (${videoQuality})` : `MP3 (${audioQuality})`}
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground space-y-2">
        <p>Supporté: Instagram Reels & Posts, TikTok, Facebook, X (Twitter), Twitch</p>
        <p className="text-xs">Parfait pour télécharger des Instagram Reels, vidéos TikTok, et convertir en MP3</p>
        <div className="flex flex-wrap justify-center gap-2 mt-3">
          <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
            ✓ Instagram Reels
          </span>
          <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
            ✓ TikTok Videos
          </span>
          <span className="text-xs bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 px-2 py-1 rounded-full">
            ✗ YouTube (temporairement bloqué)
          </span>
        </div>
      </div>
    </div>
  );
};

export default DownloadForm;
