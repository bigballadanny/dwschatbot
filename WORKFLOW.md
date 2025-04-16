# WORKFLOW.md

## 🔒 IMPORTANT: WORKFLOW PROTECTION PROTOCOL 🔒

This file is critical project documentation. Changes require:
1. Explicit user confirmation before deletion
2. Version backup before major changes
3. Verification code for structural changes: "PROTECT-WORKFLOW"

## 1. Overview & Goals
This project creates a user interface and dashboard for new users in the mergers and acquisition space to access and learn from Carl Allen's Deal Maker Society resources. Key components include:

1.  **User-facing dashboard** for accessing and searching transcript content
2.  **Admin analytics section** to track user engagement and identify popular topics
3.  **War Room** for users to upload potential business documents for AI analysis
4.  **Transcript management system** for organizing educational content

## 2. Session & Interaction Tracking

**Current Session: #{SESSION_COUNT}** (Updated: {TIMESTAMP})  
**Prompts Since Last Vibe Session: {PROMPT_COUNT}** (Vibe trigger at 5-7)  
**Last Vibe Session: {LAST_VIBE_TIMESTAMP}**

### Prompt Tracking System
The workflow maintains a count of user prompts to ensure regular alignment sessions:
- Counter increments with each substantive user interaction
- Resets after each Vibe Session
- Vibe Sessions automatically triggered after 5-7 prompts
- Can be manually triggered with `Vibe Session` command

### Vibe Session Guidelines
Vibe Sessions are critical alignment meetings that should:
1. Review all completed tasks since last session
2. Confirm task states and update status in the board
3. Extract and document any "golden nuggets" (key insights)
4. Plan next priorities and task groupings
5. Reset prompt counter after completion

## 3. Operational Modes
Our workflow uses two primary modes:

- **Code Mode:** Implementation, debugging, refactoring, technical tasks
- **Vibe Mode:** Planning, review, alignment, strategy, insights gathering

### Mode Transition Indicators
Use the following commands to explicitly switch modes:
- `Mode: Code` - Switch to implementation focus
- `Mode: Vibe` - Switch to planning and alignment focus
- `Vibe Session` - Trigger a comprehensive review session

## 4. Workflow & Tasks

### 4.1. Process
-   **Task Identification & Definition:** New tasks or requirements are identified and documented in the "Board" section below. Complex tasks should be broken down into smaller, manageable chunks.
-   **Prioritization:** Tasks are prioritized based on project goals and dependencies.
-   **Execution:** Tasks are assigned to or picked up by the appropriate mode. Focus on one task at a time, implementing small, targeted changes after analyzing the full scope.
-   **Review & Alignment:** Regular "vibe sessions" (every 5-7 prompts) should be conducted to review progress, align understanding, and update the task board.
-   **Completion:** Tasks are marked as complete (`[x]`) only after being fully tested and verified. Completed tasks are then moved to the CHANGELOG.md with completion date. Add new observations or bugs found during development to the board.
-   **Philosophy:** Remember: Every challenge is an opportunity for elegant solutions! 💡

### 4.2. Command Reference
- `Workflow Check`: Review current task statuses and update accordingly
- `Vibe Session`: Conduct alignment meeting to review progress (every 5-7 prompts)
- `Session Count: {n}`: Update the session counter
- `Prompt Count: {n}`: Update the prompt counter

### 4.3. Board

**Current Focus (Phase 10: Workflow Optimization)**
*   **Workflow Enhancement ⚙️**
    -   [ ] Implement prompt tracking counter (Priority: High) - Status: In Progress
    -   [ ] Create structured Vibe Session process (Priority: High) - Status: In Progress
    -   [ ] Move completed tasks to CHANGELOG.md (Priority: Medium) - Status: In Progress
    -   [ ] Add session metadata tracking (Priority: Medium) - Status: In Progress
    -   [ ] Document Vertex AI model versions precisely (Priority: High) - Status: In Progress

**Current Focus (Phase 9 & Ongoing)**

*   **Vertex AI Integration 🚀**
    -   [ ] Optimize token usage in conversations (Priority: Medium) - Status: To Do
    -   [ ] Implement Vertex AI diagnostics and testing tools (Priority: Medium) - Status: To Do
    -   [ ] Fix JWT token generation in Vertex AI authentication (Priority: High) - Status: To Do
    -   [ ] Upgrade to Vertex AI Gemini 1.5 Pro model for enhanced summarization (Priority: High) - Status: In Progress
*   **Optimization Tasks ⚡**
    -   [ ] Improve message caching strategy (Priority: Medium) - Status: To Do
    -   [ ] Implement proper token bucket rate limiting (Priority: Low) - Status: To Do
    -   [ ] Add request batching for frequently asked questions (Priority: Low) - Status: To Do
    -   [ ] Optimize context window usage (Priority: Medium) - Status: To Do
*   **UI Improvements ✨**
    -   [ ] Enhance message list animations and transitions (Priority: Low) - Status: To Do
*   **Golden Nuggets Extraction 💎** 
    -   [ ] Update transcript summary UI to highlight golden nuggets (Priority: Medium) - Status: To Do
    -   [ ] Add search functionality for golden nuggets (Priority: Medium) - Status: To Do
    -   [ ] Create database schema for storing and retrieving golden nuggets (Priority: Medium) - Status: To Do
    -   [ ] Implement semantic search for golden nuggets (Priority: Low) - Status: To Do
    -   [ ] Add analytics for most valuable nuggets (Priority: Low) - Status: To Do
*   **Backend & AI Integration 🔧**
    -   [ ] Investigate analytics data capture issues (Vertex AI vs Gemini?) (Priority: High) - Status: To Do
    -   [ ] Review and improve analytics graphs/data pulling (Priority: Medium) - Status: To Do
    -   [ ] Fix "Generate AI Insights" feature (Check Vertex AI usage) (Priority: High) - Status: To Do
    -   [ ] Improve chat prompt for M&A focus (Analyze transcripts?) (Priority: Medium) - Status: To Do
    -   [ ] Investigate chat transcript usage for context (Priority: High) - Status: To Do
    -   [ ] Display references below chat responses (Priority: Medium) - Status: To Do
    -   [ ] Repurpose/Remove Vertex AI Setup code (Button removed, check related code) (Priority: Low) - Status: To Do
    -   [ ] Refine analytics insight prompts (Focus on admin needs, user strategies, confusion, content gaps) (Priority: Medium) - Status: To Do

*   **UI & Responsiveness ✨**
    -   [ ] Address mobile friendliness progressively (Priority: Medium) - Status: Ongoing

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

## 5. Context & Guidelines

### 5.1. Principles
-   **First Principles Thinking:** Break down complex problems into fundamental truths and reason up from there. Question assumptions and build solutions from the ground up, focusing on core user value.
-   **Zoom In/Zoom Out Methodology:** Regularly alternate between the big picture (architecture, user journeys) and implementation details (optimizations, features) to maintain cohesion and quality.
-   **Intuitive User Experience:** Create interfaces that feel natural and require minimal explanation (clear navigation, thoughtful hierarchy, minimal cognitive load, progressive disclosure).

### 5.2. Architecture
-   **State Management:** React Context API for global state (auth, preferences), local state for UI concerns, Supabase for persistence.
-   **Data Flow:** Unidirectional data flow, custom hooks for fetching/processing, error boundaries.
-   **API Integration:** Supabase (backend/auth), Vertex AI API (AI features), Edge functions (secure interactions).

### 5.3. Dev Guidelines
-   **Code Implementation:** Modular components, consistent naming, TypeScript, comments for complex logic, optimize for readability/maintainability.
-   **AI Strategy:** Use Vertex AI Gemini models for appropriate analytical tasks, balance with performance/cost, implement fallbacks.
-   **Model Versioning:** Always specify EXACT Vertex AI model versions (e.g., "Vertex AI Gemini 1.5 Pro" not just "Gemini 2.0")
-   **File Structure:** Small, focused components (<200 lines), separate logic (hooks/utils), group related components, dedicated type files.

### 5.4. Lessons & Wins
-   **Key Wins:** Reduced load time (40%), improved chat UX, intuitive analytics, fixed critical persistence issues, resilient saving mechanism, schema compatibility layer.
-   **Optimizations/Lessons Applied:** Breaking tasks down, regular "vibe sessions", structured documentation, consistent types, user testing, defensive programming, robust fallbacks, comprehensive logging.
-   **Common Pitfalls to Avoid:** Overengineering, neglecting UX, forgetting documentation.
-   **UX Patterns:** Progressive disclosure, consistent feedback, accessibility.

## 6. Golden Nuggets Strategy

### 6.1. Vision & Goals
- Extract high-value, actionable insights ("golden nuggets") from transcript content
- Make these insights searchable and contextually available during user conversations
- Create a knowledge base of practical business acquisition strategies
- Provide users with immediate access to the most valuable parts of content

### 6.2. Implementation Plan
1. **Enhanced AI Prompting:**
   - Update Vertex AI Gemini 1.5 Pro prompts to identify and extract nuggets
   - Use structured format for consistency and searchability
   - Focus on actionable strategies, not just information

2. **Data Structure:**
   - Store nuggets with metadata linking to source content
   - Include categorization and semantic embeddings for retrieval
   - Maintain relationship to original transcript context

3. **UI Enhancements:**
   - Highlight nuggets visually in transcript summaries
   - Enable filtering and searching specifically for nuggets
   - Create dedicated nugget browser/explorer component

4. **Chat Integration:**
   - Reference relevant nuggets during conversations
   - Allow users to explore related nuggets from chat interface
   - Display source context when nuggets are presented

5. **Analytics & Improvement:**
   - Track which nuggets users find most valuable
   - Use feedback to improve extraction process
   - Identify content areas needing more nugget extraction

### 6.3. Technical Requirements
- Enhanced prompt engineering with Vertex AI Gemini 1.5 Pro models
- Database schema updates for nugget storage
- Semantic search capabilities for relevant retrieval
- UI components for nugget presentation
- Analytics to track nugget usage and value

## 7. Roadmap / Ideas
-   **Enhanced War Room:** Financial ratio analysis, industry comparison, due diligence checklist automation.
-   **Learning Pathways:** Personalized recommendations, progress tracking, interactive exercises.
-   **Community Features:** Discussion forums, expert Q&A, peer networking.
-   **Nugget Repository:** Searchable library of golden nuggets extracted from all content.

## 🔄 Version History
- v1.0 (2025-04-16): Initial consolidated workflow with protection protocol
- v1.1 (2025-04-16): Added prompt tracking and enhanced Vibe Session framework
