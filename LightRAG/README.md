
# LightRAG

A lightweight Retrieval Augmented Generation (RAG) system for enhancing chatbot accuracy with document-based context.

## Environment Configuration

LightRAG requires the following environment variables to be set in a `.env` file at the root of the project:

```
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-key

# mem0 Configuration
MEM0_URL=http://localhost:8000  # or your mem0 server URL
MEM0_API_KEY=your-mem0-api-key  # optional, if your mem0 server requires authentication

# Optional: OpenAI Configuration (if using OpenAI embeddings)
OPENAI_API_KEY=your-openai-api-key
```

## Getting Started

1. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Create a `.env` file in the project root and add the required environment variables.

3. Run the application:
   ```
   streamlit run app.py
   ```

4. Open your browser at http://localhost:8501 to see the Streamlit app.

## Core Components

- **LightRAG/rag_agent.py**: The main agent for handling RAG queries
- **LightRAG/rag_pipeline.py**: Core functions for document processing
- **LightRAG/ingest_pipeline.py**: Pipeline for document ingestion
- **LightRAG/mem0_client.py**: Client for interacting with the mem0 vector database
- **LightRAG/supabase_client.py**: Client for interacting with Supabase

## Architecture

LightRAG uses a simple architecture:

1. **Document Ingestion**: Documents are uploaded, chunked, and stored in Supabase
2. **Embedding Creation**: Document chunks are embedded and stored in the vector database
3. **Query Processing**: User queries are processed through the LightRAG agent
4. **Retrieval**: Relevant document chunks are retrieved based on the query
5. **Generation**: The retrieved context is used to generate a response

## Testing

Run the tests with:

```
python -m pytest tests/
```
