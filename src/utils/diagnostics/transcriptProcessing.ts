
import { supabase } from '@/integrations/supabase/client';
import { Transcript } from '@/utils/transcriptUtils';

/**
 * Identifies transcripts that are stuck in processing state
 * @param transcripts Array of transcripts to check
 * @param timeThresholdMinutes Time threshold in minutes to consider a transcript as stuck
 */
export function identifyStuckTranscripts(
  transcripts: Transcript[], 
  timeThresholdMinutes: number = 5
): Transcript[] {
  const now = new Date();
  const thresholdMs = timeThresholdMinutes * 60 * 1000;
  
  return transcripts.filter(transcript => {
    // Check if transcript is unprocessed
    if (transcript.is_processed) return false;
    
    // Check if transcript has processing metadata
    const processingStartedAt = transcript.metadata?.processing_started_at;
    if (!processingStartedAt) return false;
    
    // Check if processing started time exceeds threshold
    const startedTime = new Date(processingStartedAt);
    const elapsedMs = now.getTime() - startedTime.getTime();
    
    return elapsedMs > thresholdMs;
  });
}

/**
 * Retry processing stuck transcripts
 * @param transcriptIds Array of transcript IDs to retry
 */
export async function retryTranscriptProcessing(transcriptIds: string[]): Promise<{
  success: boolean;
  processed: number;
  errors: Record<string, string>;
}> {
  const result = {
    success: false,
    processed: 0,
    errors: {} as Record<string, string>
  };
  
  for (const id of transcriptIds) {
    try {
      // Reset processing flags to trigger reprocessing
      const { error } = await supabase
        .from('transcripts')
        .update({
          is_processed: false,
          metadata: {
            processing_started_at: new Date().toISOString(),
            processing_retries: 0,
            processing_status: 'queued_for_retry'
          }
        })
        .eq('id', id);
        
      if (error) {
        result.errors[id] = error.message;
      } else {
        result.processed++;
      }
    } catch (error: any) {
      result.errors[id] = error.message || 'Unknown error';
    }
  }
  
  result.success = result.processed > 0;
  return result;
}
