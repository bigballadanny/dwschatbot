**1. Goal:**
To create a single, consolidated Markdown file that efficiently manages project tasks, documents workflows and operational modes, and incorporates essential context from the current `SYNTHIOS.md`, `TASKBOARD.md`, and `CHANGELOG.md`.

**2. Proposed New File:**
`WORKFLOW.md` (Revised from `PROJECT_WORKFLOW.md` for conciseness).

**3. Revised Structure of `WORKFLOW.md`:**

```markdown
# WORKFLOW.md

## 1. Overview & Goals
   - High-level summary of the project's purpose and objectives.
   - *Migration Source: `SYNTHIOS.md` (Project Overview section)*

## 2. Modes
   - Detailed description of each mode (Code, Architect, Ask, Debug, Boomerang) and its role.
   - *Migration Source: New content based on user request.*

## 3. Workflow & Tasks
   ### 3.1. Process
      - Outline of task lifecycle (identification, definition, prioritization, execution, completion).
      - Role of modes and task breakdown.
      - *Migration Source: `SYNTHIOS.md` (Development Workflow), `TASKBOARD.md` (Process Guidelines)*
   ### 3.2. Board
      - **Epics / Goals:** (Optional)
         - `Epic Name`
           - `[ ] Task (Priority) - Status - Notes (Mode?)`
           - `[/] Task ...`
           - `[x] Task ... (See Log [YYYY-MM-DD])`
      - **Current Focus:**
         - `[ ] Task ...`
      - **Backlog:**
         - `[ ] Task ...`
      - *Task Format:* Markdown checkboxes (`[ ]`, `[/]`, `[x]`), description, priority, status, notes.
      - *Migration Source: `TASKBOARD.md` (Adapted format)*

## 4. Log / Changelog
   - Chronological log of completed tasks/milestones.
   - `YYYY-MM-DD / Phase X:`
     - `- Completed Task A (Ref: Epic/Task)`
     - `- Implemented Feature B`
   - *Migration Source: `CHANGELOG.md`*

## 5. Context & Guidelines
   ### 5.1. Principles
      - Core project philosophies.
      - *Migration Source: `SYNTHIOS.md` (Core Principles)*
   ### 5.2. Architecture
      - Key technical architecture decisions.
      - *Migration Source: `SYNTHIOS.md` (Technical Architecture)*
   ### 5.3. Dev Guidelines
      - Coding standards, file structure, AI strategy.
      - *Migration Source: `SYNTHIOS.md` (Relevant sections)*
   ### 5.4. Lessons & Wins
      - Key takeaways, optimizations, pitfalls.
      - *Migration Source: `SYNTHIOS.md` & `CHANGELOG.md` (Lessons/Wins)*

## 6. Roadmap / Ideas
   - Future development plans.
   - *Migration Source: `SYNTHIOS.md` (Future Innovations)*

```

**4. Migration Strategy Summary:**
Content from `SYNTHIOS.md`, `TASKBOARD.md`, and `CHANGELOG.md` will be migrated into the corresponding, efficiently named sections of `WORKFLOW.md`.

**5. Archiving Plan for Old Files:**
1.  Rename files to `ARCHIVED_SYNTHIOS.md`, `ARCHIVED_TASKBOARD.md`, `ARCHIVED_CHANGELOG.md`.
2.  Add the following note at the top of each renamed file:
    ```markdown
    # ARCHIVED - Replaced by WORKFLOW.md

    ---
    (Original content follows)
    ```

**6. Next Steps:**
*   Upon approval, switch to **Code mode**.
*   Code mode will create the `Roo coding` branch, create `WORKFLOW.md` with the approved structure/content, and archive the old files.