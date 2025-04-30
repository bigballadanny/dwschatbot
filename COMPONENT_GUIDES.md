
# Component Guides

This document contains detailed information and guidelines for each major component of the system. When working on a specific component, consult this guide to understand the design principles, implementation details, and future plans.

## LightRAG Agent (rag_agent.py)

### Purpose
The LightRAG Agent is the core component responsible for query processing, knowledge retrieval, and response generation.

### Design Principles
- **Simplicity**: Keep the interface clean and focused
- **Extensibility**: Design for easy addition of new retrieval strategies
- **Testability**: Ensure all logic can be unit tested with mock knowledge bases

### Implementation Details
- `LightRAGAgent` class initializes with a knowledge base (defaults to Mem0Client)
- `query()` method is the main entry point, accepting query text and optional filters
- Results are returned as a list of relevant text passages

### Zoom-In Development Tasks
- Add hybrid retrieval by combining vector similarity and keyword matching
- Implement result re-ranking based on relevance scores
- Add support for conversation history context

### Usage Examples
```python
from LightRAG.rag_agent import LightRAGAgent

# Initialize with default knowledge base
agent = LightRAGAgent()

# Query the knowledge base
results = agent.query("What is the acquisition strategy?")

# Query with topic filter
results = agent.query("What is the acquisition strategy?", topic="finance")
```

## RAG Pipeline (rag_pipeline.py)

### Purpose
The RAG Pipeline handles document processing, chunking, and preparation for vector storage.

### Design Principles
- **Configurable**: Allow customization of chunking parameters
- **Robust**: Handle various document formats and edge cases
- **Efficient**: Process documents in an optimized way

### Implementation Details
- `chunk_transcript()` splits documents into overlapping chunks of sentences
- Currently using regex-based sentence splitting
- Returns a list of text chunks ready for embedding

### Zoom-In Development Tasks
- Implement hierarchical document chunking (document → section → paragraph)
- Improve sentence boundary detection for better chunk quality
- Add support for custom chunking strategies

### Usage Examples
```python
from LightRAG.rag_pipeline import chunk_transcript

# Basic chunking
chunks = chunk_transcript(transcript_text)

# Custom chunk size and overlap
chunks = chunk_transcript(transcript_text, chunk_size=10, overlap=2)
```

## mem0 Client (mem0_client.py)

### Purpose
The mem0 Client provides an interface to the vector database for storing and retrieving embeddings.

### Design Principles
- **Simple API**: Provide straightforward methods for common operations
- **Error Handling**: Gracefully handle connection issues and API errors
- **Configuration**: Support customization through environment variables

### Implementation Details
- `Mem0Client` class handles communication with the mem0 service
- `store_embedding()` saves text and metadata as vector embeddings
- `query_embeddings()` retrieves relevant content based on semantic similarity

### Zoom-In Development Tasks
- Add robust error handling and retry logic
- Implement batched operations for better performance
- Add support for filtering by metadata

### Usage Examples
```python
from LightRAG.mem0_client import Mem0Client

# Initialize client
client = Mem0Client()

# Store an embedding
client.store_embedding({
    "text": "Sample document text",
    "topic": "finance"
})

# Query for similar content
results = client.query_embeddings("financial strategy")
```

## Supabase Client (supabase_client.py)

### Purpose
The Supabase Client handles file storage, metadata management, and structured data persistence.

### Design Principles
- **Consistent Interface**: Provide uniform methods for common operations
- **Security**: Follow best practices for authentication and data access
- **Resilience**: Handle API errors and network issues gracefully

### Implementation Details
- Functions to upload files to Supabase Storage
- Functions to insert and query metadata in Supabase Database
- Environment-based configuration

### Zoom-In Development Tasks
- Improve error handling and retry logic
- Add transaction support for related operations
- Support more metadata types and query patterns

### Usage Examples
```python
from LightRAG.supabase_client import upload_file, insert_metadata

# Upload a transcript file
upload_file("transcripts", "local_file.txt", "remote_file.txt")

# Store metadata about the file
insert_metadata("transcript_meta", {
    "filename": "remote_file.txt",
    "topic": "finance"
})
```

## Streamlit App (app.py)

### Purpose
The Streamlit App provides the user interface for interacting with the RAG system.

### Design Principles
- **Intuitive**: Make the interface easy to understand and use
- **Responsive**: Provide feedback during processing operations
- **Clean**: Maintain a clean, distraction-free design

### Implementation Details
- Chat interface for querying the knowledge base
- File uploader for ingesting new documents
- Settings panel for configuring behavior

### Zoom-In Development Tasks
- Add conversation history sidebar
- Implement feedback buttons for responses
- Create document upload progress indicators

### Usage Examples
```python
# Run the Streamlit app
# streamlit run app.py
```

## Testing Framework (tests/)

### Purpose
The Testing Framework ensures code quality, correctness, and prevents regressions.

### Design Principles
- **Comprehensive**: Test all critical code paths
- **Isolated**: Use mocks and fixtures to isolate units under test
- **Clear**: Make test failures easy to diagnose

### Implementation Details
- Unit tests for core modules
- Integration tests for end-to-end functionality
- Test utilities and fixtures

### Zoom-In Development Tasks
- Increase test coverage to >80%
- Add integration tests for the full RAG pipeline
- Implement performance benchmarking

### Usage Examples
```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_rag_agent.py

# Run with coverage reporting
pytest --cov=LightRAG
```
