
# PGVector Reference Documentation

This document provides reference information for working with the pgvector extension in Postgres, which we use for vector similarity search in our RAG system.

## What is pgvector?

pgvector is a PostgreSQL extension that enables vector similarity search directly within your database. It adds support for vector data types and similarity search operators, making it ideal for AI applications like our RAG system.

## Key Features

1. **Vector Data Type**: Store embeddings directly in PostgreSQL
2. **Similarity Search**: Use efficient nearest-neighbor search
3. **Multiple Distance Metrics**: Supports cosine distance, L2 (Euclidean) and inner product
4. **Indexing**: Provides ivfflat and hnsw indexing for fast retrieval

## Basic Usage

### Creating a Table with Vector Column

```sql
-- Enable the extension
CREATE EXTENSION vector;

-- Create a table with a vector column
CREATE TABLE embeddings (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1536),  -- 1536 dimensions for OpenAI embeddings
  metadata JSONB
);
```

### Creating an Index

```sql
-- Create an index for faster similarity search
CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### Inserting Vectors

```sql
-- Insert a record with embedding
INSERT INTO embeddings (id, content, embedding, metadata)
VALUES ('doc1', 'Document content', '[0.1, 0.2, ..., 0.3]', '{"source": "document.pdf"}');
```

### Vector Similarity Search

```sql
-- Find similar documents using cosine distance
SELECT id, content, metadata, 1 - (embedding <=> '[0.2, 0.3, ..., 0.1]') AS similarity
FROM embeddings
ORDER BY embedding <=> '[0.2, 0.3, ..., 0.1]'
LIMIT 5;
```

## PGVector Operators

- `<=>`: Cosine distance
- `<->`: Euclidean distance (L2)
- `<#>`: Negative inner product

## Performance Optimization

### Index Types

1. **IVFFlat Index**:
   - Good balance of build time, query time, and recall
   - Sample usage: `CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);`
   
2. **HNSW Index** (Hierarchical Navigable Small World):
   - Faster queries but slower to build and update
   - Sample usage: `CREATE INDEX ON embeddings USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);`

### Index Parameters

For IVFFlat:
- `lists`: Number of lists (typically sqrt(row_count))

For HNSW:
- `m`: Maximum number of connections per layer (default: 16)
- `ef_construction`: Size of the dynamic candidate list for construction (default: 64)
- `ef_search`: Size of the dynamic candidate list for search (default: 40)

### Hybrid Search

Our implementation uses hybrid search to combine vector similarity with text search:

```sql
-- Hybrid search combining vector similarity and text search
SELECT id, content, metadata,
       (0.7 * (1 - (embedding <=> query_embedding))) + 
       (0.3 * ts_rank_cd(to_tsvector('english', content), to_tsquery('english', keyword_query))) AS score
FROM embeddings
WHERE to_tsvector('english', content) @@ to_tsquery('english', keyword_query)
ORDER BY score DESC
LIMIT 5;
```

## Our Implementation

We've implemented the following features on top of basic pgvector functionality:

1. **Hybrid Search**: Combining vector and keyword search
2. **Dynamic Reranking**: Adjusting result order based on multiple factors
3. **Feedback Integration**: Using feedback to improve future results
4. **Metadata Filtering**: Filtering results by metadata properties
5. **Error Handling**: Fallback search methods when optimal methods fail

## Monitoring and Maintenance

### Index Maintenance

```sql
-- Reindex after significant changes
REINDEX INDEX idx_embeddings_embedding;

-- Vacuum analyze for statistics updates
VACUUM ANALYZE embeddings;
```

### Query Monitoring

```sql
-- Find slow vector queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE query LIKE '%<=>%'
ORDER BY total_time DESC
LIMIT 10;
```

## Best Practices

1. **Choose the right index**: IVFFlat for general use, HNSW for speed-critical applications
2. **Appropriate dimensionality**: Use dimension reduction if needed
3. **Regular maintenance**: Periodically reindex for optimal performance
4. **Connection pooling**: Use connection pooling for higher throughput
5. **Batch operations**: Use batch inserts when adding multiple vectors

## References

- [pgvector GitHub Repository](https://github.com/pgvector/pgvector)
- [pgvector Documentation](https://github.com/pgvector/pgvector/blob/master/README.md)
- [Supabase Vector Documentation](https://supabase.com/docs/guides/database/extensions/pgvector)
