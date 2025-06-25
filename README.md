Social Media Video Downloader

A professional Node.js CLI tool for downloading Reel-style videos from multiple social media platforms using yt-dlp and Puppeteer.
Features

    🎥 Multi-Platform Support: Download videos from:
        YouTube (including Shorts)
        TikTok
        Instagram Reels
        Facebook Reels/Videos
        Twitter/X videos
    🔄 Automatic Platform Detection: Smart URL pattern matching
    📱 Original Quality: Downloads in highest available resolution and preserves metadata
    🍪 Authentication Support: Cookie-based login for private content
    🛡️ Smart Error Handling: Detects platform restrictions and provides helpful suggestions
    📊 Rich Metadata: Displays video information, file size, and technical details
    🎨 Beautiful CLI: Colored output with progress indicators and timestamps
    ⚡ Auto-Installation: Automatically downloads and configures yt-dlp binary
    🔧 Flexible Options: Customizable output directory, quality settings, and verbose logging

Requirements

    Node.js 20+ (automatically configured in Replit)
    Python 3.11+ (automatically installed for yt-dlp)
    Internet connection for downloads

Installation
Option 1: Clone Repository

git clone <repository-url>
cd social-media-downloader
npm install

Option 2: Manual Setup

    Create project directory and navigate to it
    Install dependencies:

npm install puppeteer@24.10.2 commander@14.0.0 chalk@4.1.2

    Copy the source code files to your project directory

Usage
Basic Usage

Download a video from any supported platform:

node index.js "https://www.youtube.com/watch?v=VIDEO_ID"

Advanced Options

# Specify output directory
node index.js "https://www.youtube.com/watch?v=VIDEO_ID" --output ./my-videos

# Use cookies for private content
node index.js "https://instagram.com/reel/REEL_ID" --cookies ./cookies.txt

# Set video quality preference
node index.js "https://www.youtube.com/watch?v=VIDEO_ID" --quality best

# Enable verbose logging
node index.js "https://www.youtube.com/watch?v=VIDEO_ID" --verbose

# Skip metadata files
node index.js "https://www.youtube.com/watch?v=VIDEO_ID" --no-metadata

Complete Command Reference

Usage: social-media-downloader [options] <url>

Arguments:
  url                      Social media video URL to download

Options:
  -V, --version            output the version number
  -o, --output <path>      Output directory (default: "./downloads")
  -c, --cookies <file>     Path to cookies file for authentication
  -q, --quality <quality>  Video quality preference (best/worst/format) (default: "best")
  --no-metadata            Skip saving metadata
  --verbose                Enable verbose logging
  -h, --help               display help for command

Platform-Specific Notes
YouTube & YouTube Shorts

    Works directly with yt-dlp
    Supports all quality options
    Downloads metadata, thumbnails, and descriptions

TikTok

    Works directly with yt-dlp
    No authentication required for public videos
    Original audio and video quality preserved

Instagram Reels

    Uses Puppeteer to bypass restrictions
    Requires cookies for most content
    See cookie setup instructions below

Facebook Videos/Reels

    Uses Puppeteer to bypass restrictions
    Requires cookies for most content
    See cookie setup instructions below

Twitter/X Videos

    Works directly with yt-dlp
    No authentication required for public videos

Cookie Setup for Instagram/Facebook

For Instagram and Facebook downloads, you need to provide authentication cookies:
Method 1: Browser Extension (Recommended)

    Install "cookies.txt" extension for your browser
    Go to Instagram/Facebook and log in
    Visit the video page you want to download
    Click the extension icon and export cookies
    Save the file and use with --cookies option

Method 2: Developer Tools

    Open Instagram/Facebook and log in
    Open Browser Developer Tools (F12)
    Go to Application > Storage > Cookies
    Copy all cookies for the domain
    Save in Netscape format as cookies.txt

Example Cookie Usage

node index.js "https://instagram.com/reel/ABC123" --cookies ./instagram-cookies.txt

Error Handling

The tool provides detailed error messages for common issues:
Platform Blocked (403 Error)

⚠️  Platform Restrictions Detected:
This platform may block automated downloads.
Suggestions:
• Try using cookies with --cookies option
• Use supported platforms when possible
• Check if the video is publicly accessible

Network Issues

🌐 Network Issue:
• Check your internet connection
• Verify the URL is accessible
• Try again in a few moments

Output Structure

Downloaded files are organized as follows:

downloads/
├── youtube_VideoTitle_VideoID.mp4          # Main video file
├── youtube_VideoTitle_VideoID.info.json    # Metadata
├── youtube_VideoTitle_VideoID.description  # Video description
└── youtube_VideoTitle_VideoID.webp         # Thumbnail

Technical Details
Architecture

    CLI Layer: Commander.js for argument parsing
    Detection Layer: URL pattern matching for platform identification
    Download Layer: yt-dlp for most platforms, Puppeteer for restricted ones
    Utility Layer: Logging, file management, cookie handling

Quality Options

    best: Highest quality up to 1080p (default)
    worst: Lowest available quality
    audio: Audio-only download
    Custom format strings supported

Supported File Formats

The tool downloads videos in their original format:

    MP4 (most common)
    WebM
    MKV
    AVI
    MOV
    FLV

Troubleshooting
yt-dlp Installation Issues

The tool automatically downloads yt-dlp. If issues occur:

    Check internet connection
    Ensure Python 3.11+ is installed
    Try running with --verbose for detailed logs

Puppeteer Issues

For Instagram/Facebook downloads using Puppeteer:

    Ensure cookies are fresh (logged in recently)
    Use correct cookie format (Netscape or JSON)
    Check if the video is publicly accessible

Permission Errors

If you get permission errors:

    Check output directory write permissions
    Ensure yt-dlp binary has execute permissions
    Try running with administrator/sudo if needed

Development
Project Structure

src/
├── cli.js                    # Main CLI interface
├── platformDetector.js       # URL pattern matching
├── downloaders/
│   ├── ytdlpDownloader.js    # yt-dlp integration
│   └── puppeteerDownloader.js # Puppeteer browser automation
└── utils/
    ├── logger.js             # Colored logging
    ├── fileManager.js        # File operations
    ├── cookieManager.js      # Cookie parsing
    └── ytdlpManager.js       # yt-dlp binary management

Adding New Platforms

    Add URL patterns to platformDetector.js
    Choose appropriate downloader (yt-dlp or Puppeteer)
    Add platform-specific extraction logic if using Puppeteer

License

This project is for educational and personal use. Respect platform terms of service and copyright laws when downloading content.
Contributing

    Fork the repository
    Create a feature branch
    Make your changes
    Test thoroughly
    Submit a pull request

Support

For issues and questions:

    Check the troubleshooting section
    Enable verbose logging with --verbose
    Check that all dependencies are properly installed
    Ensure you have the latest version of the tool
