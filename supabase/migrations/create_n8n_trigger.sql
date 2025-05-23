-- Create a trigger to automatically call your webhook when transcripts are processed
-- This replaces the need for n8n to make HTTP requests

CREATE OR REPLACE FUNCTION notify_transcript_processed()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for transcripts marked as processed
  IF NEW.is_processed = true AND (OLD.is_processed IS NULL OR OLD.is_processed = false) THEN
    -- Call your existing webhook function
    PERFORM
      net.http_post(
        url := 'https://bfscrjrjwbzpldamcrbz.supabase.co/functions/v1/transcript-webhook',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
        body := jsonb_build_object(
          'type', 'PROCESSING_COMPLETE',
          'record', row_to_json(NEW)
        )
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_transcript_processed ON transcripts;
CREATE TRIGGER trigger_transcript_processed
  AFTER UPDATE ON transcripts
  FOR EACH ROW
  EXECUTE FUNCTION notify_transcript_processed();
