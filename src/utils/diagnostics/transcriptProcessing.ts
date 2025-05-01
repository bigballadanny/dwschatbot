
import { supabase } from '@/integrations/supabase/client';
import { Transcript } from '@/utils/transcriptUtils';
import { forceProcessTranscriptsWithRetry, standardizeTranscriptFilePaths, batchExtractTranscriptContent } from './transcriptManagement';

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
  // Use the enhanced version with retries
  return forceProcessTranscriptsWithRetry(transcriptIds);
}

/**
 * Prepare transcripts for processing by standardizing paths and extracting content
 */
export async function prepareTranscriptsForProcessing(): Promise<{
  success: boolean;
  standardizedPaths: number;
  extractedContent: number;
  errors: Record<string, string>;
}> {
  console.log(`[PROCESSING] Preparing transcripts for processing`);
  
  const result = {
    success: false,
    standardizedPaths: 0,
    extractedContent: 0,
    errors: {} as Record<string, string>
  };
  
  try {
    // Step 1: Standardize file paths
    console.log(`[PROCESSING] Step 1: Standardizing file paths`);
    const standardizeResult = await standardizeTranscriptFilePaths();
    result.standardizedPaths = standardizeResult.standardized;
    
    // Merge errors from standardization
    Object.entries(standardizeResult.errors).forEach(([id, error]) => {
      result.errors[`path_${id}`] = error;
    });
    
    // Step 2: Extract content from files
    console.log(`[PROCESSING] Step 2: Extracting content from files`);
    const extractResult = await batchExtractTranscriptContent();
    result.extractedContent = extractResult.processed;
    
    // Merge errors from extraction
    Object.entries(extractResult.errors).forEach(([id, error]) => {
      result.errors[`extract_${id}`] = error;
    });
    
    result.success = standardizeResult.success || extractResult.success;
    console.log(`[PROCESSING] Preparation complete: ${result.standardizedPaths} paths standardized, ${result.extractedContent} contents extracted`);
    
    return result;
  } catch (error: any) {
    console.error(`[PROCESSING] Error in prepareTranscriptsForProcessing:`, error);
    result.errors['general'] = error.message;
    return result;
  }
}

/**
 * Batch process all unprocessed transcripts in one go
 * This function includes preparation steps to maximize success rate
 */
export async function batchProcessUnprocessedTranscripts(options: { 
  batchSize?: number;
  prepareFirst?: boolean; 
  maxRetries?: number;
} = {}): Promise<{
  success: boolean;
  total: number;
  processed: number;
  prepared: number;
  errors: Record<string, string>;
}> {
  console.log(`[PROCESSING] Starting batch processing of all unprocessed transcripts`);
  
  const { 
    batchSize = 10,
    prepareFirst = true,
    maxRetries = 3
  } = options;
  
  const result = {
    success: false,
    total: 0,
    processed: 0,
    prepared: 0,
    errors: {} as Record<string, string>
  };
  
  try {
    // Get all unprocessed transcripts
    const { data: transcripts, error } = await supabase
      .from('transcripts')
      .select('id, content, file_path')
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
        prepared: 0,
        errors: {}
      };
    }
    
    result.total = transcripts.length;
    console.log(`[PROCESSING] Found ${transcripts.length} unprocessed transcripts to process`);
    
    // Step 1: Prepare transcripts if requested
    if (prepareFirst) {
      console.log(`[PROCESSING] Preparing transcripts before processing`);
      const prepareResult = await prepareTranscriptsForProcessing();
      result.prepared = prepareResult.standardizedPaths + prepareResult.extractedContent;
      
      // Merge errors from preparation
      Object.entries(prepareResult.errors).forEach(([id, error]) => {
        result.errors[`prepare_${id}`] = error;
      });
    }
    
    // Step 2: Process transcripts in batches
    const transcriptIds = transcripts.map(t => t.id);
    const batches = [];
    
    for (let i = 0; i < transcriptIds.length; i += batchSize) {
      batches.push(transcriptIds.slice(i, i + batchSize));
    }
    
    console.log(`[PROCESSING] Processing ${transcriptIds.length} transcripts in ${batches.length} batches of ${batchSize}`);
    
    let processedCount = 0;
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`[PROCESSING] Processing batch ${i+1}/${batches.length} (${batch.length} transcripts)`);
      
      const processingResult = await forceProcessTranscriptsWithRetry(batch, maxRetries);
      processedCount += processingResult.processed;
      
      // Merge errors from processing
      Object.entries(processingResult.errors).forEach(([id, error]) => {
        result.errors[`process_${id}`] = error;
      });
      
      // Add a small delay between batches to avoid overwhelming the system
      if (i < batches.length - 1) {
        console.log(`[PROCESSING] Waiting 1 second before processing next batch`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    result.processed = processedCount;
    result.success = processedCount > 0;
    
    console.log(`[PROCESSING] Batch processing complete: ${processedCount}/${result.total} transcripts processed, ${Object.keys(result.errors).length} errors`);
  } catch (error: any) {
    console.error(`[PROCESSING] Error in batch processing:`, error);
    result.errors['general'] = error.message;
  }
  
  return result;
}

/**
 * Check health of the transcript processing system
 */
export async function checkTranscriptProcessingHealth(): Promise<{
  healthy: boolean;
  issues: string[];
  details: Record<string, any>;
}> {
  console.log(`[PROCESSING] Checking transcript processing system health`);
  
  const result = {
    healthy: true,
    issues: [] as string[],
    details: {} as Record<string, any>
  };
  
  try {
    // Check 1: Check if storage bucket exists and is public
    console.log(`[PROCESSING] Check 1: Verifying storage bucket`);
    const { exists, isPublic, error: bucketError } = await checkTranscriptStorageBucket();
    
    result.details.storage = {
      bucketExists: exists,
      isPublic,
      error: bucketError
    };
    
    if (!exists) {
      result.healthy = false;
      result.issues.push('Transcripts storage bucket does not exist');
    } else if (!isPublic) {
      result.issues.push('Transcripts storage bucket is not public');
    }
    
    // Check 2: Check if we can invoke the webhook function
    console.log(`[PROCESSING] Check 2: Testing webhook function connectivity`);
    try {
      const { error: webhookError } = await supabase.functions.invoke('transcript-webhook', {
        body: { type: 'HEALTH_CHECK' }
      });
      
      result.details.webhook = {
        reachable: !webhookError,
        error: webhookError?.message
      };
      
      if (webhookError) {
        result.healthy = false;
        result.issues.push(`Cannot reach transcript-webhook function: ${webhookError.message}`);
      }
    } catch (error: any) {
      result.details.webhook = {
        reachable: false,
        error: error.message
      };
      result.healthy = false;
      result.issues.push(`Error testing webhook function: ${error.message}`);
    }
    
    // Check 3: Check if we can invoke the process-transcript function
    console.log(`[PROCESSING] Check 3: Testing process-transcript function connectivity`);
    try {
      const { error: processError } = await supabase.functions.invoke('process-transcript', {
        body: { health_check: true }
      });
      
      result.details.processFunction = {
        reachable: !processError,
        error: processError?.message
      };
      
      if (processError) {
        result.healthy = false;
        result.issues.push(`Cannot reach process-transcript function: ${processError.message}`);
      }
    } catch (error: any) {
      result.details.processFunction = {
        reachable: false,
        error: error.message
      };
      result.healthy = false;
      result.issues.push(`Error testing process-transcript function: ${error.message}`);
    }
    
    // Check 4: Check transcript table statistics
    console.log(`[PROCESSING] Check 4: Gathering transcript statistics`);
    const { data: stats, error: statsError } = await supabase
      .from('transcripts')
      .select('is_processed, is_summarized')
      .order('created_at', { ascending: false });
      
    if (statsError) {
      result.issues.push(`Cannot fetch transcript statistics: ${statsError.message}`);
    } else {
      const total = stats?.length || 0;
      const processed = stats?.filter(t => t.is_processed).length || 0;
      const unprocessed = total - processed;
      const summarized = stats?.filter(t => t.is_summarized).length || 0;
      
      result.details.statistics = {
        total,
        processed,
        unprocessed,
        summarized,
        processedPercent: total > 0 ? Math.round((processed / total) * 100) : 0
      };
      
      if (unprocessed > 0 && total > 0) {
        result.issues.push(`${unprocessed}/${total} transcripts (${100 - result.details.statistics.processedPercent}%) are unprocessed`);
      }
    }
    
    return result;
  } catch (error: any) {
    console.error(`[PROCESSING] Health check error:`, error);
    return {
      healthy: false,
      issues: [`Health check encountered an error: ${error.message}`],
      details: { error: error.message }
    };
  }
}

// Helper function to import missing function
async function checkTranscriptStorageBucket(): Promise<{
  exists: boolean;
  isPublic: boolean;
  error?: string;
}> {
  // This function is imported from transcriptManagement.ts
  // Implementation is included here to avoid circular dependencies
  console.log(`[PROCESSING] Checking transcripts storage bucket status`);
  
  try {
    // Check if the bucket exists
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error(`[PROCESSING] Error listing storage buckets:`, error);
      return { 
        exists: false, 
        isPublic: false,
        error: error.message 
      };
    }
    
    const transcriptsBucket = buckets?.find(bucket => bucket.name === 'transcripts');
    
    if (!transcriptsBucket) {
      console.log(`[PROCESSING] Transcripts storage bucket not found`);
      return { exists: false, isPublic: false };
    }
    
    console.log(`[PROCESSING] Transcripts bucket exists, public: ${transcriptsBucket.public}`);
    return { 
      exists: true, 
      isPublic: !!transcriptsBucket.public 
    };
  } catch (error: any) {
    console.error(`[PROCESSING] Error checking storage bucket:`, error);
    return { 
      exists: false, 
      isPublic: false,
      error: error.message 
    };
  }
}
