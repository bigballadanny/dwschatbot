# Supabase Setup

This guide covers the Supabase backend configuration for the DWS Chatbot.

## Project Structure

The Supabase project includes:
- PostgreSQL database with PGVector extension for vector search
- Edge Functions for AI processing
- Storage buckets for file uploads
- Authentication system

## Database Schema

Key tables:
- `transcripts` - Stores uploaded transcript files and metadata
- `transcript_chunks` - Vector embeddings for RAG
- `conversations` - Chat conversation history
- `messages` - Individual chat messages
- `users` - User profiles and authentication

## Edge Functions

Active functions:
- `ai-chat` - Main AI processing endpoint
- `process-transcript` - Transcript processing pipeline
- `speech-to-text` - Audio transcription
- `text-to-speech` - Audio generation

## Environment Variables

Required in Supabase dashboard:
```
VERTEX_AI_SERVICE_ACCOUNT={"type":"service_account",...}
OPENAI_API_KEY=your-openai-key (if using OpenAI)
```

## Local Development

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Start local environment**
   ```bash
   supabase start
   ```

3. **Deploy functions**
   ```bash
   supabase functions deploy ai-chat
   ```

## Production Configuration

1. Set up RLS (Row Level Security) policies
2. Configure CORS for your domain
3. Set up database backups
4. Monitor function usage and logs