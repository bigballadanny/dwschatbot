# System Architecture

## Overview

The DWS Chatbot is a React-based application with a modern stack focused on AI-powered conversations and document processing.

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Shadcn UI** for components (Radix UI + Tailwind CSS)
- **React Query** for state management
- **React Router** for navigation

### Backend
- **Supabase** for database, authentication, and storage
- **PostgreSQL** with PGVector extension for vector search
- **Edge Functions** (Deno) for AI processing

### AI Services
- **Vertex AI (Gemini)** for chat responses
- **OpenAI** for embeddings (optional)
- **Speech APIs** for voice features

## Application Structure

```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (auth, chat, audio)
├── hooks/              # Custom React hooks (organized by domain)
├── pages/              # Route components
├── utils/              # Utility functions
└── integrations/       # External service integrations
```

## Data Flow

1. **User Input** → React components
2. **State Management** → React contexts and hooks
3. **API Calls** → Supabase Edge Functions
4. **AI Processing** → Vertex AI or OpenAI
5. **Vector Search** → PGVector in PostgreSQL
6. **Response** → Back through the chain to UI

## Key Features

### Chat System
- Multi-turn conversations with context
- Vector-based document retrieval (RAG)
- Voice input and output capabilities
- Citation tracking for responses

### Document Processing
- File upload and storage
- Text extraction and chunking
- Vector embedding generation
- Searchable document index

### User Management
- Supabase authentication
- Role-based access control
- Conversation history

## Security

- Row Level Security (RLS) in Supabase
- JWT-based authentication
- Environment-based configuration
- CORS protection on API endpoints