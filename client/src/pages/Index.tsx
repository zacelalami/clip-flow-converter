
import React, { useState, useEffect } from 'react';
import { Download, Zap, Shield, Globe, Star, Users, Clock } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import DownloadForm from '@/components/DownloadForm';
import RecentDownloads from '@/components/RecentDownloads';
import SupportChat from '@/components/SupportChat';
import { useToast } from '@/hooks/use-toast';

interface Download {
  id: string;
  url: string;
  title: string;
  platform: string;
  type: 'video' | 'audio';
  quality?: string;
  timestamp: Date;
  thumbnail?: string;
}

const Index = () => {
  const [isDark, setIsDark] = useState(false);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Check system preference for dark mode
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
    
    // Load saved downloads from localStorage
    const savedDownloads = localStorage.getItem('mediasync-downloads');
    if (savedDownloads) {
      const parsed = JSON.parse(savedDownloads);
      setDownloads(parsed.map((d: any) => ({ ...d, timestamp: new Date(d.timestamp) })));
    }
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleDownload = async (url: string, type: 'video' | 'audio', quality?: string) => {
    try {
      // Detect content type for better naming
      const getContentType = (url: string) => {
        if (/instagram\.com\/reel/i.test(url)) return 'Instagram Reel';
        if (/instagram\.com\/p\//i.test(url)) return 'Instagram Post';
        if (/tiktok\.com/i.test(url)) return 'TikTok Video';
        if (/youtube\.com\/shorts/i.test(url)) return 'YouTube Short';
        return `${detectPlatform(url) || 'Video'} content`;
      };

      const contentType = getContentType(url);
      const platform = detectPlatform(url);
      
      // Create a blob URL for demonstration (in a real app, this would be actual media content)
      const filename = `${contentType.replace(/\s+/g, '_')}_${Date.now()}.${type === 'video' ? 'mp4' : 'mp3'}`;
      
      // For demo purposes, create a text file with the URL info
      // In a real implementation, this would be the actual video/audio file
      const demoContent = `MediaSync Download\n\nOriginal URL: ${url}\nPlatform: ${platform}\nType: ${type}\nQuality: ${quality}\nDownloaded: ${new Date().toISOString()}`;
      const blob = new Blob([demoContent], { type: 'text/plain' });
      const downloadUrl = URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
      
      // Add to download history
      const newDownload: Download = {
        id: Date.now().toString(),
        url,
        title: `Downloaded ${type} from ${contentType}${quality ? ` (${quality})` : ''}`,
        platform: platform || 'unknown',
        type,
        quality,
        timestamp: new Date(),
      };

      setDownloads(prev => {
        const updated = [newDownload, ...prev].slice(0, 10); // Keep only last 10
        localStorage.setItem('mediasync-downloads', JSON.stringify(updated));
        return updated;
      });

      toast({
        title: "Download completed!",
        description: `Your ${type} has been downloaded to your Downloads folder.`,
      });
      
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "There was an error downloading the file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const detectPlatform = (url: string) => {
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
    return null;
  };

  const handleClearHistory = () => {
    setDownloads([]);
    localStorage.removeItem('mediasync-downloads');
    toast({
      title: "History cleared",
      description: "Your download history has been cleared.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/60 rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">MediaSync</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Download Videos & MP3s
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Fast, free, and secure downloads from YouTube, Instagram Reels, TikTok, Facebook, X and more
          </p>
          
          {/* Supported Platforms */}
          <div className="flex justify-center items-center gap-6 mb-12 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 dark:bg-red-900/20">
              <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span className="font-medium text-red-600">YouTube</span>
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="url(#instagram-gradient)">
                <defs>
                  <linearGradient id="instagram-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#405DE6" />
                    <stop offset="25%" stopColor="#5851DB" />
                    <stop offset="50%" stopColor="#833AB4" />
                    <stop offset="75%" stopColor="#C13584" />
                    <stop offset="100%" stopColor="#E1306C" />
                  </linearGradient>
                </defs>
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span className="font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Instagram</span>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black dark:bg-gray-800">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
              </svg>
              <span className="font-medium text-black dark:text-white">TikTok</span>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
              <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="font-medium text-blue-600">Facebook</span>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black dark:bg-gray-800">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span className="font-medium text-white">X (Twitter)</span>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-card/50 hover:bg-card transition-colors duration-300">
              <Zap className="w-8 h-8 text-primary" />
              <div className="text-left">
                <h3 className="font-semibold">Lightning Fast</h3>
                <p className="text-sm text-muted-foreground">Download in seconds</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-card/50 hover:bg-card transition-colors duration-300">
              <Shield className="w-8 h-8 text-primary" />
              <div className="text-left">
                <h3 className="font-semibold">100% Secure</h3>
                <p className="text-sm text-muted-foreground">Safe and private</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-card/50 hover:bg-card transition-colors duration-300">
              <Globe className="w-8 h-8 text-primary" />
              <div className="text-left">
                <h3 className="font-semibold">All Platforms</h3>
                <p className="text-sm text-muted-foreground">Universal support</p>
              </div>
            </div>
          </div>
        </div>

        {/* Download Form */}
        <div className="mb-16 animate-slide-up">
          <DownloadForm onDownload={handleDownload} />
        </div>

        {/* Recent Downloads */}
        <div className="max-w-2xl mx-auto mb-16 animate-fade-in">
          <RecentDownloads 
            downloads={downloads} 
            onClearHistory={handleClearHistory}
          />
        </div>

        {/* Why Choose Us Section */}
        <div className="mb-16 animate-fade-in">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose MediaSync?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Experience the fastest, most reliable way to download your favorite content from any platform
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="text-center p-6 rounded-xl bg-card/50 hover:bg-card transition-all duration-300 hover:shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Ultra Fast Downloads</h3>
              <p className="text-muted-foreground">
                Download videos and audio in seconds with our optimized servers and lightning-fast processing
              </p>
            </div>

            <div className="text-center p-6 rounded-xl bg-card/50 hover:bg-card transition-all duration-300 hover:shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">100% Safe & Secure</h3>
              <p className="text-muted-foreground">
                Your privacy is our priority. No registration required, no data stored, completely anonymous
              </p>
            </div>

            <div className="text-center p-6 rounded-xl bg-card/50 hover:bg-card transition-all duration-300 hover:shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Universal Platform Support</h3>
              <p className="text-muted-foreground">
                Works with YouTube, Instagram, TikTok, Facebook, Twitter and many more platforms
              </p>
            </div>

            <div className="text-center p-6 rounded-xl bg-card/50 hover:bg-card transition-all duration-300 hover:shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">High Quality Output</h3>
              <p className="text-muted-foreground">
                Download in multiple formats and resolutions, from 720p to 4K, MP3 to FLAC audio
              </p>
            </div>

            <div className="text-center p-6 rounded-xl bg-card/50 hover:bg-card transition-all duration-300 hover:shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Trusted by Millions</h3>
              <p className="text-muted-foreground">
                Join over 10 million users worldwide who trust MediaSync for their download needs
              </p>
            </div>

            <div className="text-center p-6 rounded-xl bg-card/50 hover:bg-card transition-all duration-300 hover:shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">24/7 Availability</h3>
              <p className="text-muted-foreground">
                Our service is always online and ready to help you download content anytime, anywhere
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-24">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-r from-primary to-primary/60 rounded flex items-center justify-center">
                <Download className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-medium">MediaSync</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Universal media downloader - Fast, free, and secure
            </p>
          </div>
        </div>
      </footer>

      {/* Support Chat */}
      <SupportChat />
    </div>
  );
};

export default Index;
