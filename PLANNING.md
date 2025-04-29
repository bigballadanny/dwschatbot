# Project Planning

## Overview & Goals
This project creates a user interface and dashboard for new users in the mergers and acquisition space to access and learn from Carl Allen's Deal Maker Society resources.

### Key Components
- Admin portal for uploading and managing transcripts (90-minute Zoom meetings, ~5/week)
- Cloud-native, Docker-free production architecture
- Supabase for file storage, metadata, and vector storage (via pgvector)
- mem0 as the intelligent vector API layer (using Supabase backend)
- LightRAG as the orchestrator for ingestion, chunking, embedding, and retrieval
- User-facing dashboard for searching and interacting with transcript content
- Analytics and logging for admin insights

## Principles & Methodologies
- **First Principles Thinking:** Break down complex problems into fundamental truths and reason up from there. Question assumptions and build solutions from the ground up, focusing on core user value.
- **Elon Musk's 5-Step Algorithm:**
  1. Make the requirements less dumb
  2. Delete any part or process you can
  3. Simplify and optimize
  4. Accelerate cycle time
  5. Automate (only after optimizing)
- **Zoom In/Zoom Out Methodology:** Alternate between big-picture architecture and implementation details.
- **Intuitive User Experience:** Prioritize natural, easy-to-use interfaces.

## Vision & Strategy
- Extract high-value, actionable insights ("golden nuggets") from transcript content
- Make insights searchable and contextually available during user conversations
- Create a knowledge base of practical business acquisition strategies
- Provide users with immediate access to the most valuable content

## Architecture Overview

### Ingestion Pipeline
1. Admin uploads transcript (file or text) via portal or API.
2. LightRAG pipeline:
   - Uploads file to Supabase Storage.
   - Stores transcript metadata in Supabase (Postgres).
   - Chunks transcript (configurable size/overlap).
   - Embeds each chunk.
   - Stores chunks + embeddings in mem0 (Supabase/pgvector backend).

### Retrieval Pipeline
1. User query (chatbot, analytics, etc.).
2. LightRAG embeds the query.
3. mem0 performs vector search (Supabase backend).
4. LightRAG fetches top-K chunks, joins with transcript metadata from Supabase, returns context.

### Analytics & Logging
- All uploads, queries, and user interactions logged in Supabase for analytics.

## Database Schema (Supabase)

### Tables
- `transcripts`: id (uuid, PK), title, date, participants, file_url, created_by, created_at, metadata
- `transcript_chunks`: id (uuid, PK), transcript_id (FK), chunk_index, text, embedding (vector), start_time, end_time, created_at
- `query_logs`: id (uuid, PK), user_id, query_text, timestamp, matched_chunk_ids

## Implementation Roadmap
- [ ] Transcript upload portal (web UI & API)
- [ ] Ingestion pipeline (LightRAG + mem0 + Supabase integration)
- [ ] Chunking & embedding (configurable, robust)
- [ ] Vector storage in mem0 (Supabase backend)
- [ ] Retrieval pipeline (LightRAG + mem0 + Supabase metadata join)
- [ ] Query logging & analytics
- [ ] Pytest unit tests for all endpoints and critical logic
- [ ] Documentation updates (README, PLANNING.md)

## Clean-Up & Removal Plan
- Remove Genkit-related files/configs
- Remove Docker-specific configs for production (keep only for local/dev if needed)
- Remove old/unused ingestion or vector DB code not aligned with the new architecture
- Remove legacy endpoints/scripts unrelated to LightRAG, mem0, or Supabase
- Remove obsolete config files for unused vector DBs
- Remove any non-Supabase storage backends/adapters
- Remove redundant or duplicate test files

## Next Steps
1. Implement Supabase client logic for file upload and metadata insert (Python SDK)
2. Update embedding logic to use preferred model (OpenAI, HuggingFace, etc.)
3. Update Mem0SSEClient.save_memory to support embeddings/metadata if supported
4. Refactor retrieval pipeline for production use
5. Expand Pytest tests and update documentation
6. Mark completed tasks and add discovered TODOs in TASK.md

## TODOs & Placeholders
- [ ] Add actual Supabase integration code to ingestion pipeline
- [ ] Add robust chunking and embedding logic
- [ ] Update admin portal and endpoints as needed
- [ ] Confirm all Docker and Genkit remnants are removed
- [ ] Review and update all documentation

## Available MCPs & Integration Plan

| MCP Name           | Purpose/Integration Point                                        |
|--------------------|------------------------------------------------------------------|
| context7           | Context management for global/session context.                   |
| sequential-thinking| Chain-of-thought reasoning, planning, and logging.               |
| supabase           | Structured data storage (users, sessions, metadata, logs).        |
| mem0               | Vector store for embeddings and context retrieval (LightRAG backend).|
| github             | GitHub API access for code search and repo management.           |
| brave-search       | Web search for research and external context.                    |

**LightRAG Integration:**
- Uses mem0 for vector storage and retrieval.
- Uses supabase for structured data and logs.
- Uses brave-search for external context if needed.
- sequential-thinking for project planning, logging, and breakdowns.
- context7 for maintaining global/session context.
- github for code/doc enrichment (optional).

---

*This file is auto-generated from the previous WORKFLOW.md for clarity and modularity.*
