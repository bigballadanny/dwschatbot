
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

## 2. Process & Principles

### 2.1. First Principles Thinking
Break down complex problems into fundamental truths and reason up from there. Question assumptions and build solutions from the ground up, focusing on core user value.

### 2.2. Elon Musk's 5-Step Algorithm
1. **Make the requirements less dumb**
   - Challenge every requirement
   - Question where they come from and who made them
   - Ensure requirements make sense and aren't based on outdated assumptions

2. **Delete any part or process you can**
   - Get rid of unnecessary steps or components
   - Be willing to add them back later if needed
   - If you're not adding back at least 10%, you haven't deleted enough

3. **Simplify and Optimize**
   - After removing unnecessary elements, look for ways to simplify the design and process
   - Optimize for efficiency and effectiveness

4. **Accelerate Cycle Time**
   - Speed up the process, but only after the first three steps
   - Don't accelerate flawed processes

5. **Automate**
   - Automate the process, but only after it has been thoroughly optimized
   - Don't automate flawed processes

### 2.3. Zoom In/Zoom Out Methodology
Regularly alternate between the big picture (architecture, user journeys) and implementation details (optimizations, features) to maintain cohesion and quality.

### 2.4. Intuitive User Experience
Create interfaces that feel natural and require minimal explanation (clear navigation, thoughtful hierarchy, minimal cognitive load, progressive disclosure).

## 3. Session & Interaction Tracking

**Current Session: #{SESSION_COUNT}** (Updated: {TIMESTAMP})  
**Prompts Since Last Vibe Session: {PROMPT_COUNT}** (Vibe trigger at 5-7)  
**Last Vibe Session: {LAST_VIBE_TIMESTAMP}**

### 3.1. Prompt Tracking System
The workflow maintains a count of user prompts to ensure regular alignment sessions:
- Counter increments with each substantive user interaction
- Resets after each Vibe Session
- Vibe Sessions automatically triggered after 5-7 prompts
- Can be manually triggered with `Vibe Session` command

### 3.2. Vibe Session Guidelines
Vibe Sessions are critical alignment meetings that should:
1. Review all completed tasks since last session
2. Confirm task states and update status in the board
3. Extract and document any "golden nuggets" (key insights)
4. Plan next priorities and task groupings
5. Reset prompt counter after completion

### 3.3. Operational Modes
Our workflow uses two primary modes:

- **Code Mode:** Implementation, debugging, refactoring, technical tasks
- **Vibe Mode:** Planning, review, alignment, strategy, insights gathering

### 3.4. Mode Transition Indicators
Use the following commands to explicitly switch modes:
- `Mode: Code` - Switch to implementation focus
- `Mode: Vibe` - Switch to planning and alignment focus
- `Vibe Session` - Trigger a comprehensive review session

## 4. Task Board & Goals

### 4.1. Command Reference
- `Workflow Check`: Review current task statuses and update accordingly
- `Vibe Session`: Conduct alignment meeting to review progress (every 5-7 prompts)
- `Session Count: {n}`: Update the session counter
- `Prompt Count: {n}`: Update the prompt counter

### 4.2. Golden Nuggets Strategy

#### Vision & Goals
- Extract high-value, actionable insights ("golden nuggets") from transcript content
- Make these insights searchable and contextually available during user conversations
- Create a knowledge base of practical business acquisition strategies
- Provide users with immediate access to the most valuable parts of content

#### Implementation Plan
1. **Enhanced AI Prompting:**
   - Update Vertex AI Gemini 1.5 Flash 002 prompts to identify and extract nuggets
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

#### Technical Requirements
- Enhanced prompt engineering with Vertex AI Gemini 1.5 Flash 002 models
- Database schema updates for nugget storage
- Semantic search capabilities for relevant retrieval
- UI components for nugget presentation
- Analytics to track nugget usage and value

### 4.3. Current Tasks

**Current Focus (Phase 10: Workflow Optimization)**
*   **Workflow Enhancement ⚙️**
    -   [x] Implement prompt tracking counter - Status: Done
    -   [x] Create structured Vibe Session process - Status: Done
    -   [x] Move completed tasks to CHANGELOG.md - Status: Done
    -   [x] Add session metadata tracking - Status: Done
    -   [x] Document Vertex AI model versions precisely - Status: Done
    -   [x] Consolidate archived files into CHANGELOG.md - Status: Done
    -   [x] Reorganize WORKFLOW.md for better structure - Status: Done
    -   [x] Fix TranscriptSummary.tsx toast imports - Status: Done
    -   [x] Refactor TranscriptSummary.tsx into smaller components - Status: Done
    -   [ ] Add Elon Musk's 5-step algorithm to workflow - Status: In Progress

**Current Focus (Phase 9 & Ongoing)**

*   **Vertex AI Integration 🚀**
    -   [ ] Optimize token usage in conversations (Priority: Medium) - Status: To Do
    -   [ ] Implement Vertex AI diagnostics and testing tools (Priority: Medium) - Status: To Do
    -   [ ] Fix JWT token generation in Vertex AI authentication (Priority: High) - Status: To Do
    -   [x] Upgrade to Vertex AI Gemini 1.5 Flash 002 model for enhanced features (Priority: High) - Status: Done
*   **Optimization Tasks ⚡**
    -   [ ] Improve message caching strategy (Priority: Medium) - Status: To Do
    -   [ ] Implement proper token bucket rate limiting (Priority: Low) - Status: To Do
    -   [ ] Add request batching for frequently asked questions (Priority: Low) - Status: To Do
    -   [ ] Optimize context window usage (Priority: Medium) - Status: To Do
*   **UI Improvements ✨**
    -   [ ] Enhance message list animations and transitions (Priority: Low) - Status: To Do
*   **Golden Nuggets Extraction 💎** 
    -   [x] Update transcript summary UI to highlight golden nuggets (Priority: Medium) - Status: Done
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

## 5. Development Guidelines

### 5.1. Architecture
-   **State Management:** React Context API for global state (auth, preferences), local state for UI concerns, Supabase for persistence.
-   **Data Flow:** Unidirectional data flow, custom hooks for fetching/processing, error boundaries.
-   **API Integration:** Supabase (backend/auth), Vertex AI API (AI features), Edge functions (secure interactions).

### 5.2. Dev Guidelines
-   **Code Implementation:** Modular components, consistent naming, TypeScript, comments for complex logic, optimize for readability/maintainability.
-   **AI Strategy:** Use Vertex AI Gemini models for analytical tasks, balance with performance/cost, implement fallbacks.
-   **Model Versioning:** Currently using "Vertex AI Gemini 1.5 Flash 002" as our primary model for all interactions.
-   **File Structure:** Small, focused components (<200 lines), separate logic (hooks/utils), group related components, dedicated type files.

### 5.3. Supabase/Frontend Alignment
- Always verify model alignment between frontend types and database schema
- Implement proper data transformation between DB and UI formats
- Use defensive programming to handle schema variations
- Add comprehensive logging for easier debugging

## 6. Roadmap / Ideas
-   **Enhanced War Room:** Financial ratio analysis, industry comparison, due diligence checklist automation.
-   **Learning Pathways:** Personalized recommendations, progress tracking, interactive exercises.
-   **Community Features:** Discussion forums, expert Q&A, peer networking.
-   **Nugget Repository:** Searchable library of golden nuggets extracted from all content.

## 🔄 Version History
- v1.0 (2025-04-16): Initial consolidated workflow with protection protocol
- v1.1 (2025-04-16): Added prompt tracking and enhanced Vibe Session framework
- v1.2 (2025-04-16): Integrated Elon Musk's 5-step algorithm and reorganized structure
- v1.3 (2025-04-16): Refactored TranscriptSummary and implemented Golden Nuggets UI
- v1.4 (2025-04-16): Updated AI model to Vertex AI Gemini 1.5 Flash 002
