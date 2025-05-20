# Renaming Supabase Edge Function

This document provides instructions for renaming the `gemini-chat` Supabase edge function to the more generic name `ai-chat`. This change makes the codebase more flexible and less tied to a specific AI provider.

## Client-Side Changes (Already Completed)

The following files have been updated to reference `ai-chat` instead of `gemini-chat`:

1. `/src/contexts/ChatContext.tsx` - Updated function invocation
2. `/src/hooks/useServiceAccountCheck.ts` - Updated health check endpoint

## Supabase Dashboard Changes

Follow these steps to rename the function on the Supabase side:

### Option 1: Create a Copy With New Name (Recommended)

1. **Log in** to your Supabase dashboard
2. Navigate to **Edge Functions** in the left sidebar
3. **Create a new function** named `ai-chat`
4. **Copy all code** from the existing `gemini-chat` function:
   - index.ts
   - auth.ts
   - health.ts
   - utils.ts
   - vertex.ts
5. **Test** the new function to ensure it works correctly
6. **Update any function-specific environment variables** to work with the new function name
7. Once confirmed working, you can optionally delete the old `gemini-chat` function

### Option 2: Using Supabase CLI (For Advanced Users)

If you have the Supabase CLI installed, you can:

1. **Download** the existing function:
   ```bash
   supabase functions download gemini-chat
   ```

2. **Rename** the local directory:
   ```bash
   mv gemini-chat ai-chat
   ```

3. **Deploy** with the new name:
   ```bash
   supabase functions deploy ai-chat
   ```

4. **Verify** the function works as expected

## Testing After Renaming

After completing the rename, test the following:

1. **Basic chat functionality** - Send and receive messages
2. **Voice functionality** - Make sure TTS and STT still work
3. **Health checks** - Verify the service account health check still works

## Rollback Plan

If issues occur:

1. Revert the client-side code changes
2. Revert back to using the original `gemini-chat` function
3. Try the renaming process again after resolving any issues

## Additional Notes

- The function rename is purely for code organization and does not affect the underlying AI model being used
- This change makes it easier to switch between different AI providers in the future
- No database schema changes are required for this rename
- The function's internal code and behavior remains unchanged