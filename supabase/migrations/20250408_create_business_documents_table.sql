
-- Create the business_documents table
CREATE TABLE IF NOT EXISTS public.business_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  category TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  is_analyzed BOOLEAN DEFAULT FALSE,
  analysis_score INTEGER,
  analysis_summary TEXT,
  metrics JSONB
);

-- Create RLS policies for business_documents
ALTER TABLE public.business_documents ENABLE ROW LEVEL SECURITY;

-- Allow users to select only their own documents
CREATE POLICY select_own_documents ON public.business_documents
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert only their own documents
CREATE POLICY insert_own_documents ON public.business_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update only their own documents
CREATE POLICY update_own_documents ON public.business_documents
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete only their own documents
CREATE POLICY delete_own_documents ON public.business_documents
  FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for business documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('business_documents', 'business_documents', true)
ON CONFLICT DO NOTHING;

-- Create storage policies
CREATE POLICY select_own_business_documents ON storage.objects
  FOR SELECT USING (
    bucket_id = 'business_documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY insert_own_business_documents ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'business_documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY update_own_business_documents ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'business_documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY delete_own_business_documents ON storage.objects
  FOR DELETE USING (
    bucket_id = 'business_documents' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create index for faster queries
CREATE INDEX idx_business_documents_user_id ON public.business_documents (user_id);
