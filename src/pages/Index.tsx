
import React, { useState, useEffect } from 'react';
import { Download, Zap, Shield, Globe } from 'lucide-react';
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

  const handleDownload = (url: string, type: 'video' | 'audio') => {
    // Simulate download process
    const newDownload: Download = {
      id: Date.now().toString(),
      url,
      title: `Downloaded ${type} from ${detectPlatform(url) || 'unknown platform'}`,
      platform: detectPlatform(url) || 'unknown',
      type,
      timestamp: new Date(),
    };

    setDownloads(prev => {
      const updated = [newDownload, ...prev].slice(0, 10); // Keep only last 10
      localStorage.setItem('mediasync-downloads', JSON.stringify(updated));
      return updated;
    });

    toast({
      title: "Download started!",
      description: `Your ${type} download will begin shortly.`,
    });
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
            Fast, free, and secure downloads from YouTube, Instagram, TikTok, Facebook, X and more
          </p>
          
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
        <div className="max-w-2xl mx-auto animate-fade-in">
          <RecentDownloads 
            downloads={downloads} 
            onClearHistory={handleClearHistory}
          />
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
