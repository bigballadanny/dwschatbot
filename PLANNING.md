
# PLANNING.md

## Project Vision

Create a robust, modular, and production-ready Retrieval-Augmented Generation (RAG) chatbot for M&A topics, deployable on Lovable, with clear separation between UI, core logic, and integrations.

## Architecture Overview

- **Streamlit UI**: User-facing chatbot and ingestion interface.
- **LightRAG Core**: Agent logic, pipeline, and helpers.
- **Supabase**: Structured storage for files and metadata.
- **mem0**: Vector store for embeddings and retrieval.
- **/tests**: Unit tests for all core features.

## System Architecture

```
[User via Browser]
        |
   [Streamlit UI]
   /           \
[Chatbot]   [Ingestion]
   |             |
[LightRAG Agent] |---> [Supabase Storage: transcript files, metadata]
   |             |---> [mem0: vector embeddings for retrieval]
   |             |
[mem0: Query for relevant chunks]
   |
[Return answers to user]
```

## Development Phases

### Phase 1: Foundation (COMPLETE)
- Basic chat interface
- Initial RAG implementation
- Supabase integration
- See CHANGELOG.md for completed tasks

### Phase 2: Enhanced Retrieval (IN PROGRESS)
- Improved context selection
- Multi-document support
- Query transformation and expansion
- See TASKS.md for current progress

### Phase 3: Advanced Features (PLANNED)
- User preference tracking
- Conversation history integration
- Response customization options
- See TASKS.md under "Feature Enhancements"

### Phase 4: Optimization (PLANNED)
- Performance tuning
- Cost optimization
- Metrics and monitoring
- See TASKS.md under "Technical Improvements"

## Style & Conventions

- Python (PEP8, type hints, pydantic for validation)
- Modular, testable code
- All new features require unit tests
- Update documentation with every major change
- Store all secrets and API keys in Supabase, never in code

## Environment Configuration

All sensitive information and configuration should be stored as environment variables:
- `SUPABASE_URL` and `SUPABASE_KEY`: For Supabase storage and database access
- `MEM0_URL`: For mem0 vector store endpoint
- Any API keys needed for embedding models

## TODOs

See TASKS.md for granular task tracking.
