# WORKFLOW.md

## 1. Overview & Goals
This project creates a user interface and dashboard for new users in the mergers and acquisition space to access and learn from Carl Allen's Deal Maker Society resources. Key components include:

1. **User-facing chatbot** powered by N8N workflow for RAG-based Q&A
2. **Transcript management system** for organizing educational content
3. **Admin management** for user permissions
4. **Simple, robust architecture** focused on reliability

*Migration Source: Clean rebuild focused on N8N workflow*

## 2. Modes
This project utilizes different operational modes to handle various aspects of development and interaction:

- **Code Mode:** Responsible for writing, debugging, and refactoring code. Implements features based on plans and specifications.
- **Architect Mode:** Focuses on planning, system design, and defining project structure.
- **Ask Mode:** Provides information, answers questions about software development, technology, and project specifics.
- **Debug Mode:** Specializes in diagnosing and resolving issues.
- **Boomerang Mode:** Orchestrates complex tasks by breaking them down and delegating sub-tasks.

## 3. Workflow & Tasks

### 3.1. Process
- **Task Identification & Definition:** New tasks or requirements are identified and documented below
- **Prioritization:** Tasks are prioritized based on project goals and dependencies
- **Execution:** Tasks are implemented with focus on simplicity and reliability
- **Review & Alignment:** Regular reviews to ensure progress aligns with goals
- **Completion:** Tasks marked complete only after thorough testing
- **Philosophy:** Simplicity, robustness, and maintainability first!

### 3.2. Board

**Current Focus - N8N Integration & Cleanup**

- **Critical N8N Tasks**
  - [ ] Verify N8N workflow configuration matches current database schema (Priority: CRITICAL)
  - [ ] Test N8N webhook endpoint with cleaned frontend (Priority: CRITICAL)
  - [ ] Ensure conversation and message persistence works correctly (Priority: CRITICAL)
  - [ ] Configure N8N_WEBHOOK_URL environment variable (Priority: CRITICAL)
  - [ ] Test transcript search functionality in N8N workflow (Priority: HIGH)
  - [ ] Implement proper error handling in N8N workflow (Priority: HIGH)

- **Frontend Simplification**
  - [ ] Test simplified chat interface without audio/voice features (Priority: HIGH)
  - [ ] Verify search toggle functionality still works (Priority: MEDIUM)
  - [ ] Ensure transcript management still functions properly (Priority: HIGH)
  - [ ] Test admin management features (Priority: MEDIUM)
  - [ ] Update any remaining references to removed features (Priority: MEDIUM)

- **Database & Backend**
  - [ ] Review and optimize database indexes for N8N queries (Priority: MEDIUM)
  - [ ] Clean up any unused database tables or columns (Priority: LOW)
  - [ ] Document N8N workflow integration points (Priority: MEDIUM)
  - [ ] Create backup/restore procedures for N8N workflow (Priority: LOW)

- **Testing & Deployment**
  - [ ] Create comprehensive test plan for N8N integration (Priority: HIGH)
  - [ ] Test authentication flow with simplified system (Priority: HIGH)
  - [ ] Document deployment process for N8N workflow (Priority: MEDIUM)
  - [ ] Create monitoring/logging strategy for N8N (Priority: MEDIUM)

**Future Enhancements**
- [ ] Analytics dashboard rebuild with better insights (Priority: LOW)
- [ ] Voice/audio features reimplementation if needed (Priority: LOW)
- [ ] Advanced transcript processing features (Priority: LOW)
- [ ] User experience improvements based on feedback (Priority: MEDIUM)

*Task Format:* Markdown checkboxes (`[ ]` To Do, `[/]` In Progress, `[x]` Done), description, priority, status

## 4. Log / Changelog

This document tracks completed tasks and implementations.

### Phase 1: Major Cleanup - Voice/Audio/Analytics Removal ✅
- Removed all voice input components (AudioPlayer, VoiceConversation)
- Removed all audio playback hooks (useAudio, useAudioPlayer, useAudioPlayback, useVoiceInput)
- Removed Vertex AI integration (VertexAIValidator, setup pages, utilities)
- Removed analytics components and pages
- Removed War Room page
- Cleaned up Header and App.tsx to remove references to deleted pages
- Simplified useChat hook to remove audio handling
- Updated ChatContainer and ChatInputBar to remove audio props
- Simplified UnifiedInputBar to basic text input only
- Updated package.json to remove unnecessary dependencies
- Simplified gemini-chat edge function to just forward to N8N
- Removed unnecessary edge functions (speech-to-text, text-to-speech, analytics, etc.)

### Phase 2: Edge Function Simplification ✅
- Streamlined gemini-chat function to be a simple N8N webhook forwarder
- Removed all Vertex AI related code
- Removed analytics tracking
- Kept only essential authentication and request forwarding logic
- Removed process-transcript and reprocess-transcript functions (handled by N8N)

### Phase 3: Component Simplification ✅
- Reduced useChat hook from 390 to ~300 lines
- Removed all audio state management
- Simplified message sending logic
- Cleaned up retry logic
- Removed file upload handling (kept UI for future use)

## 5. Context & Guidelines

### 5.1. Principles
- **Simplicity First:** Remove complexity, keep only what's essential
- **Robustness:** Build reliable systems that fail gracefully
- **Maintainability:** Code should be easy to understand and modify
- **N8N-Centric:** Let N8N handle the complex RAG logic

### 5.2. Architecture
- **Frontend:** React + TypeScript with minimal state management
- **Backend:** Supabase for auth/database, N8N for RAG workflow
- **Communication:** Simple edge function bridge to N8N webhook
- **Data Flow:** Frontend → Edge Function → N8N → Database

### 5.3. Dev Guidelines
- **Component size:** Target 200-250 lines max per component
- **Single responsibility:** Each component/function does one thing well
- **Error handling:** Always handle errors gracefully with user feedback
- **Testing:** Test critical paths thoroughly before marking complete

### 5.4. Lessons & Wins
- **Simplification works:** Removing 50%+ of code improved maintainability
- **N8N integration:** Offloading RAG to N8N simplifies the architecture
- **Focus matters:** Core chat functionality is more important than bells and whistles
- **Clean slate:** Sometimes rebuilding is better than patching

## 6. Roadmap / Ideas
- **Phase 1 (Current):** N8N integration and system simplification
- **Phase 2:** Enhanced transcript management and search
- **Phase 3:** Analytics dashboard rebuild with actionable insights
- **Phase 4:** Performance optimization and scaling
- **Future:** Voice features, advanced AI capabilities, mobile app