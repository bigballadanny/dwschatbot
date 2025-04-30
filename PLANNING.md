
# PLANNING.md

## Project Vision

Create a robust, modular, and production-ready Retrieval-Augmented Generation (RAG) chatbot for M&A topics, deployable on Lovable, with clear separation between UI, core logic, and integrations.

## Architecture Overview

- **Streamlit UI**: User-facing chatbot and ingestion interface.
- **LightRAG Core**: Agent logic, pipeline, and helpers.
- **Supabase**: Structured storage for files, metadata, and vector embeddings via PGVector.
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
   |             |---> [Supabase PGVector: vector embeddings for retrieval]
   |             |
[PGVector: Query for relevant chunks]
   |
[Return answers to user]
```

## Component Architecture

### LightRAG Core Components

#### rag_agent.py
- Purpose: Core querying logic for RAG system
- Key functions: 
  - `query()`: Process user queries and retrieve relevant information
  - `record_feedback()`: Store user feedback on retrieval results
  - Future enhancements: Re-ranking, hybrid search, context windowing

#### rag_pipeline.py
- Purpose: Process and chunk transcripts for storage
- Key functions: 
  - `chunk_transcript()`: Split documents into meaningful chunks
  - Future enhancements: Hierarchical chunking, better semantic chunking

#### pgvector_client.py
- Purpose: Interface with Supabase PGVector for vector storage
- Key functions: 
  - `store_embedding()`: Store text chunks as embeddings
  - `query_embeddings()`: Search for relevant embeddings
  - `record_feedback()`: Collect and store user feedback
  - Future enhancements: Filter by metadata, advanced vector search options

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

## Feedback Loop Architecture

A key enhancement to our system is the implementation of a feedback loop for continuous improvement:

1. **User Query**: User submits a question through the chat interface
2. **Retrieval**: System retrieves relevant content using vector similarity
3. **Response Generation**: AI generates response based on retrieved context
4. **User Feedback**: User indicates whether the response was helpful
5. **Feedback Storage**: System stores feedback in `embedding_feedback` table
6. **Scoring Update**: Database trigger updates relevance scores in `embeddings` table
7. **Enhanced Retrieval**: Future queries prioritize embeddings with higher relevance scores

## Development Phases

### Phase 1: Foundation (COMPLETE)
- Basic chat interface
- Initial RAG implementation
- Supabase integration
- See CHANGELOG.md for completed tasks

### Phase 2: Enhanced Retrieval (IN PROGRESS)
- PGVector integration for vector storage
- Improved context selection
- Multi-document support
- Query transformation and expansion
- See TASKS.md for current progress

### Phase 3: Feedback Loop (IN PROGRESS)
- User feedback collection mechanism
- Relevance tracking system
- Automatic score updating
- Performance monitoring

### Phase 4: Advanced Features (PLANNED)
- User preference tracking
- Conversation history integration
- Response customization options
- See TASKS.md under "Feature Enhancements"

### Phase 5: Optimization (PLANNED)
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
- `SUPABASE_URL` and `SUPABASE_KEY`: For Supabase storage, database, and PGVector access
- Any API keys needed for embedding models

## Component-Specific Planning

### LightRAG/rag_agent.py
- Current status: PGVector integration complete
- Next steps: 
  - Enhance hybrid retrieval combining vector search and keyword matching
  - Add advanced result re-ranking based on relevance scores and feedback
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

### PGVector Integration
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

### Feedback System
- Current status: Basic feedback collection implemented
- Next steps:
  - Add feedback UI components
  - Implement feedback analysis
  - Automatic relevance scoring
- Future considerations:
  - Advanced learning algorithms
  - Personalized relevance scores

### Application TODOs
- Implement integration tests for the PGVector client and feedback system
- Add structured testing for all new functionality
- Regularly update documentation as architecture evolves

## TODOs

See TASKS.md for granular task tracking.
