# MediaSync - Video & Audio Downloader Application

## Overview

MediaSync is a modern web application that allows users to download videos and audio from various social media platforms including YouTube, Instagram, TikTok, Facebook, Twitter, and Twitch. The application features a React frontend with a glassmorphism design, an Express.js backend, and PostgreSQL database integration using Drizzle ORM.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: React Router DOM for client-side navigation
- **Design System**: Glassmorphism design with dark/light theme support

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: Connect-pg-simple for PostgreSQL session storage
- **Development**: Hot reloading with Vite middleware integration
- **Deployment**: Autoscale deployment target on Replit

### Data Storage
- **Primary Database**: PostgreSQL (via Neon serverless)
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Session Storage**: PostgreSQL-backed sessions
- **Local Storage**: Browser localStorage for user preferences and download history

## Key Components

### Frontend Components
1. **DownloadForm**: Main form for URL input with platform detection and quality selection
2. **RecentDownloads**: Displays user's download history with re-download functionality
3. **SupportChat**: Integrated chat widget for user support
4. **ThemeToggle**: Dark/light mode switcher with smooth animations
5. **UI Components**: Comprehensive set of Shadcn/ui components (buttons, forms, dialogs, etc.)

### Backend Components
1. **Storage Interface**: Abstracted storage layer with in-memory implementation
2. **Route Handlers**: Express.js routes with proper error handling
3. **Vite Integration**: Development server with HMR support
4. **Database Schema**: User management schema with Drizzle ORM

### Database Schema
```typescript
users = {
  id: serial (primary key)
  username: text (unique, not null)
  password: text (not null)
}
```

## Data Flow

1. **User Input**: User pastes media URL into DownloadForm
2. **Platform Detection**: Frontend automatically detects platform and content type
3. **Quality Selection**: User selects desired video/audio quality
4. **Download Request**: Form submission triggers download process
5. **History Storage**: Successful downloads are stored in localStorage
6. **Recent Downloads**: Users can view and re-download from history

## External Dependencies

### Frontend Dependencies
- **UI Framework**: React, React Router DOM
- **UI Components**: Radix UI primitives, Shadcn/ui components
- **Styling**: Tailwind CSS, class-variance-authority, clsx
- **State Management**: TanStack React Query
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Utilities**: date-fns, embla-carousel-react

### Backend Dependencies
- **Server Framework**: Express.js
- **Database**: Drizzle ORM, @neondatabase/serverless
- **Session Management**: connect-pg-simple
- **Development**: tsx for TypeScript execution
- **Build Tools**: esbuild for production builds

### Development Tools
- **TypeScript**: Full type safety across frontend and backend
- **Vite**: Fast development server with HMR
- **ESBuild**: Fast production builds
- **Drizzle Kit**: Database migrations and schema management

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js 20 with web and PostgreSQL modules
- **Database**: PostgreSQL 16 provided by Replit
- **Development Server**: Runs on port 5000 with Vite HMR
- **Hot Reloading**: Full-stack hot reloading enabled

### Production Deployment
- **Build Process**: Vite builds frontend, esbuild bundles backend
- **Deployment Target**: Autoscale deployment on Replit
- **Static Assets**: Frontend built to `dist/public` directory
- **Server Bundle**: Backend bundled to `dist/index.js`
- **Environment Variables**: DATABASE_URL required for PostgreSQL connection

### Database Management
- **Schema**: Defined in `shared/schema.ts` using Drizzle ORM
- **Migrations**: Generated to `./migrations` directory
- **Connection**: Uses Neon serverless PostgreSQL adapter
- **Development**: `npm run db:push` for schema synchronization

## Changelog

- June 23, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.