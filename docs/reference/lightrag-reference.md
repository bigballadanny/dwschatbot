
# LightRAG Reference Documentation

This document provides a reference for key LightRAG concepts and implementation patterns that we're using in our RAG system.

## Core Concepts

LightRAG is a powerful RAG (Retrieval Augmented Generation) framework that provides advanced capabilities for document ingestion, chunking, embedding, and retrieval. Our implementation adapts many of these concepts to work with our Supabase and PGVector-based architecture.

### Chunking Strategies

LightRAG supports multiple chunking strategies:

1. **Sentence-based**: Splits text into sentences and groups them together
2. **Paragraph-based**: Uses paragraph breaks as chunk boundaries
3. **Section-based**: Splits by document sections (e.g., headers in markdown)
4. **Semantic-based**: Groups content by semantic meaning
5. **Hierarchical**: Maintains relationships between chunks at different levels

Our implementation has adopted the first four strategies, with plans to add hierarchical chunking in the future.

### Search Modes

LightRAG provides multiple search modes:

1. **Naive**: Simple text matching without advanced techniques
2. **Semantic**: Uses vector embeddings for semantic similarity
3. **Keyword**: Uses traditional keyword search with stemming and stopword removal
4. **Hybrid**: Combines semantic and keyword search for optimal results
5. **Global**: Incorporates global knowledge context (not yet implemented in our system)
6. **Local**: Focuses on context-dependent information (not yet implemented)
7. **Mix**: Uses both knowledge graph and vector search (planned future enhancement)

Our implementation currently supports naive, semantic, keyword, and hybrid modes.

## Query Parameters

In LightRAG, query behavior is controlled through query parameters:

```python
class QueryParam:
    mode: str = "hybrid"  # "semantic", "keyword", "hybrid", "naive"
    topic: Optional[str] = None
    max_results: int = 5
    threshold: float = 0.7
    use_feedback: bool = True
```

These parameters allow fine-tuned control over how retrieval is performed.

## Feedback Mechanism

LightRAG incorporates user feedback to improve search results over time. Our implementation includes:

1. **Feedback Recording**: Store user feedback (positive/negative) on search results
2. **Relevance Scoring**: Adjust relevance scores based on feedback
3. **Result Boosting**: Increase scores for previously positively rated results
4. **Result Re-ranking**: Re-rank search results based on feedback patterns

## Implementation Comparisons

### Chunking Implementation

Our implementation aligns with LightRAG but adds:

1. **Visualization tools** for chunk analysis
2. **Token usage estimation** for cost projections
3. **Quality analysis** to identify potential issues with chunks

### Vector Search Implementation

Our PGVector implementation incorporates several LightRAG concepts:

1. **Hybrid search** combining semantic and keyword approaches
2. **Metadata filtering** for targeted searches
3. **Feedback integration** for improved results over time

## Best Practices

Based on LightRAG documentation, we've adopted these best practices:

1. **Chunk overlap** to maintain context between chunks
2. **Maximum chunk size limits** to prevent token limits
3. **Sentence boundary preservation** during chunking
4. **Feedback-based reranking** to improve relevance
5. **Topic filtering** to narrow search contexts

## Future Enhancements

Planned enhancements based on LightRAG capabilities:

1. **Hierarchical chunking** for better document structure preservation
2. **Entity extraction and merging** for better knowledge representation
3. **Knowledge graph integration** for enhanced context understanding
4. **Citation tracking** to provide source attribution
5. **Conversation history** for multi-turn dialogues
