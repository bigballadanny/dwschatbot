
# WORKFLOW TEMPLATE

## 🔒 IMPORTANT: WORKFLOW PROTECTION PROTOCOL 🔒

This file is critical project documentation. Changes require:
1. Explicit user confirmation before deletion
2. Version backup before major changes
3. Verification code for structural changes: "PROTECT-WORKFLOW"

## 1. Project Overview
[Brief description of project goals, purpose, and high-level objectives]

## 2. First Principles & Optimization

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

## 3. Operational Modes
- **Code Mode:** Implementation, debugging, refactoring
- **Architect Mode:** Planning, system design, technical vision
- **Ask Mode:** Information, explanations, clarifications
- **Debug Mode:** Issue diagnosis, error resolution
- **Boomerang Mode:** Task orchestration, delegation to specialized modes

## 4. Workflow System

### 4.1. Process
- Task creation and documentation
- Prioritization (High/Medium/Low)
- Assignment and execution
- Review and alignment ("vibe sessions")
- Completion and logging
- Philosophy and principles

### 4.2. Session & Interaction Tracking

**Current Session: #{SESSION_COUNT}**  
**Prompts Since Last Vibe Session: {PROMPT_COUNT}**  
**Last Vibe Session: {LAST_VIBE_TIMESTAMP}**

#### Prompt Tracking System
- Counter increments with each substantive user interaction
- Resets after each Vibe Session
- Vibe Sessions automatically triggered after 5-7 prompts
- Can be manually triggered with `Vibe Session` command

#### Vibe Session Guidelines
Vibe Sessions are critical alignment meetings that should:
1. Review all completed tasks since last session
2. Confirm task states and update status in the board
3. Extract and document any "golden nuggets" (key insights)
4. Plan next priorities and task groupings
5. Reset prompt counter after completion

### 4.3. Task Board
**Current Focus (Phase X)**
- [ ] Task description (Priority: High/Medium/Low) - Status: To Do/In Progress
- [/] Task in progress with notes
- [x] Completed task (YYYY-MM-DD)

**Backlog**
- [ ] Future task (Priority)

### 4.4. Golden Nuggets Strategy

#### Vision & Goals
- Extract high-value, actionable insights from content
- Make insights searchable and contextually available
- Create a knowledge base of practical strategies
- Provide users with immediate access to valuable content

#### Implementation Plan
1. **Enhanced AI Prompting**
2. **Data Structure**
3. **UI Enhancements**
4. **Integration**
5. **Analytics & Improvement**

### 4.5. Command Reference
- `Workflow Check`: Review and update task statuses
- `Vibe Session`: Alignment meeting to review progress
- `Mode: [mode name]`: Explicitly switch operational mode
- `Session Count: {n}`: Update the session counter
- `Prompt Count: {n}`: Update the prompt counter

## 5. Development Guidelines

### 5.1. Architecture
[Key architectural decisions and patterns]

### 5.2. Dev Guidelines
- Modular components with focused responsibilities
- Consistent naming conventions
- TypeScript for type safety
- Comments for complex logic
- Optimize for readability and maintainability

### 5.3. Model Versioning
- Always specify EXACT model versions (e.g., "Vertex AI Gemini 1.5 Pro" not just "Gemini 2.0")
- Track model behavior changes and document version-specific optimizations
- Test prompt performance across different model versions when possible

### 5.4. Lessons & Improvements
[Key takeaways, optimizations, pitfalls to avoid]

## 6. Future Roadmap
[Planned features, improvements, strategic direction]

## 7. Completed Tasks Log
[Move completed tasks from section 4.3 to here regularly]

## 🔄 Version History
- v1.0 (YYYY-MM-DD): Initial template creation
- v1.1 (YYYY-MM-DD): Added sections and command references
