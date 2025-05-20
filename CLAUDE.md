# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Status

This repository contains the DWS AI BETA project, a React-based chatbot application featuring transcript processing and RAG capabilities. The project uses Vite, TypeScript, and Shadcn UI components, with Supabase as the backend and n8n for workflow automation.

## Project Architecture

### Core Technologies
- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite 6
- **UI Components**: Shadcn UI (Radix UI + Tailwind CSS)
- **Styling**: Tailwind CSS
- **State Management**: React Query
- **Form Handling**: React Hook Form with Zod validation
- **Backend**: Supabase (PostgreSQL with PGVector extension)
- **Workflow Automation**: n8n

### Key Directories
- `/src`: Main application code
- `/n8n`: n8n workflow configurations
- `/supabase`: Supabase configuration and edge functions
- `/docs`: Documentation

## Build Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Development Workflow

### Setting Up the Project
1. Clone the repository
2. Install dependencies with `npm install`
3. Create a `.env.local` file with required environment variables (see `.env.example`)
4. Start the development server with `npm run dev`

### Architecture Guidelines
1. Components should follow Shadcn UI patterns
2. Custom hooks should handle complex state logic
3. API calls should use React Query
4. Forms should use React Hook Form with Zod validation
5. Follow the refactoring plan outlined in REFACTORING_PLAN.md

## Current Project Status

This project is in active development with several refactoring initiatives in progress. Key focus areas include:

1. **Chat System Refactoring**: Breaking down large hooks into smaller, more manageable pieces
2. **Voice Input System Refactoring**: Standardizing audio management
3. **UI Component Library Enhancement**: Creating reusable, consistent components
4. **n8n Workflow Implementation**: Setting up workflows for chat and transcript processing

## Testing

The project uses Jest for unit tests. Tests can be run with:
```bash
npm test
```

## Key Files to Reference

- `README.md`: Overview of the system
- `UPDATED_ARCHITECTURE.md`: Current architecture documentation
- `N8N_WORKFLOWS.md`: n8n workflow documentation
- `REFACTORING_PLAN.md`: Ongoing refactoring initiatives
- `CLEANUP_PLAN.md`: Plan for removing unused components
- `TASKS.md`: Current development tasks
- `package.json`: Dependencies and scripts

## How to Help with This Project

When working with this codebase, Claude should prioritize:

1. **Code Quality**: Follow TypeScript best practices with proper typing
2. **Component Design**: Use Shadcn UI patterns and follow the existing component structure
3. **Performance**: Consider React component optimization techniques
4. **Testing**: Suggest tests for new functionality
5. **Documentation**: Update relevant documentation when changing code
6. **Refactoring**: Follow the guidelines in REFACTORING_PLAN.md

When suggesting code changes, focus on:
- Maintaining type safety
- Keeping components small and focused
- Following Shadcn UI component patterns
- Using custom hooks for complex logic
- Proper error handling
- Clean, maintainable code

## Tooling Context

The project uses:
- ESLint for code linting
- TypeScript for type checking
- Vite for building and development
- Tailwind CSS for styling
- React Router for navigation
- Supabase for backend services
- n8n for workflow automation

## Git Configuration

When committing changes, use the following git configuration:
```bash
git config user.email "danielreynoso8@gmail.com"
git config user.name "bigballadanny"
```