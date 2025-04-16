-- supabase/migrations/20250416014510_create_message_feedback_table.sql

-- Create the message_feedback table
CREATE TABLE public.message_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL, -- Link to the specific message being rated
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE, -- Link to the conversation
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Link to the user providing feedback
    rating smallint NOT NULL CHECK (rating IN (-1, 1)), -- -1 for negative, 1 for positive
    comment text, -- Optional textual feedback
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add comments to the table and columns for clarity
COMMENT ON TABLE public.message_feedback IS 'Stores user feedback (ratings and comments) on messages or conversations.';
COMMENT ON COLUMN public.message_feedback.id IS 'Unique identifier for the feedback entry.';
COMMENT ON COLUMN public.message_feedback.message_id IS 'Identifier of the specific message being rated, if applicable.';
COMMENT ON COLUMN public.message_feedback.conversation_id IS 'Identifier of the conversation the feedback pertains to.';
COMMENT ON COLUMN public.message_feedback.user_id IS 'Identifier of the user who submitted the feedback.';
COMMENT ON COLUMN public.message_feedback.rating IS 'User rating: 1 for positive (e.g., thumbs up), -1 for negative (e.g., thumbs down).';
COMMENT ON COLUMN public.message_feedback.comment IS 'Optional textual comment provided by the user.';
COMMENT ON COLUMN public.message_feedback.created_at IS 'Timestamp when the feedback was submitted.';

-- Enable Row Level Security (RLS)
ALTER TABLE public.message_feedback ENABLE ROW LEVEL SECURITY;

-- Grant permissions
-- Allow users to insert their own feedback
CREATE POLICY "Allow users to insert their own feedback"
ON public.message_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to select their own feedback
CREATE POLICY "Allow users to select their own feedback"
ON public.message_feedback
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to update their own feedback (e.g., change rating or add comment later)
CREATE POLICY "Allow users to update their own feedback"
ON public.message_feedback
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own feedback
CREATE POLICY "Allow users to delete their own feedback"
ON public.message_feedback
FOR DELETE
USING (auth.uid() = user_id);

-- Optional: Allow service_role full access (often implicit, but can be explicit)
-- CREATE POLICY "Allow service_role full access"
-- ON public.message_feedback
-- FOR ALL
-- USING (true)
-- WITH CHECK (true);

-- Grant usage on the schema to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant specific permissions on the table to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.message_feedback TO authenticated;