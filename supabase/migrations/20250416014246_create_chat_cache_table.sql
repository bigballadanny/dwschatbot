-- Migration script for creating the chat_cache table (CH-03)

-- Create the chat_cache table
CREATE TABLE public.chat_cache (
    query_hash TEXT PRIMARY KEY,          -- Hash of the user query (or query + context)
    response TEXT NOT NULL,               -- The cached response from the AI model
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL, -- Timestamp of when the cache entry was created
    model_used TEXT                       -- Identifier for the model that generated the response (e.g., 'gemini-1.5-flash')
);

-- Add comments to the table and columns for clarity
COMMENT ON TABLE public.chat_cache IS 'Stores cached responses from the AI chat function to reduce redundant API calls.';
COMMENT ON COLUMN public.chat_cache.query_hash IS 'Primary key, hash representing the input query/context.';
COMMENT ON COLUMN public.chat_cache.response IS 'The AI-generated response text.';
COMMENT ON COLUMN public.chat_cache.created_at IS 'Timestamp when the cache entry was created.';
COMMENT ON COLUMN public.chat_cache.model_used IS 'Identifier of the AI model used for the cached response.';

-- RLS Policy Consideration:
-- RLS is NOT enabled for this table initially.
-- The backend function (gemini-chat) should operate with service_role privileges,
-- which bypasses RLS checks. If direct client access were ever needed,
-- appropriate RLS policies would need to be implemented.
-- Example (if needed later):
-- ALTER TABLE public.chat_cache ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow service role access" ON public.chat_cache FOR ALL USING (true) WITH CHECK (true);

-- Grant usage permissions to the necessary roles (adjust if needed, service_role has implicit access)
-- Granting to 'authenticated' or 'anon' is likely NOT needed if only the backend function accesses it.
-- GRANT SELECT ON TABLE public.chat_cache TO authenticated;
-- GRANT INSERT ON TABLE public.chat_cache TO authenticated; -- Or specific service role if not using default

GRANT ALL ON TABLE public.chat_cache TO postgres;
GRANT ALL ON TABLE public.chat_cache TO service_role; -- Ensure the backend function role can access

-- Optional: Index on created_at for potential cleanup tasks (e.g., deleting old entries)
CREATE INDEX idx_chat_cache_created_at ON public.chat_cache(created_at);