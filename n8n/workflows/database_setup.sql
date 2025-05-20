-- Create necessary tables
CREATE TABLE IF NOT EXISTS public.embeddings (
  id bigserial PRIMARY KEY,
  transcript_id UUID,
  content TEXT,
  metadata JSONB,
  embedding vector(1536)
);

-- Create RLS policy for embeddings
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for all users" ON public.embeddings;
CREATE POLICY "Enable read for all users" ON public.embeddings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Enable insert for all users" ON public.embeddings;
CREATE POLICY "Enable insert for all users" ON public.embeddings FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Create match function for similarity search
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  filter jsonb DEFAULT '{}'
) RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    embeddings.id,
    embeddings.content,
    embeddings.metadata,
    1 - (embeddings.embedding <=> query_embedding) as similarity
  FROM embeddings
  WHERE metadata @> filter
  ORDER BY embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create session table for chat memory (UPDATED with all required columns)
CREATE TABLE IF NOT EXISTS public.sessions (
  id TEXT PRIMARY KEY,
  session_id TEXT DEFAULT gen_random_uuid()::text,
  message TEXT DEFAULT NULL,
  memory JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create function to ensure id is always set
CREATE OR REPLACE FUNCTION set_id_from_session_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL THEN
    IF NEW.session_id IS NOT NULL THEN
      NEW.id := NEW.session_id;
    ELSE
      NEW.id := gen_random_uuid()::text;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set id when needed
DROP TRIGGER IF EXISTS set_id_trigger ON public.sessions;
CREATE TRIGGER set_id_trigger
BEFORE INSERT ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION set_id_from_session_id();

-- Create messages table for langchain memory
CREATE TABLE IF NOT EXISTS public.memory_messages (
  id SERIAL PRIMARY KEY,
  session_id TEXT REFERENCES public.sessions(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  message JSONB DEFAULT NULL,
  additional_kwargs JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_memory_messages_session_id ON public.memory_messages(session_id);

-- Create transcripts table
CREATE TABLE IF NOT EXISTS public.transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_processed BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Grant select on pgvector extension
GRANT ALL ON EXTENSION vector TO anon, authenticated, service_role;

SELECT 'Database schema setup complete';
