# DWS AI Chatbot - BETA

A React-based chatbot application with n8n workflows for chat processing and transcript ingestion.

## Features

- **Chat Interface**: Modern, responsive chat UI built with React and Shadcn UI
- **Transcript Processing**: Upload and process transcripts with automated chunking
- **Vector Search**: Leverages Supabase PGVector for efficient semantic search
- **Audio Support**: Text-to-speech and speech-to-text capabilities
- **n8n Workflows**: Flexible workflow automation for processing chat and transcripts

## Key Components

- **React Frontend**: Modern UI built with TypeScript and Shadcn UI
- **Supabase Backend**: Database, storage, and edge functions
- **n8n Workflows**: Automated workflows for chat and transcript processing
- **PGVector**: Vector database for semantic search

## Getting Started

1. **Configure Environment Variables**:
   ```
   SUPABASE_URL=your-supabase-url
   SUPABASE_KEY=your-supabase-key
   N8N_CHAT_WEBHOOK=your-n8n-webhook-url
   N8N_TRANSCRIPT_WEBHOOK=your-n8n-webhook-url
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

4. **Set Up n8n**:
   - Install n8n: `npm install n8n -g`
   - Configure workflows as described in [N8N_WORKFLOWS.md](N8N_WORKFLOWS.md)

## Architecture

The application follows a clean, modular architecture:

1. **Frontend** (React + TypeScript):
   - Components for chat, transcript management, and diagnostics
   - Hooks for state management and API communication

2. **Backend** (Supabase):
   - Edge functions for processing requests
   - PGVector for semantic search
   - Storage for transcript files
   - Realtime subscriptions for updates

3. **Workflows** (n8n):
   - Chat processing workflow
   - Transcript ingestion workflow
   - Connected to Supabase via webhooks

See [UPDATED_ARCHITECTURE.md](UPDATED_ARCHITECTURE.md) for detailed architecture information.

## Project Structure

- `/src`: React frontend code
- `/supabase`: Supabase configuration and edge functions
- `/docs`: Documentation
- `/n8n`: n8n workflow definitions

## Contributing

See [TASKS.md](TASKS.md) for current tasks and priorities.

## License

MIT License