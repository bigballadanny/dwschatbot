# WORKFLOW.md

## 1. Overview & Goals
This project creates a user interface and dashboard for new users in the mergers and acquisition space to access and learn from Carl Allen's Deal Maker Society resources. Key components include:

1.  **User-facing dashboard** for accessing and searching transcript content
2.  **Admin analytics section** to track user engagement and identify popular topics
3.  **War Room** for users to upload potential business documents for AI analysis
4.  **Transcript management system** for organizing educational content

*Migration Source: `ARCHIVED_SYNTHIOS.md` (Project Overview section)*

## 2. Modes
This project utilizes different operational modes to handle various aspects of development and interaction:

-   **Code Mode:** Responsible for writing, debugging, and refactoring code. Implements features based on plans and specifications. Handles tasks requiring direct file manipulation and execution of coding-related commands.
-   **Architect Mode:** Focuses on planning, system design, and defining project structure. Gathers requirements, creates technical plans, and outlines workflows. Ensures the overall technical vision is sound.
-   **Ask Mode:** Provides information, answers questions about software development, technology, and project specifics. Explains concepts and clarifies details.
-   **Debug Mode:** Specializes in diagnosing and resolving issues. Identifies root causes of bugs, analyzes errors, and proposes solutions.
-   **Boomerang Mode:** Orchestrates complex tasks by breaking them down and delegating sub-tasks to the most appropriate specialized modes. Manages the overall flow of multi-step operations.

*Migration Source: New content based on user request.*

## 3. Workflow & Tasks

### 3.1. Process
-   **Task Identification & Definition:** New tasks or requirements are identified and documented in the "Board" section below. Complex tasks should be broken down into smaller, manageable chunks.
-   **Prioritization:** Tasks are prioritized based on project goals and dependencies.
-   **Execution:** Tasks are assigned to or picked up by the appropriate mode (often Code mode for implementation). Focus on one task at a time, implementing small, targeted changes after analyzing the full scope.
-   **Review & Alignment:** Regular "vibe sessions" (every 5-7 prompts) should be conducted to review progress, align understanding, and update the task board.
-   **Completion:** Tasks are marked as complete (`[x]`) only after being fully tested and verified. Completed tasks are then moved to the "Log / Changelog" section. Add new observations or bugs found during development to the board.
-   **Philosophy:** Remember: Every challenge is an opportunity for elegant solutions! 💡

*Migration Source: `ARCHIVED_SYNTHIOS.md` (Development Workflow), `ARCHIVED_TASKBOARD.md` (Process Guidelines)*

### 3.2. Board

**Current Focus (Phase 9 & Ongoing)**

*   **Vertex AI Integration 🚀**
    -   [x] Add Google Vertex AI integration to replace/supplement Gemini API
    -   [x] Fix Vertex AI authentication issues with service account JSON
    -   [x] Add service account validation tool
    -   [x] Fix UI issues with service account validator
    -   [x] Fix layout issues with sidebar after adding Vertex AI integration
    -   [ ] Optimize token usage in conversations (Priority: Medium) - Status: To Do
    -   [x] Enhance error handling for AI service switching
    -   [x] Fix generateCacheKey function in gemini-chat edge function
    -   [ ] Implement Vertex AI diagnostics and testing tools (Priority: Medium) - Status: To Do
    -   [ ] Fix JWT token generation in Vertex AI authentication (Priority: High) - Status: To Do
*   **Optimization Tasks ⚡**
    -   [x] Fix message list scrolling issues
    -   [x] Fix layout issues with the main application UI
    -   [x] Fix sidebar missing from pages
    -   [ ] Improve message caching strategy (Priority: Medium) - Status: To Do
    -   [ ] Implement proper token bucket rate limiting (Priority: Low) - Status: To Do
    -   [ ] Add request batching for frequently asked questions (Priority: Low) - Status: To Do
    -   [ ] Optimize context window usage (Priority: Medium) - Status: To Do
*   **UI Improvements ✨**
    -   [x] Add easy navigation to Vertex AI setup page
    -   [x] Fix scrolling behavior in chat interface
    -   [x] Enhance service account validator UI
    -   [ ] Enhance message list animations and transitions (Priority: Low) - Status: To Do
    -   [x] Improve sidebar UI and interaction
    -   [x] Fix responsive design issues
    -   [x] Fix missing sidebar on all pages
*   **Testing Plan 🧪**
    -   [ ] Test Vertex AI vs Gemini API performance (Priority: Medium) - Status: To Do
    -   [ ] Monitor quota usage and rate limits (Priority: Medium) - Status: To Do
    -   [x] Verify fallback mechanisms work properly
    -   [x] Test recovery from API failures
*   **Quick Wins / Bugs 🎯**
    -   [x] Fix message persistence bugs
    -   [x] Implement fallback mechanisms for API failures
    -   [x] Create Vertex AI service account validator
    -   [x] Fix UI bugs in MessageList component
    -   [x] Add easy access to Vertex AI setup page
    -   [x] Fix layout issues with SidebarProvider
    -   [x] Fix missing sidebar on all pages
    -   [x] Fix error in gemini-chat edge function
    -   [ ] Improve error messaging across application (Priority: Low) - Status: To Do
    -   [ ] Add keyboard shortcuts for power users (Priority: Low) - Status: To Do
    -   [ ] Create diagnostics page for Vertex AI testing (Priority: Medium) - Status: To Do (Related to Vertex AI Integration task)

**Backlog**

*   **War Room Enhancements 🚀**
    -   [ ] Implement document upload for business analysis (Priority: High) - Status: To Do
    -   [ ] Add AI-powered initial business assessment (Priority: High) - Status: To Do
    -   [ ] Create key metrics extraction functionality (Priority: Medium) - Status: To Do
    -   [ ] Design comparative analysis tools (Priority: Medium) - Status: To Do
*   **Future Features 🔮**
    -   [ ] Add speech-to-text capabilities (Priority: Medium) - Status: To Do
    -   [ ] Enhance Role-Based Access Control (Priority: Medium) - Status: To Do
    -   [ ] Implement dashboard customization options (Priority: Low) - Status: To Do
    -   [ ] Optimize performance for large datasets (Priority: Medium) - Status: To Do

*Task Format:* Markdown checkboxes (`[ ]` To Do, `[/]` In Progress, `[x]` Done), description, priority, status, notes.
*Migration Source: `ARCHIVED_TASKBOARD.md` (Adapted format)*

## 4. Log / Changelog

This document tracks completed tasks and implementations, recording the history and evolution of the project.

### Phase 1: Fix Type Issues ✅

-   Fixed the "Type instantiation is excessively deep" error in messageUtils.ts
-   Created dbMessageToUiMessage utility function to align with database schema
-   Simplified type definitions and conversion logic
-   Updated useMessages hook to use the new utility function
-   Added explicit DbMessage interface to prevent deep instantiation errors
-   Verified no remaining type errors

### Phase 2: Consolidate Redundant Hooks ✅

-   Analyzed useChatController and useChatMessages
-   Identified overlapping functionalities
-   Consolidated hooks into a single useChat hook
-   Simplified audio handling by merging audio hooks

### Phase 3: Backend and Type System Alignment ✅

-   Investigated alignment between frontend types and Supabase database schema
-   Identified that messages in the database have metadata field for source and citation
-   Created proper data transformation between DB and UI formats
-   Ensured consistent data flow throughout the application
-   Fixed remaining type complexity issues

### Phase 4: UI Improvements ✅

-   Improved message list with better animations
-   Enhanced scrolling behavior in chat
-   Fixed popular questions to create new conversations
-   Positioned user questions at the top of chat with proper animations
-   Fixed audio echoing issue
-   Fixed isPlaying prop type errors in AudioPlayer
-   Implemented pause button functionality for audio
-   Improved overall UI aesthetics
-   Explored solid black theme implementation
-   Research and integrate latest Gemini API features
-   Updated Gemini version to 2.0

### Phase 5: Bug Fixes ✅

-   Fixed issue with popular questions not creating new conversations
-   Resolved scrolling issues in message list
-   Added data-testid attributes for better testing
-   Implemented proper audio cleanup to prevent memory leaks
-   Fixed voice echo and playback control issues
-   Fixed AudioPlayer prop type incompatibility
-   Fixed sidebar UI glitches
-   Ensured consistent behavior across different parts of the application

### Phase 6: Analytics Dashboard Improvements ✅

-   Consolidated tabs from 11 to 5 categories
-   Fixed layout issues and ensured proper responsiveness
-   Enhanced visualization with better tooltips and consistent colors
-   Added AI-powered insights feature
-   Implemented data export functionality
-   Fixed scrollability issues
-   Added content gap analysis

### Phase 7: Integration with Gemini 2.0 ✅

-   Updated edge function to use Gemini 2.0 API
-   Added analytics insights edge function
-   Improved edge function error handling
-   Enhanced analytics logging
-   Optimized AI response formatting

### Phase 8: Message Persistence & Conversation Tracking ✅

-   Fixed message saving issues by completely redesigning the metadata column detection system
-   Created specialized utility function to prepare messages for database based on schema support
-   Added robust fallback mechanisms that automatically retry insertions without metadata when needed
-   Enhanced database error handling with proper logging and tracing
-   Implemented comprehensive logging throughout the message saving process
-   Added redundant checks and validations to ensure maximum resilience
-   Fixed conversationId synchronization between URL parameters and application state
-   Improved state management between components for better stability
-   Enhanced URL navigation synchronization with conversation state
-   Added debug logs throughout the conversation flow for easier troubleshooting
-   Ensured consistent state tracking between the UI and database
-   Optimized data flow between hooks for better maintainability

*(Note: Wins & Lessons moved to Section 5.4)*

*Migration Source: `ARCHIVED_CHANGELOG.md`*

## 5. Context & Guidelines

### 5.1. Principles
-   **First Principles Thinking:** Break down complex problems into fundamental truths and reason up from there. Question assumptions and build solutions from the ground up, focusing on core user value.
-   **Zoom In/Zoom Out Methodology:** Regularly alternate between the big picture (architecture, user journeys) and implementation details (optimizations, features) to maintain cohesion and quality.
-   **Intuitive User Experience:** Create interfaces that feel natural and require minimal explanation (clear navigation, thoughtful hierarchy, minimal cognitive load, progressive disclosure).

*Migration Source: `ARCHIVED_SYNTHIOS.md` (Core Principles)*

### 5.2. Architecture
-   **State Management:** React Context API for global state (auth, preferences), local state for UI concerns, Supabase for persistence.
-   **Data Flow:** Unidirectional data flow, custom hooks for fetching/processing, error boundaries.
-   **API Integration:** Supabase (backend/auth), Gemini API / Vertex AI (AI features), Edge functions (secure interactions).

*Migration Source: `ARCHIVED_SYNTHIOS.md` (Technical Architecture)*

### 5.3. Dev Guidelines
-   **Code Implementation:** Modular components, consistent naming, TypeScript, comments for complex logic, optimize for readability/maintainability.
-   **AI Strategy:** Use Gemini/Vertex AI for appropriate analytical tasks, balance with performance/cost, implement fallbacks.
-   **File Structure:** Small, focused components (<200 lines), separate logic (hooks/utils), group related components, dedicated type files.

*Migration Source: `ARCHIVED_SYNTHIOS.md` (Relevant sections)*

### 5.4. Lessons & Wins
-   **Key Wins:** Reduced load time (40%), improved chat UX, intuitive analytics, fixed critical persistence issues, resilient saving mechanism, schema compatibility layer.
-   **Optimizations/Lessons Applied:** Breaking tasks down, regular "vibe sessions", structured documentation, consistent types, user testing, defensive programming, robust fallbacks, comprehensive logging.
-   **Common Pitfalls to Avoid:** Overengineering, neglecting UX, forgetting documentation.
-   **UX Patterns:** Progressive disclosure, consistent feedback, accessibility.

*Migration Source: `ARCHIVED_SYNTHIOS.md` & `ARCHIVED_CHANGELOG.md` (Lessons/Wins)*

## 6. Roadmap / Ideas
-   **Enhanced War Room:** Financial ratio analysis, industry comparison, due diligence checklist automation.
-   **Learning Pathways:** Personalized recommendations, progress tracking, interactive exercises.
-   **Community Features:** Discussion forums, expert Q&A, peer networking.

*Migration Source: `ARCHIVED_SYNTHIOS.md` (Future Innovations)*