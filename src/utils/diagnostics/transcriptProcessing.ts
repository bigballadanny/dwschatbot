
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
  
  console.log(`[PROCESSING] Identifying stuck transcripts with threshold of ${timeThresholdMinutes} minutes`);
  
  const stuckTranscripts = transcripts.filter(transcript => {
    // Check if transcript is unprocessed
    if (transcript.is_processed) return false;
    
    // Check if transcript has processing metadata
    const processingStartedAt = transcript.metadata?.processing_started_at;
    if (!processingStartedAt) return false;
    
    // Check if processing started time exceeds threshold
    try {
      const startedTime = new Date(processingStartedAt);
      const elapsedMs = now.getTime() - startedTime.getTime();
      
      const isStuck = elapsedMs > thresholdMs;
      if (isStuck) {
        console.log(`[PROCESSING] Transcript ${transcript.id} appears stuck (started ${Math.round(elapsedMs / 60000)}min ago)`);
      }
      
      return isStuck;
    } catch (error) {
      console.error(`[PROCESSING] Error parsing processing_started_at for transcript ${transcript.id}:`, error);
      return false;
    }
  });
  
  console.log(`[PROCESSING] Found ${stuckTranscripts.length} stuck transcripts out of ${transcripts.length} total`);
  return stuckTranscripts;
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
  console.log(`[PROCESSING] Attempting to retry processing for ${transcriptIds.length} transcripts`);
  
  const result = {
    success: false,
    processed: 0,
    errors: {} as Record<string, string>
  };
  
  for (const id of transcriptIds) {
    try {
      console.log(`[PROCESSING] Resetting processing flags for transcript ${id}`);
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
        console.error(`[PROCESSING] Error resetting transcript ${id}:`, error);
        result.errors[id] = error.message;
      } else {
        console.log(`[PROCESSING] Successfully reset transcript ${id}`);
        result.processed++;
      }
    } catch (error: any) {
      console.error(`[PROCESSING] Exception during retry for transcript ${id}:`, error);
      result.errors[id] = error.message || 'Unknown error';
    }
  }
  
  console.log(`[PROCESSING] Retry complete. Processed: ${result.processed}, Errors: ${Object.keys(result.errors).length}`);
  result.success = result.processed > 0;
  return result;
}

/**
 * Directly trigger processing of transcripts via webhook endpoint
 * This bypasses the normal trigger mechanism and forces processing
 */
export async function forceProcessTranscripts(transcriptIds: string[]): Promise<{
  success: boolean;
  processed: number;
  errors: Record<string, string>;
}> {
  console.log(`[PROCESSING] Force processing ${transcriptIds.length} transcripts via webhook endpoint`);
  
  const result = {
    success: false,
    processed: 0,
    errors: {} as Record<string, string>
  };
  
  for (const id of transcriptIds) {
    try {
      console.log(`[PROCESSING] Invoking webhook endpoint for transcript ${id}`);
      
      // Directly call the webhook endpoint with a simulated INSERT event
      const { error } = await supabase.functions.invoke('transcript-webhook', {
        body: { 
          type: 'INSERT',
          record: { 
            id,
            is_processed: false,
            metadata: {
              force_processing_triggered_at: new Date().toISOString()
            }
          } 
        }
      });
      
      if (error) {
        console.error(`[PROCESSING] Error invoking webhook for transcript ${id}:`, error);
        result.errors[id] = error.message;
      } else {
        console.log(`[PROCESSING] Successfully triggered processing for transcript ${id}`);
        result.processed++;
      }
    } catch (error: any) {
      console.error(`[PROCESSING] Exception during force processing for transcript ${id}:`, error);
      result.errors[id] = error.message || 'Unknown error';
    }
  }
  
  console.log(`[PROCESSING] Force processing complete. Processed: ${result.processed}, Errors: ${Object.keys(result.errors).length}`);
  result.success = result.processed > 0;
  return result;
}

/**
 * Batch process all unprocessed transcripts in one go
 */
export async function batchProcessUnprocessedTranscripts(): Promise<{
  success: boolean;
  total: number;
  processed: number;
  errors: Record<string, string>;
}> {
  console.log(`[PROCESSING] Starting batch processing of all unprocessed transcripts`);
  
  const result = {
    success: false,
    total: 0,
    processed: 0,
    errors: {} as Record<string, string>
  };
  
  try {
    // Get all unprocessed transcripts
    const { data: transcripts, error } = await supabase
      .from('transcripts')
      .select('id')
      .eq('is_processed', false);
    
    if (error) {
      console.error(`[PROCESSING] Error fetching unprocessed transcripts:`, error);
      throw error;
    }
    
    if (!transcripts || transcripts.length === 0) {
      console.log(`[PROCESSING] No unprocessed transcripts found`);
      return {
        success: true,
        total: 0,
        processed: 0,
        errors: {}
      };
    }
    
    console.log(`[PROCESSING] Found ${transcripts.length} unprocessed transcripts to process`);
    result.total = transcripts.length;
    
    const transcriptIds = transcripts.map(t => t.id);
    const processingResult = await forceProcessTranscripts(transcriptIds);
    
    result.processed = processingResult.processed;
    result.errors = processingResult.errors;
    result.success = processingResult.success;
    
  } catch (error: any) {
    console.error(`[PROCESSING] Error in batch processing:`, error);
  }
  
  return result;
}
