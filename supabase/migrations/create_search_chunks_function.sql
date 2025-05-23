-- Create the search_chunks function for text-based search
CREATE OR REPLACE FUNCTION search_chunks(
  query_text TEXT,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id TEXT,
  content TEXT,
  transcript_id TEXT,
  chunk_type TEXT,
  topic TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.content,
    c.transcript_id,
    c.chunk_type,
    c.topic,
    c.metadata,
    -- Calculate text similarity using pg_trgm
    similarity(c.content, query_text) AS similarity
  FROM chunks c
  WHERE 
    -- Only search in chunks with actual content
    c.content IS NOT NULL AND 
    c.content != '' AND
    -- Use text search for relevant chunks
    (
      c.content ILIKE '%' || query_text || '%' OR
      similarity(c.content, query_text) > 0.1
    )
  ORDER BY 
    -- Prioritize exact matches
    CASE WHEN c.content ILIKE '%' || query_text || '%' THEN 1 ELSE 2 END,
    -- Then order by similarity
    similarity(c.content, query_text) DESC
  LIMIT match_count;
END;
$$;

-- Create index to improve search performance
CREATE INDEX IF NOT EXISTS idx_chunks_content_trgm ON chunks USING gin (content gin_trgm_ops);

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_chunks(TEXT, INT) TO anon, authenticated;