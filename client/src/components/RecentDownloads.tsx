
import React from 'react';
import { Clock, Download, Music, Video, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface RecentDownloadsProps {
  downloads: Download[];
  onClearHistory: () => void;
}

const RecentDownloads: React.FC<RecentDownloadsProps> = ({ downloads, onClearHistory }) => {
  const { toast } = useToast();

  const handleDownloadClick = async (download: Download) => {
    try {
      // Create a re-download with proper file handling
      const filename = `${download.title.replace(/\s+/g, '_')}_redownload_${Date.now()}.${download.type === 'video' ? 'mp4' : 'mp3'}`;
      
      // Create demo content for the re-download
      const demoContent = `MediaSync Re-Download\n\nOriginal URL: ${download.url}\nPlatform: ${download.platform}\nType: ${download.type}\nQuality: ${download.quality || 'default'}\nOriginal Download: ${download.timestamp.toISOString()}\nRe-downloaded: ${new Date().toISOString()}`;
      const blob = new Blob([demoContent], { type: 'text/plain' });
      const downloadUrl = URL.createObjectURL(blob);
      
      // Trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
      
      toast({
        title: "Re-download completed!",
        description: `${download.title} has been downloaded again.`,
      });
    } catch (error) {
      console.error('Re-download error:', error);
      toast({
        title: "Re-download failed",
        description: "There was an error re-downloading the file.",
        variant: "destructive",
      });
    }
  };

  if (downloads.length === 0) {
    return (
      <Card className="glassmorphism">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Downloads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No downloads yet</p>
            <p className="text-sm">Your download history will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Card className="glassmorphism">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Downloads
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearHistory}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Clear
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {downloads.map((download) => (
          <div
            key={download.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors duration-200"
          >
            <div className="flex-shrink-0">
              {download.type === 'video' ? (
                <Video className="w-5 h-5 text-blue-500" />
              ) : (
                <Music className="w-5 h-5 text-green-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{download.title}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {download.platform}
                </Badge>
                <span>{formatTimeAgo(download.timestamp)}</span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-shrink-0 hover:bg-primary/10 hover:text-primary transition-colors"
              onClick={() => handleDownloadClick(download)}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default RecentDownloads;
