
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

## Component Architecture

### LightRAG Core Components

#### rag_agent.py
- Purpose: Core querying logic for RAG system
- Key functions: 
  - `query()`: Process user queries and retrieve relevant information
  - Future enhancements: Re-ranking, hybrid search, context windowing

#### rag_pipeline.py
- Purpose: Process and chunk transcripts for storage
- Key functions: 
  - `chunk_transcript()`: Split documents into meaningful chunks
  - Future enhancements: Hierarchical chunking, better semantic chunking

#### mem0_client.py
- Purpose: Interface with mem0 vector store
- Key functions: 
  - `store_embedding()`: Store text chunks as embeddings
  - `query_embeddings()`: Search for relevant embeddings
  - Future enhancements: Filter by metadata, hybrid search options

#### supabase_client.py
- Purpose: Interface with Supabase for storage and metadata
- Key functions: 
  - `upload_file()`: Store original documents
  - `insert_metadata()`: Track document information
  - Future enhancements: Improved error handling, transaction support

#### streamlit_app.py
- Purpose: UI for local development (not used in Lovable)
- Future enhancements: More interactive elements, tabbed interface

### Streamlit UI Components (app.py)

- Chat interface: Present conversation history and responses
- Ingestion interface: Upload and process documents
- Settings panel: Configure RAG behavior
- Feedback mechanism: Collect user feedback on responses

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

## Component-Specific Planning

### LightRAG/rag_agent.py
- Current status: Basic implementation complete
- Next steps: 
  - Implement hybrid retrieval combining vector search and keyword matching
  - Add result re-ranking based on relevance scores
  - Support filtering by document metadata
- Future considerations:
  - Multi-round conversation context
  - Streaming response support

### LightRAG/rag_pipeline.py
- Current status: Basic chunking implemented
- Next steps:
  - Implement hierarchical document chunking
  - Add better sentence boundary detection
  - Support custom chunking strategies
- Future considerations: 
  - Chunk overlap strategies
  - Language-specific processing

### mem0 Integration
- Current status: Basic client implemented
- Next steps:
  - Add robust error handling
  - Implement batched operations
  - Add support for metadata filtering
- Future considerations:
  - Performance optimizations
  - Caching strategies

### Supabase Integration
- Current status: Basic client implemented
- Next steps:
  - Improve error handling and retry logic
  - Add transaction support
  - Support more metadata types
- Future considerations:
  - Multi-user support
  - Access control

### Application TODOs
- Implement the first tasks in "RAG Enhancement" section from TASKS.md
- Focus on improving retrieval quality as top priority
- Add structured testing for all new functionality
- Regularly update documentation as architecture evolves

## TODOs

See TASKS.md for granular task tracking.
