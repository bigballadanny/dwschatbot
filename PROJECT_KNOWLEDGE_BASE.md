# Project Knowledge Base

This document stores key information, decisions, context, and workflow details for the project to ensure continuity between development sessions.

## Workflow

*   **Development Environment:** Primarily use the local IDE environment.
*   **Version Control:** Push changes to GitHub periodically upon request to save progress and reflect updates on the Lovable platform.
*   **AI Collaboration:** The AI assistant helps with coding, analysis, and executing tasks within the IDE.

## Project Goals

*   Enhance the analytics section with better graphs and insightful query analysis.
*   Improve UI/UX, particularly audio playback controls.
*   Ensure correct analytics data logging.
*   Integrate/verify the use of appropriate Gemini models.

## Current Focus (as of 2024-07-29)

*   Refactoring audio playback in `Index.tsx` to use the dedicated `AudioPlayer.tsx` component for better user control (Play/Pause/Seek/Volume/Stop).
*   Implementing analytics logging within the `supabase/functions/voice-conversation/index.ts` function.
*   Adding Theme Analysis and Insightful Query features to the Analytics page.

## Key Decisions & Refactors

*   **Analytics:** Added M&A-specific theme analysis (`generateQueryThemes`) and placeholder for insightful query identification (`identifyInsightfulQueries`) in `analyticsUtils.ts`. Added corresponding tabs/charts to `Analytics.tsx`.
*   **Audio Playback (Index.tsx):** 
    *   Initial audio playback logic in `handleSendMessage` was causing unwanted automatic playback.
    *   Changed initial `audioEnabled` state to `false`.
    *   Refactored to use the `AudioPlayer.tsx` component, controlled by `currentAudioSrc` state, providing explicit playback controls.
*   **Header:** Removed the Text-to-Speech banner from `Header.tsx`.
*   **Analytics Logging:** Identified that logging to `chat_analytics` was missing in both `Index.tsx` and the `voice-conversation` function. Plan is to add it to the function.

## Known Issues / Next Steps

*   Implement analytics logging in `supabase/functions/voice-conversation/index.ts`.
*   Test the refactored audio player controls.
*   Verify Gemini 1.5 Pro model usage/availability if necessary.
