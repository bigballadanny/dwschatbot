# DWS AI Chatbot - BETA

A React-based chatbot application with AI-powered conversations and document processing capabilities.

## Features

- **Modern Chat Interface**: Responsive UI built with React and Shadcn UI
- **Document Processing**: Upload and process transcripts with automated chunking
- **Vector Search**: Leverages Supabase PGVector for efficient semantic search
- **Audio Support**: Text-to-speech and speech-to-text capabilities
- **AI Integration**: Powered by Vertex AI (Gemini) with optional OpenAI support

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Shadcn UI, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + PGVector, Edge Functions)
- **AI Services**: Vertex AI (Gemini), OpenAI APIs
- **State Management**: React Query, Context API

## Quick Start

1. **Environment Setup**:
   ```bash
   npm install
   cp .env.example .env.local
   # Configure your environment variables
   ```

2. **Development**:
   ```bash
   npm run dev
   ```

3. **Build**:
   ```bash
   npm run build
   ```

## Documentation

Comprehensive documentation is available in the `/docs` directory:

- [Environment Setup](./docs/setup/ENVIRONMENT.md) - Development environment configuration
- [System Architecture](./docs/development/ARCHITECTURE.md) - Technical architecture overview
- [Contributing Guidelines](./docs/development/CONTRIBUTING.md) - Development standards and workflow
- [Supabase Setup](./docs/setup/SUPABASE_SETUP.md) - Backend configuration
- [Pydantic Integration](./docs/integration/PYDANTIC_GUIDE.md) - Data validation patterns
- [LangChain Integration](./docs/integration/LANGCHAIN_GUIDE.md) - Enhanced RAG capabilities

## Project Structure

```
├── src/                 # React application source
├── supabase/           # Backend functions and configuration
├── docs/               # Documentation
├── CLAUDE.md           # Claude Code integration instructions
└── CHANGELOG.md        # Version history
```

## Key Capabilities

### Chat System
- Multi-turn conversations with context retention
- Vector-based document retrieval (RAG)
- Voice input and output support
- Citation tracking for AI responses

### Document Management
- File upload and processing
- Intelligent text chunking
- Vector embedding generation
- Searchable document index

### Advanced Features
- Role-based access control
- Conversation history
- Real-time updates
- Performance monitoring

## Development

This project uses modern development practices:
- TypeScript for type safety
- ESLint for code quality
- React Query for data fetching
- Shadcn UI for consistent components

For detailed development information, see [Contributing Guidelines](./docs/development/CONTRIBUTING.md).

## License

MIT License