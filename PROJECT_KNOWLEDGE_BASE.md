
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

## Known Issues / Next Steps

*   Thoroughly test all Analytics tabs on different screen sizes.
*   Consider re-adding CSV download using a library or simpler method if needed.
*   Begin development of the "War Room" feature.
*   **Action Required by User:** None currently. Proceed with testing/next feature.
