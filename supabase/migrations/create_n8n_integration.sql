-- Database trigger to send new transcripts to n8n for AI processing
-- This replaces the need for complex n8n database operations

CREATE OR REPLACE FUNCTION trigger_n8n_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for new unprocessed transcripts
  IF NEW.is_processed IS NULL OR NEW.is_processed = false THEN
    -- Call n8n webhook with transcript data and user context
    PERFORM
      net.http_post(
        url := 'http://localhost:5678/webhook/dws-chatbot',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object(
          'type', 'PROCESS_TRANSCRIPT',
          'transcript', row_to_json(NEW),
          'user_context', jsonb_build_object(
            'user_id', NEW.user_id,
            'timestamp', NEW.created_at
          )
        )
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on INSERT
DROP TRIGGER IF EXISTS trigger_n8n_processing ON transcripts;
CREATE TRIGGER trigger_n8n_processing
  AFTER INSERT ON transcripts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_n8n_processing();
