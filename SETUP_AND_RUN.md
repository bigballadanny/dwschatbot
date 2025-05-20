# Setup and Run Guide

## Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- Supabase account
- N8N instance (local or cloud)

## Environment Setup

1. **Clone the repository** (if not already done)
```bash
git clone [your-repo-url]
cd "DWS_Chatbot - BETA"
```

2. **Install dependencies**
```bash
npm install
```

3. **Create environment file**
Create a `.env.local` file in the root directory:
```
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# N8N Configuration
N8N_WEBHOOK_URL=your_n8n_webhook_url

# Optional: Development settings
VITE_UPLOAD_SIZE_LIMIT=10485760  # 10MB
VITE_AUTO_TAG_ENABLED=true
```

4. **Configure Supabase**

   a. **Set up your Supabase project**
   - Create a new project at [supabase.com](https://supabase.com)
   - Note your project URL and anon key from the project settings
   
   b. **Run database migrations**
   ```bash
   # Install Supabase CLI if not already installed
   npm install -g supabase
   
   # Link to your Supabase project
   supabase link --project-ref your-project-ref
   
   # Run migrations
   supabase db push
   ```
   
   c. **Deploy edge functions**
   ```bash
   # Deploy chat function
   supabase functions deploy gemini-chat
   
   # Deploy transcript processing function
   supabase functions deploy process-transcript
   
   # Set secrets for edge functions
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
   
   d. **Configure Storage**
   - Create a `transcripts` bucket in Supabase Storage
   - Set the bucket to public (or configure RLS policies)
   
   e. **Set up Authentication**
   - Enable Email authentication in Supabase Auth settings
   - Configure email templates for confirmation and password reset

5. **Configure N8N Workflow**

   a. **Import the workflow**
   - Access your N8N instance
   - Import the workflow from `n8n/workflows/WORKFLOW_N8N.json`
   
   b. **Configure the webhook**
   - In the Webhook node, set authentication to none (for development)
   - Copy the webhook URL from N8N
   - Update your `.env.local` file with the N8N_WEBHOOK_URL
   
   c. **Set up credentials in N8N**
   - Add Supabase credentials (URL and service role key)
   - Configure Google AI credentials for Gemini API
   - Set up PGVector connection if using vector search
   
   d. **Test the workflow**
   - Enable the workflow
   - Send a test webhook request to verify connectivity

## Running Locally

1. **Start the development server**
```bash
npm run dev
```

2. **Access the application**
Open your browser and navigate to:
```
http://localhost:5173
```

3. **Test the chat interface**
- Sign in with your credentials
- Start a new conversation
- Test the chat functionality

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Deployment to Production

1. **Build the application**
```bash
npm run build
```

2. **Deploy to hosting service**
- Deploy the `dist` folder to Vercel, Netlify, or similar
- Set environment variables in hosting platform

3. **Configure production settings**
- Update Supabase URL to production project
- Set up proper authentication and RLS policies
- Enable proper CORS settings for N8N webhook

## Troubleshooting

### Common Issues

1. **Chat not responding**
- Check if N8N workflow is running
- Verify N8N_WEBHOOK_URL is correct
- Check Supabase edge function logs:
  ```bash
  supabase functions logs gemini-chat
  ```
- Test the webhook directly:
  ```bash
  curl -X POST your_n8n_webhook_url \
    -H "Content-Type: application/json" \
    -d '{"message":"test","conversation_id":"test-123"}'
  ```

2. **Authentication issues**
- Verify Supabase credentials are correct
- Check if email confirmation is required:
  ```sql
  -- Check user status in Supabase SQL editor
  SELECT id, email, confirmed_at FROM auth.users;
  ```
- Clear browser cache/cookies
- Check Supabase Auth logs for errors

3. **Database connection errors**
- Verify Supabase URL and keys
- Check network connectivity
- Review database permissions:
  ```sql
  -- Check RLS policies
  SELECT * FROM pg_policies;
  ```
- Ensure migrations have run successfully

4. **Transcript processing issues**
- Check edge function logs:
  ```bash
  supabase functions logs process-transcript
  ```
- Verify webhook URL in edge function
- Check if transcript has `is_processed` flag
- Ensure N8N workflow is active

### Debug Commands

```bash
# Check if dependencies are installed
npm list

# Run linter
npm run lint

# Build with development mode for debugging
npm run build:dev
```

## Key Features

- **Chat Interface**: Clean, simple chat UI
- **Transcript Management**: Upload and manage transcripts
- **Admin Panel**: User management (for admins)
- **Search Toggle**: Enable/disable online search
- **N8N Integration**: RAG-powered responses

## Architecture Overview

```
Frontend (React) → Edge Function → N8N Webhook → Database
                                        ↓
                                   RAG Processing
                                        ↓
                                   Response to User
```

## Testing

### Unit Tests
```bash
# Run tests (if available)
npm test
```

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Chat functionality
- [ ] Transcript upload (single and batch)
- [ ] Tag filtering and search
- [ ] Admin panel access
- [ ] Theme switching
- [ ] Mobile responsiveness

## Performance Optimization

1. **Enable caching**
   - Chat responses are cached in `chat_cache` table
   - Configure cache TTL in edge function

2. **Optimize bundle size**
   ```bash
   # Analyze bundle
   npm run build -- --analyze
   ```

3. **Enable compression**
   - Configure gzip/brotli in hosting service
   - Optimize images and assets

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the WORKFLOW.md for project details
3. Check DEPLOYMENT_GUIDE.md for production setup
4. Create an issue in the repository