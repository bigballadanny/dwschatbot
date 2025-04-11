
# Project Knowledge Base

This document stores key information, decisions, context, and workflow details for the project to ensure continuity between development sessions.

## Project Mission & Goals

* **Core Purpose:** Create an AI assistant for M&A knowledge that provides access to expert teachings through an intuitive chat interface.
* **Target Experience:** Intuitive, responsive interface with voice capabilities, document analysis, and insightful analytics.
* **Key Features:**
  * Conversational AI chat interface
  * Document analysis ("War Room")
  * Voice interaction
  * Admin analytics dashboard
  * Responsive design across devices

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

## Refactoring Plan & Progress

### Phase 1: Fix Type Issues (COMPLETED)
- [x] Fix the "Type instantiation is excessively deep" error in messageUtils.ts
- [x] Refactor message type definitions to avoid circular dependencies
- [x] Update component imports to use the centralized types
- [x] Verify all message-related code is using the proper types

### Phase 2: Consolidate Redundant Hooks (IN PROGRESS)
- [ ] Choose between useChatController and useChatMessages 
- [ ] Consolidate audio handling between useAudioPlayer and useAudioPlayback
- [ ] Ensure consistent usage of hooks across the application

### Phase 3: Simplify Voice Functionality (TODO)
- [ ] Temporarily simplify or disable complex voice functionality
- [ ] Ensure basic functionality works without the voice features
- [ ] Plan for clean re-integration of voice features

### Phase 4: Component Organization (TODO)
- [ ] Split overly large components into smaller ones
- [ ] Ensure proper separation of concerns
- [ ] Fix any remaining import issues

## Collaborative Problem-Solving Techniques

* **First Principles Thinking:** Break down complex problems to their fundamental elements before building solutions.
* **Question the Problem, Not Just the Solution:** Regularly ask if we're addressing the actual root cause rather than symptoms.
* **Incremental Progress vs. Full Rewrites:** Favor small, testable changes when working with existing code rather than full rewrites.
* **Diverge Then Converge:** When stuck, generate multiple solution approaches before selecting the optimal path.
* **Code Review Protocol:** Review changes with these questions:
  1. Does this solve the original problem?
  2. Does it introduce new dependencies or complexity?
  3. Is it maintainable and consistent with the codebase?
  4. Could it be simplified further?

## Progress Check Protocol

Every 5-7 messages, the AI should:
1. Review the current task status and progress made
2. Identify any potential issues or roadblocks
3. Provide a brief summary of what has been accomplished
4. Outline next steps for continuing progress
5. Ask if the current approach continues to align with user goals

This periodic check helps maintain focus, ensures alignment, and provides opportunities to adjust course as needed.

## Current Status (As of this update)

*   **Type System Refactoring:** COMPLETED. Fixed "Type instantiation is excessively deep" error by simplifying type definitions and removing circular dependencies. Added missing props to components.
*   **Hook Consolidation:** IN PROGRESS. Will consolidate redundant hooks next.
*   **Voice Functionality:** PLANNED. Will simplify or temporarily disable complex voice functionality.
*   **Component Organization:** PLANNED. Will organize components better after addressing core issues.
*   **Analytics Page:** 
    *   Basic data loading and display working.
    *   Responsiveness improved using Tailwind grid/flex classes and ScrollAreas.
    *   Enhanced with dedicated User Engagement tab and content gap analysis.

## App Functionality & Technology Stack

*   **User Experience:** The application serves as an AI assistant for M&A knowledge, providing access to expert teachings through an intuitive chat interface.
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

*   ✅ Fix the type instantiation error in useMessages.ts - COMPLETED
*   ▶️ Consolidate redundant hooks (useChatController & useChatMessages) - IN PROGRESS
*   Simplify voice functionality
*   Improve component organization
*   **Technical Debt:** Consider refactoring `useChatController.tsx` and `useChatMessages.tsx` to remove duplication and improve maintainability.
*   **Action Required by User:** Test the current implementation to verify the type errors are fixed before proceeding to next phase.
