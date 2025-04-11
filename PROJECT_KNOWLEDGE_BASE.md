
# Project Knowledge Base

This document stores key information, decisions, context, and workflow details for the project to ensure continuity between development sessions.

## Workflow Notes (for AI Agent)

*   **Development Environment:** Work occurs primarily in the local IDE. Changes modify local files directly.
*   **Testing:** User tests changes on `localhost`.
*   **Deployment:** 
    *   Frontend changes require a standard `git add .`, `git commit -m "..."`, `git push` workflow **initiated by user request**. This triggers Lovable deployment.
    *   Supabase function changes require manual deployment using the Supabase CLI (e.g., `supabase functions deploy <function_name>`) **by the user**, as the IDE terminal lacks the Supabase CLI.
*   **Communication:** Clearly state which files are being modified. Confirm understanding of user requests. Explicitly mention when a `git push` or manual Supabase deployment is needed by the user.
*   **User Profile:** User prefers clear, step-by-step actions and may need guidance on technical steps like deployment. Prioritize fixing functionality shown on `localhost`.
*   **Troubleshooting:** Be mindful that code (especially from Lovable) might have unexpected structures or bugs. Systematically debug by checking:
    1.  Frontend code (React components, utils)
    2.  Backend Supabase Function code
    3.  Function Logs (via user checking Supabase dashboard)
    4.  Database Tables/RLS (via user checking Supabase dashboard)
    5.  Browser Console Logs on `localhost`

## Project Goals

*   Functional and insightful Analytics page.
*   Robust chat functionality.
*   Clean UI/UX, responsive design.
*   Well-structured and maintainable codebase.
*   Develop a functional "War Room" feature for document analysis.

## Current Status (As of this update)

*   **Analytics Logging:** FIXED. Renamed backend function to `gemini-chat` and added analytics logging within it. Confirmed data populates on `localhost`.
*   **Analytics Page:** 
    *   Basic data loading and display working.
    *   CSV Download feature REMOVED due to persistent syntax errors during implementation.
    *   PieChart errors (Usage Patterns, Source Dist) FIXED by adding checks for empty data before rendering.
    *   Responsiveness improved using Tailwind grid/flex classes and ScrollAreas.
    *   Enhanced with dedicated User Engagement tab showing metrics like unique conversations, total queries, average queries per conversation, and return rate.
    *   Added content gap analysis to identify knowledge base improvement opportunities.
*   **Layout:** FIXED issue where sidebar appeared on `/auth` page by restructuring `App.tsx` with a `MainLayout` and `SimpleLayout`.
*   **Audio:** Refactored to use `AudioPlayer` component, default off.

## App Functionality

*   **User Experience:** The application serves as an AI assistant for M&A knowledge, providing access to Carl Allen's teachings through an intuitive chat interface.
*   **Core Features:** Chat interaction, document analysis, voice interaction, analytics for admins.
*   **Technology Stack:** React, TypeScript, Tailwind CSS, Supabase (backend/auth/storage), Gemini API (AI integration).

## Lessons Learned & Best Practices

*   **Circular Dependencies:** Be vigilant about circular type dependencies. Use interface definitions in shared utility files and import them where needed, rather than creating circular imports.
*   **Type Safety:** When dealing with complex types, break them down into smaller, focused interfaces to avoid deep type instantiation issues.
*   **Debugging Process:** 
    1. **Identify Root Cause:** Look beyond immediate symptoms to underlying structural issues.
    2. **Question Assumptions:** Regularly verify that you're addressing the actual problem, not just symptoms.
    3. **Holistic Review:** Examine the entire codebase for related dependencies before implementing fixes.
    4. **Simplify First:** Often, simplifying types and functions resolves complex TypeScript errors.
*   **Code Organization:** 
    1. Keep files small and focused (less than 200 lines if possible).
    2. Use clear type definitions in shared utility files.
    3. Follow the Single Responsibility Principle for hooks and components.

## Known Issues / Next Steps

*   Thoroughly test all Analytics tabs on different screen sizes.
*   Consider re-adding CSV download using a library or simpler method if needed.
*   Begin development of the "War Room" feature.
*   **Technical Debt:** Consider refactoring `useChatController.tsx` and `useChatMessages.tsx` to remove duplication and improve maintainability.
*   **Action Required by User:** None currently. Proceed with testing/next feature.

## Progress Check Protocol

Every 5-7 messages, the AI should:
1. Review the current task status and progress made
2. Identify any potential issues or roadblocks
3. Provide a brief summary of what has been accomplished
4. Outline next steps for continuing progress
5. Ask if the current approach continues to align with user goals

This periodic check helps maintain focus, ensures alignment, and provides opportunities to adjust course as needed.
