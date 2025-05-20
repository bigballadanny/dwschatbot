# DWS Chatbot

An AI-powered chatbot for DealMaker Wealth Society, featuring RAG-based responses and robust transcript management.

## Features

- 🤖 AI-powered chat interface with n8n workflow integration
- 📄 Transcript upload and management with auto-tagging
- 🔍 Search mode toggle for online/offline responses
- 🛡️ Admin panel for user management
- 🌙 Dark/light theme support
- 📱 Fully responsive design

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Auth + Database + Edge Functions)
- **AI Processing**: n8n workflow with RAG capabilities
- **Icons**: lucide-react
- **Build Tool**: Vite

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   Create `.env.local`:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   N8N_WEBHOOK_URL=your_n8n_webhook_url
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## Documentation

- [Setup Guide](SETUP_AND_RUN.md) - Detailed setup instructions
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Production deployment
- [Claude Guide](CLAUDE.md) - Guide for AI assistants
- [Workflow Documentation](WORKFLOW.md) - Project workflow details

## Development

- Run `npm run check` before committing to ensure code quality
- Keep components under 250 lines for maintainability
- Follow existing patterns for consistency

## License

Copyright © 2024 DealMaker Wealth Society