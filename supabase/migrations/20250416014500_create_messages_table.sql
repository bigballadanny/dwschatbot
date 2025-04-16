-- supabase/migrations/20250416014500_create_messages_table.sql

-- Ensure the conversations table exists before creating messages
-- (This assumes a migration for 'conversations' already exists with an earlier timestamp)

-- Create the messages table
CREATE TABLE public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- Link to the user (nullable for now, relevant for AN-09)
    content text NOT NULL,
    is_user boolean NOT NULL DEFAULT false, -- Indicate if the message is from the user
    metadata jsonb, -- Store additional info like source, citations
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add comments for clarity
COMMENT ON TABLE public.messages IS 'Stores individual messages within conversations.';
COMMENT ON COLUMN public.messages.id IS 'Unique identifier for the message.';
COMMENT ON COLUMN public.messages.conversation_id IS 'Identifier of the conversation this message belongs to.';
COMMENT ON COLUMN public.messages.user_id IS 'Identifier of the user associated with this message (sender or context).';
COMMENT ON COLUMN public.messages.content IS 'The textual content of the message.';
COMMENT ON COLUMN public.messages.is_user IS 'Indicates if the message originated from the user (true) or the system/AI (false).';
COMMENT ON COLUMN public.messages.metadata IS 'JSONB field for storing additional metadata like source, citations, etc.';
COMMENT ON COLUMN public.messages.created_at IS 'Timestamp when the message was created.';

-- Add indexes for performance
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_user_id ON public.messages(user_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Grant permissions
-- Allow users to select messages in their own conversations
CREATE POLICY "Allow users to select messages in their conversations"
ON public.messages
FOR SELECT
USING (
    conversation_id IN (
        SELECT id FROM public.conversations WHERE user_id = auth.uid()
    )
);

-- Allow users to insert messages into their own conversations
-- Note: Backend functions might insert system messages, requiring service_role or specific policies
CREATE POLICY "Allow users to insert their own messages"
ON public.messages
FOR INSERT
WITH CHECK (
    conversation_id IN (
        SELECT id FROM public.conversations WHERE user_id = auth.uid()
    ) AND is_user = true AND user_id = auth.uid()
);

-- Allow backend (service_role or specific function role) to insert system messages
-- Example policy (adjust role/logic as needed):
-- CREATE POLICY "Allow service role to insert system messages"
-- ON public.messages
-- FOR INSERT
-- WITH CHECK (role() = 'service_role' AND is_user = false);


-- Grant usage on the schema to authenticated users (if not already granted)
-- GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant specific permissions on the table to authenticated users
GRANT SELECT, INSERT ON TABLE public.messages TO authenticated;
-- Note: UPDATE/DELETE might be restricted depending on application logic