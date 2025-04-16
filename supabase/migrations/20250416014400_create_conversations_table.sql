-- supabase/migrations/20250416014400_create_conversations_table.sql

-- Create the conversations table
CREATE TABLE public.conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text, -- Optional title for the conversation
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add comments for clarity
COMMENT ON TABLE public.conversations IS 'Stores conversation sessions.';
COMMENT ON COLUMN public.conversations.id IS 'Unique identifier for the conversation.';
COMMENT ON COLUMN public.conversations.user_id IS 'Identifier of the user who owns the conversation.';
COMMENT ON COLUMN public.conversations.title IS 'Optional user-defined or auto-generated title for the conversation.';
COMMENT ON COLUMN public.conversations.created_at IS 'Timestamp when the conversation was created.';
COMMENT ON COLUMN public.conversations.updated_at IS 'Timestamp when the conversation was last updated (e.g., new message added).';

-- Add indexes for performance
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_created_at ON public.conversations(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now(); 
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on conversation update
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Grant permissions
-- Allow users to manage (select, insert, update, delete) their own conversations
CREATE POLICY "Allow users to manage their own conversations"
ON public.conversations
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Grant usage on the schema to authenticated users (if not already granted)
-- GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant specific permissions on the table to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.conversations TO authenticated;