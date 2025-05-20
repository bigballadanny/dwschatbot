# Renaming Supabase Edge Function

This document provides instructions for renaming the `gemini-chat` Supabase edge function to the more generic name `ai-chat`. This change makes the codebase more flexible and less tied to a specific AI provider.

## Client-Side Changes (Completed)

The following files have been updated to reference `ai-chat` instead of `gemini-chat`:

1. `/src/contexts/ChatContext.tsx` - Updated function invocation
2. `/src/hooks/useServiceAccountCheck.ts` - Updated health check endpoint

## Server-Side Implementation (Completed)

We've created the new `ai-chat` Supabase edge function with the following files:

1. `/supabase/functions/ai-chat/index.ts` - Main function handler
2. `/supabase/functions/ai-chat/utils.ts` - Utility functions
3. `/supabase/functions/ai-chat/auth.ts` - Authentication helpers
4. `/supabase/functions/ai-chat/health.ts` - Health check endpoint
5. `/supabase/functions/ai-chat/vertex.ts` - Vertex AI integration
6. `/supabase/functions/ai-chat/voice-conversation/index.ts` - Voice chat functionality

## Deployment Instructions

To deploy the new function on the Supabase side:

### Option 1: Deploy Using Supabase Dashboard

1. **Log in** to your Supabase dashboard
2. Navigate to **Edge Functions** in the left sidebar
3. **Create a new function** named `ai-chat`
4. **Upload the files** from the `/supabase/functions/ai-chat` directory:
   - index.ts
   - auth.ts
   - health.ts
   - utils.ts
   - vertex.ts
   - voice-conversation/index.ts
5. **Add any function-specific environment variables** that were present in the original function
6. **Deploy** the function
7. **Test** the new function to ensure it works correctly
8. Once confirmed working, you can optionally delete the old `gemini-chat` function

### Option 2: Using Supabase CLI (For Advanced Users)

If you have the Supabase CLI installed, you can:

1. **Deploy** the function directly from the local directory:
   ```bash
   supabase functions deploy ai-chat
   ```

2. **Deploy** the voice-conversation sub-function:
   ```bash
   supabase functions deploy ai-chat/voice-conversation
   ```

3. **Verify** the function works as expected

## Testing After Deployment

After completing the rename and deployment, test the following:

1. **Basic chat functionality** - Send and receive messages
2. **Voice functionality** - Make sure TTS and STT still work
3. **Health checks** - Verify the service account health check still works

## Rollback Plan

If issues occur:

1. Keep both functions running simultaneously until the new one is confirmed working
2. Revert the client-side code changes if needed to use the original `gemini-chat` function
3. Troubleshoot and fix any issues with the new function

## Additional Notes

- The function rename is purely for code organization and does not affect the underlying AI model being used
- This change makes it easier to switch between different AI providers in the future
- No database schema changes are required for this rename
- The function's internal code and behavior remains unchanged
- We've updated all code references to "gemini" to make the codebase more vendor-agnostic