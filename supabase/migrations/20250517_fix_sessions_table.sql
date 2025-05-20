-- Add missing message column to sessions table
ALTER TABLE IF EXISTS public.sessions 
ADD COLUMN IF NOT EXISTS message TEXT DEFAULT NULL;

-- Ensure the memory column exists (it might be what the node is actually looking for)
ALTER TABLE IF EXISTS public.sessions 
ADD COLUMN IF NOT EXISTS memory JSONB DEFAULT '{}';
