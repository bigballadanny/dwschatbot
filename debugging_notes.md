# Debugging Notes

## White Screen Issue Fix

We've identified and fixed a critical issue that was causing the app to display a blank white screen:

### Issue:
In `src/pages/Index.tsx`, there was a logic error in the welcome screen display logic:

```js
// This will always evaluate to true, causing the welcome screen to always show
setShowWelcome(!user || true);
```

### Fix:
Changed the logic to correctly display the welcome screen only for non-logged-in users:

```js
// Fixed: Changed "!user || true" to just "!user" to correctly handle welcome screen visibility
setShowWelcome(!user);
```

### Effect of Issue:
This logic error caused the app to always show the welcome screen, which would cause an infinite re-render loop when combined with other navigation and state updates.

## Other Potential Issues and Notes

1. **Supabase Connection**
   - Verify that the hardcoded Supabase URL and key in `src/integrations/supabase/client.ts` are valid and have the necessary permissions.
   - If you're getting connection errors to Supabase, check the browser console for specific error messages.

2. **Authentication Flow**
   - The application uses a simple user authentication flow through Supabase.
   - Authentication errors will appear in the browser console if there are issues.

3. **App Structure Changes**
   - We've updated App.tsx to remove references to the Vertex AI components
   - We've created cleanup scripts to safely remove unused components

4. **n8n Integration**
   - The application expects n8n webhooks for processing chat and transcript ingestion
   - Ensure n8n is properly set up as documented in N8N_WORKFLOWS.md

## Running the App

To run the application locally:

```bash
npm run dev
```

If you encounter a "Permission denied" error when running vite, try:

```bash
chmod +x node_modules/.bin/vite
```

## Browser Console

Always check the browser console for specific error messages when debugging. Most React and Supabase errors will appear there with helpful details.

## Next Steps

1. Set up the n8n workflows as described in N8N_WORKFLOWS.md
2. Run the cleanup scripts to remove unused components
3. Test the application with proper Supabase and n8n configuration