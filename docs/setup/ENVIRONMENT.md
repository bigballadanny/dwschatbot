# Environment Setup

This guide covers setting up your development environment for the DWS Chatbot project.

## Prerequisites

- Node.js 18+ and npm
- Git
- Access to Supabase project

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd DWS_Chatbot-BETA
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Create `.env.local` with the following variables:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## Git Configuration

When committing changes, use the following git configuration:
```bash
git config user.email "danielreynoso8@gmail.com"
git config user.name "bigballadanny"
```

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint code

## Troubleshooting

### Common Issues

1. **Port conflicts**: If port 5173 is in use, Vite will automatically use the next available port
2. **Environment variables**: Ensure all required variables are set in `.env.local`
3. **Dependencies**: Run `npm install` if you encounter module errors