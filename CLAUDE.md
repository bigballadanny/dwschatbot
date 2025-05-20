# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development Server
```bash
npm install          # Install dependencies
npm run dev          # Start development server on port 8080
npm start            # Alternative to npm run dev
```

### Building
```bash
npm run build        # Build for production
npm run build:dev    # Build with development mode (for debugging)
npm run preview      # Preview production build
```

### Code Quality
```bash
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript type checking
npm run check        # Run both typecheck and lint
```

Always run `npm run check` before committing code to ensure:
- No TypeScript errors
- No ESLint violations
- Code follows project standards

### Environment Variables
Create `.env.local` file with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
N8N_WEBHOOK_URL=your_n8n_webhook_url
```

### Supabase Functions
```bash
cd supabase/functions/gemini-chat
supabase functions deploy gemini-chat
```

### Database
```bash
supabase db push     # Run migrations
```

## Architecture Overview

### Core Stack
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **State Management**: React hooks + Tanstack Query
- **Backend**: Supabase (Auth + Database + Edge Functions)
- **Chat Processing**: n8n workflow (RAG-based responses)
- **Deployment**: Vite build system

### Data Flow
```
User Query → React Frontend → Supabase Edge Function → n8n Webhook → Database
                                                           ↓
                                                    RAG Processing
                                                           ↓
                                               Response → User Interface
```

### Key Directories
- `/src/components/` - React components (keep under 250 lines)
- `/src/hooks/` - Custom React hooks
- `/src/pages/` - Route-based page components
- `/supabase/functions/` - Edge functions (simplified to forward to n8n)
- `/n8n/workflows/` - n8n workflow definitions

### Important Files
- `src/hooks/useChat.ts` - Core chat functionality (~300 lines)
- `src/components/ChatInterface.tsx` - Main chat UI component
- `supabase/functions/gemini-chat/index.ts` - Simple n8n forwarder
- `n8n/workflows/WORKFLOW_N8N.json` - Main n8n workflow

## Working with this Codebase

### Recent Simplification
This project underwent major cleanup removing:
- Voice/audio features
- Vertex AI integration
- Analytics dashboard
- War Room page
- Complex edge functions

Current focus: Simple text chat interface powered by n8n workflow.

### Component Guidelines
- Target 200-250 lines max per component
- Single responsibility principle
- Always handle errors gracefully
- Use TypeScript interfaces for props

### Hook Pattern
- Use custom hooks for business logic
- Keep components focused on presentation
- Centralize state management in hooks

### n8n Integration
- Frontend calls `gemini-chat` edge function
- Edge function forwards to n8n webhook
- n8n handles RAG processing and database operations
- Responses flow back through the same path

### Database Schema
Key tables:
- `conversations` - Chat conversation metadata
- `messages` - Individual chat messages
- `transcripts` - Uploaded transcript files
- `embeddings` - Vector embeddings for RAG
- `error_logs` - System error tracking

### Auth Flow
- Supabase handles authentication
- Protected routes require authenticated user
- Admin users have additional permissions

### Testing
No automated tests currently configured. Manual testing process:
1. Start dev server: `npm run dev`
2. Test chat functionality
3. Verify n8n webhook integration
4. Check database operations

### Deployment
1. Build frontend: `npm run build`
2. Deploy edge functions: `supabase functions deploy`
3. Configure environment variables
4. Set up n8n workflow
5. Run database migrations

## Key Development Principles

1. **Simplicity First**: Remove complexity, keep only essentials
2. **Robustness**: Build reliable systems that fail gracefully
3. **n8n-Centric**: Let n8n handle complex RAG logic
4. **Component Size**: Keep components focused and under 250 lines
5. **Error Handling**: Always provide user feedback on errors

## Common Tasks

### Adding a New Feature
1. Plan with TodoWrite tool
2. Search codebase with Grep/Glob
3. Follow existing patterns
4. Test thoroughly
5. Update relevant documentation

### Debugging Chat Issues
1. Check n8n workflow logs
2. Verify N8N_WEBHOOK_URL
3. Check Supabase function logs
4. Review error_logs table
5. Test with simplified queries

### Updating UI Components
1. Use existing shadcn/ui components
2. Follow Tailwind CSS conventions
3. Maintain responsive design
4. Test on multiple screen sizes

### Working with Transcripts
1. Upload through UI or direct to Supabase
2. Process with n8n transcript workflow
3. Embeddings generated automatically
4. Search functionality via n8n RAG