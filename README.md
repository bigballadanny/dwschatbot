
# LightRAG - Lightweight Retrieval-Augmented Generation System

LightRAG is a specialized RAG (Retrieval-Augmented Generation) system designed for lightweight deployment with Supabase PGVector for vector storage and retrieval. The system provides efficient document ingestion, intelligent chunking, and semantic search capabilities.

## Features

- **Smart Document Chunking**: Multiple chunking strategies (sentence, paragraph, section-based) to optimize retrieval quality
- **PGVector Integration**: Leverages Supabase's PGVector extension for efficient vector storage and similarity search
- **Hybrid Search**: Combines semantic (vector) and keyword-based search for improved accuracy
- **Feedback Mechanism**: Integrated user feedback loop for continuous improvement of search results
- **Rechunking Support**: Ability to re-process documents with improved chunking strategies
- **Quality Analysis**: Tools to analyze and visualize chunking quality

## Key Components

- `LightRAG/chunking.py`: Core chunking algorithms with multiple strategies
- `LightRAG/pgvector_client.py`: Interface to PGVector in Supabase
- `LightRAG/ingest_pipeline.py`: Pipeline for document processing and ingestion
- `LightRAG/rag_agent.py`: The RAG retrieval agent for answering queries
- `LightRAG/visualization.py`: Tools for analyzing and visualizing chunking quality

## Getting Started

1. **Configure Environment Variables**:
   ```
   SUPABASE_URL=your-supabase-url
   SUPABASE_KEY=your-supabase-key
   ```

2. **Ingest Documents**:
   ```python
   from LightRAG.ingest_pipeline import ingest_transcript
   
   transcript_id = ingest_transcript(
       file_path="your-document.txt",
       topic="your-topic",
       chunking_strategy="sentence"  # or "paragraph", "section"
   )
   ```

3. **Query the Knowledge Base**:
   ```python
   from LightRAG.rag_agent import LightRAGAgent
   
   agent = LightRAGAgent()
   results = agent.query(
       query_text="Your question here?",
       topic="optional-topic-filter",
       use_hybrid_search=True
   )
   ```

4. **Rechunk Documents**:
   ```python
   from LightRAG.ingest_pipeline import rechunk_transcript
   
   success = rechunk_transcript(
       transcript_id="your-transcript-id", 
       chunking_strategy="paragraph"
   )
   ```

5. **Analyze Chunking Quality**:
   ```python
   from LightRAG.chunking import chunk_transcript, analyze_chunking_quality
   from LightRAG.visualization import plot_chunk_distribution
   
   with open("your-document.txt", "r") as f:
       text = f.read()
   
   chunks = chunk_transcript(text, strategy="sentence")
   quality = analyze_chunking_quality(chunks)
   print(quality)
   
   # Visualize chunk distribution
   plot_chunk_distribution(chunks)
   ```

## Command-Line Tools

LightRAG includes CLI tools for analyzing and managing chunking:

```bash
# Analyze a document with different chunking strategies
python -m LightRAG.cli.chunking_tools analyze document.txt --strategies sentence paragraph section --visualize

# Re-chunk an existing transcript
python -m LightRAG.cli.chunking_tools rechunk your-transcript-id --strategy paragraph
```

## Continuous Improvement Workflow

1. **Ingest documents** with default chunking parameters
2. **Analyze retrieval quality** using real queries
3. **Collect user feedback** on search results
4. **Rechunk documents** with optimized parameters based on analysis
5. **Monitor improvement** in retrieval performance

## Testing

Run the test suite:

```bash
pytest tests/
```

## License

[MIT License](LICENSE)
