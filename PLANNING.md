
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
  - `analyze_chunking_quality()`: Evaluate chunking effectiveness
  - `estimate_embedding_tokens()`: Estimate token usage for embeddings
  - Future enhancements: Hierarchical chunking, better semantic chunking

#### pgvector_client.py
- Purpose: Interface with Supabase PGVector for vector storage
- Key functions: 
  - `store_embedding()`: Store text chunks as embeddings
  - `query_embeddings()`: Search for relevant embeddings
  - `record_feedback()`: Collect and store user feedback
  - `delete_embeddings_by_metadata()`: Remove embeddings for re-chunking
  - Future enhancements: Advanced vector search options

#### supabase_client.py
- Purpose: Interface with Supabase for storage and metadata
- Key functions: 
  - `upload_file()`: Store original documents
  - `insert_metadata()`: Track document information
  - Future enhancements: Improved error handling, transaction support

#### ingest_pipeline.py
- Purpose: Orchestrate the process of ingesting transcripts
- Key functions:
  - `ingest_transcript()`: Process, chunk, and store a transcript
  - `rechunk_transcript()`: Re-process existing transcripts with new parameters
  - `batch_rechunk_transcripts()`: Update all existing transcripts 
  - Future enhancements: Parallel processing, progress tracking

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

## Re-Chunking Process

Our system supports dynamic re-chunking of existing content as chunking strategies improve:

1. **Initiate Re-Chunking**: Admin initiates re-chunking process with new parameters
2. **Retrieve Content**: System retrieves original transcript content
3. **Delete Old Embeddings**: Remove existing embeddings for the transcript
4. **Apply New Chunking**: Process content with updated chunking parameters
5. **Store New Embeddings**: Create and store new embeddings with updated chunks
6. **Update Metadata**: Mark transcript as re-processed with timestamp

## Development Phases

### Phase 1: Foundation (COMPLETE)
- Basic chat interface
- Initial RAG implementation
- Supabase integration

### Phase 2: Enhanced Retrieval (COMPLETE)
- PGVector integration for vector storage
- Improved context selection
- Multi-document support
- Query transformation and expansion

### Phase 3: Feedback Loop (COMPLETE)
- User feedback collection mechanism
- Relevance tracking system
- Automatic score updating via database triggers
- Performance monitoring

### Phase 4: Dynamic Re-Chunking (CURRENT)
- Content re-processing capabilities
- Chunking quality analysis
- Batch operations for system-wide updates
- Token usage estimation

### Phase 5: Advanced Features (PLANNED)
- User preference tracking
- Conversation history integration
- Response customization options

### Phase 6: Optimization (PLANNED)
- Performance tuning
- Cost optimization
- Metrics and monitoring

## Style & Conventions

- Python (PEP8, type hints, pydantic for validation)
- Modular, testable code
- All new features require unit tests
- Update documentation with every major change
- Store all secrets and API keys in Supabase, never in code

## Environment Configuration

All sensitive information and configuration should be stored as environment variables:
- `SUPABASE_URL` and `SUPABASE_KEY`: For Supabase storage, database, and PGVector access

## Component-Specific Planning

### LightRAG/rag_agent.py
- Current status: PGVector integration complete
- Next steps: 
  - Enhance hybrid retrieval combining vector search and keyword matching
  - Add advanced result re-ranking based on relevance scores and feedback
  - Support filtering by document metadata

### LightRAG/rag_pipeline.py
- Current status: Enhanced chunking implemented
- Next steps:
  - Implement hierarchical document chunking
  - Add better sentence boundary detection
  - Support custom chunking strategies

### PGVector Integration
- Current status: Client implemented with feedback loop
- Next steps:
  - Enhance error handling
  - Implement batched operations
  - Optimize metadata filtering

### Supabase Integration
- Current status: Basic client implemented
- Next steps:
  - Improve error handling and retry logic
  - Add transaction support
  - Support more metadata types

### Feedback System
- Current status: Feedback collection implemented with automatic relevance scoring
- Next steps:
  - Add feedback UI components
  - Implement feedback analysis
  - Personalized relevance scores

## Application TODOs

- Add frontend UI for feedback collection
- Create an admin interface for re-chunking operations
- Implement batch transcript processing with progress tracking
- Add visualization for chunking quality metrics
