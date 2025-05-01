
import { supabase } from '@/integrations/supabase/client';

/**
 * Update a single transcript's source type
 */
export async function updateTranscriptSourceType(transcriptId: string, newSource: string) {
  console.log(`[MANAGEMENT] Updating transcript ${transcriptId} source type to "${newSource}"`);
  
  try {
    const { error } = await supabase
      .from('transcripts')
      .update({ source: newSource })
      .eq('id', transcriptId);
      
    if (error) {
      console.error(`[MANAGEMENT] Error updating source type:`, error);
      throw error;
    }
    
    console.log(`[MANAGEMENT] Successfully updated transcript ${transcriptId} source type`);
    return { success: true };
  } catch (error: any) {
    console.error('[MANAGEMENT] Error updating transcript source type:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Marks a transcript as processed without actually processing it
 */
export async function markTranscriptAsProcessed(transcriptId: string) {
  console.log(`[MANAGEMENT] Manually marking transcript ${transcriptId} as processed`);
  
  try {
    const { error } = await supabase
      .from('transcripts')
      .update({ 
        is_processed: true,
        metadata: {
          processing_completed_at: new Date().toISOString(),
          manually_marked_as_processed: true
        } as Record<string, any>
      })
      .eq('id', transcriptId);
      
    if (error) {
      console.error(`[MANAGEMENT] Error marking as processed:`, error);
      throw error;
    }
    
    console.log(`[MANAGEMENT] Successfully marked transcript ${transcriptId} as processed`);
    return { success: true };
  } catch (error: any) {
    console.error('[MANAGEMENT] Error marking transcript as processed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Checks the status of the transcripts storage bucket
 */
export async function checkTranscriptStorageBucket(): Promise<{ 
  exists: boolean; 
  isPublic: boolean;
  error?: string;
}> {
  console.log(`[MANAGEMENT] Checking transcripts storage bucket status`);
  
  try {
    // Check if the bucket exists
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error(`[MANAGEMENT] Error listing storage buckets:`, error);
      return { 
        exists: false, 
        isPublic: false,
        error: error.message 
      };
    }
    
    const transcriptsBucket = buckets?.find(bucket => bucket.name === 'transcripts');
    
    if (!transcriptsBucket) {
      console.log(`[MANAGEMENT] Transcripts storage bucket not found`);
      return { exists: false, isPublic: false };
    }
    
    console.log(`[MANAGEMENT] Transcripts bucket exists, public: ${transcriptsBucket.public}`);
    return { 
      exists: true, 
      isPublic: !!transcriptsBucket.public 
    };
  } catch (error: any) {
    console.error(`[MANAGEMENT] Error checking storage bucket:`, error);
    return { 
      exists: false, 
      isPublic: false,
      error: error.message 
    };
  }
}

/**
 * Creates the transcripts storage bucket if it doesn't exist
 */
export async function createTranscriptsBucket(): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log(`[MANAGEMENT] Creating transcripts storage bucket`);
  
  try {
    const { exists } = await checkTranscriptStorageBucket();
    
    if (exists) {
      console.log(`[MANAGEMENT] Transcripts bucket already exists`);
      return { success: true };
    }
    
    const { error } = await supabase.storage.createBucket('transcripts', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
    });
    
    if (error) {
      console.error(`[MANAGEMENT] Error creating transcripts bucket:`, error);
      return { 
        success: false,
        error: error.message
      };
    }
    
    console.log(`[MANAGEMENT] Successfully created transcripts bucket`);
    return { success: true };
  } catch (error: any) {
    console.error(`[MANAGEMENT] Error creating storage bucket:`, error);
    return { 
      success: false,
      error: error.message
    };
  }
}

/**
 * Get file content from storage for a transcript
 */
export async function getTranscriptFileContent(filePath: string): Promise<{
  success: boolean;
  content?: string;
  error?: string;
}> {
  console.log(`[MANAGEMENT] Getting file content for path: ${filePath}`);
  
  try {
    // Get file URL
    const { data } = supabase.storage
      .from('transcripts')
      .getPublicUrl(filePath);
    
    // Fixed: The getPublicUrl method doesn't return an error property
    if (!data || !data.publicUrl) {
      console.error(`[MANAGEMENT] Error generating public URL for file: No URL returned`);
      return { 
        success: false,
        error: 'Failed to generate URL' 
      };
    }
    
    // Fetch the file content
    const response = await fetch(data.publicUrl);
    
    if (!response.ok) {
      console.error(`[MANAGEMENT] Error fetching file: ${response.status} ${response.statusText}`);
      return { 
        success: false,
        error: `Failed to fetch file: ${response.statusText}` 
      };
    }
    
    const content = await response.text();
    console.log(`[MANAGEMENT] Successfully retrieved file content (${content.length} characters)`);
    
    return { 
      success: true,
      content 
    };
  } catch (error: any) {
    console.error(`[MANAGEMENT] Error getting file content:`, error);
    return { 
      success: false,
      error: error.message
    };
  }
}

/**
 * Standardizes the file path format in transcripts table
 * Ensures consistency by adding or removing the "transcripts/" prefix
 */
export async function standardizeTranscriptFilePaths(): Promise<{
  success: boolean;
  standardized: number;
  errors: Record<string, string>;
}> {
  console.log(`[MANAGEMENT] Standardizing transcript file paths`);
  
  const result = {
    success: false,
    standardized: 0,
    errors: {} as Record<string, string>
  };
  
  try {
    // Get all transcripts with file paths
    const { data: transcripts, error } = await supabase
      .from('transcripts')
      .select('id, file_path')
      .not('file_path', 'is', null);
      
    if (error) {
      console.error(`[MANAGEMENT] Error fetching transcripts:`, error);
      throw error;
    }
    
    if (!transcripts || transcripts.length === 0) {
      console.log(`[MANAGEMENT] No transcripts with file paths found`);
      return {
        success: true,
        standardized: 0,
        errors: {}
      };
    }
    
    console.log(`[MANAGEMENT] Found ${transcripts.length} transcripts with file paths`);
    
    // Track standardization results
    let standardizedCount = 0;
    const errors: Record<string, string> = {};
    
    // Process each transcript
    for (const transcript of transcripts) {
      try {
        if (!transcript.file_path) continue;
        
        // Normalize path: remove "transcripts/" prefix if present
        // We'll add it back when accessing storage to ensure consistency
        let normalizedPath = transcript.file_path;
        if (normalizedPath.startsWith('transcripts/')) {
          normalizedPath = normalizedPath.slice('transcripts/'.length);
        }
        
        // Only update if the path actually changed
        if (normalizedPath !== transcript.file_path) {
          const { error: updateError } = await supabase
            .from('transcripts')
            .update({ file_path: normalizedPath })
            .eq('id', transcript.id);
            
          if (updateError) {
            errors[transcript.id] = updateError.message;
            console.error(`[MANAGEMENT] Error updating file path for transcript ${transcript.id}:`, updateError);
          } else {
            standardizedCount++;
            console.log(`[MANAGEMENT] Standardized file path for transcript ${transcript.id}: ${transcript.file_path} -> ${normalizedPath}`);
          }
        }
      } catch (err: any) {
        errors[transcript.id] = err.message;
        console.error(`[MANAGEMENT] Error processing transcript ${transcript.id}:`, err);
      }
    }
    
    result.standardized = standardizedCount;
    result.errors = errors;
    result.success = Object.keys(errors).length === 0;
    
    console.log(`[MANAGEMENT] Standardization complete: ${standardizedCount} paths standardized, ${Object.keys(errors).length} errors`);
    
    return result;
  } catch (error: any) {
    console.error(`[MANAGEMENT] Error in standardizeTranscriptFilePaths:`, error);
    return {
      success: false,
      standardized: 0,
      errors: { general: error.message }
    };
  }
}

/**
 * Batch processes all transcripts that need content extracted from files
 */
export async function batchExtractTranscriptContent(): Promise<{
  success: boolean;
  processed: number;
  errors: Record<string, string>;
}> {
  console.log(`[MANAGEMENT] Starting batch content extraction for transcripts`);
  
  const result = {
    success: false,
    processed: 0,
    errors: {} as Record<string, string>
  };
  
  try {
    // Find transcripts with file paths but empty content
    const { data: transcripts, error } = await supabase
      .from('transcripts')
      .select('id, file_path')
      .not('file_path', 'is', null)
      .or('content.is.null,content.eq.');
      
    if (error) {
      console.error(`[MANAGEMENT] Error fetching transcripts:`, error);
      throw error;
    }
    
    if (!transcripts || transcripts.length === 0) {
      console.log(`[MANAGEMENT] No transcripts requiring content extraction`);
      return {
        success: true,
        processed: 0,
        errors: {}
      };
    }
    
    console.log(`[MANAGEMENT] Found ${transcripts.length} transcripts needing content extraction`);
    
    // Extract content for each transcript
    let processedCount = 0;
    
    for (const transcript of transcripts) {
      try {
        if (!transcript.file_path) continue;
        
        // Ensure the file_path has the correct format for storage access
        let storagePath = transcript.file_path;
        if (storagePath.startsWith('transcripts/')) {
          storagePath = storagePath.slice('transcripts/'.length);
        }
        
        // Get file content
        const { success, content, error: contentError } = await getTranscriptFileContent(storagePath);
        
        if (!success || !content) {
          result.errors[transcript.id] = contentError || 'Failed to retrieve content';
          console.error(`[MANAGEMENT] Error extracting content for transcript ${transcript.id}: ${contentError}`);
          continue;
        }
        
        // Update transcript with content
        const { error: updateError } = await supabase
          .from('transcripts')
          .update({ content })
          .eq('id', transcript.id);
          
        if (updateError) {
          result.errors[transcript.id] = updateError.message;
          console.error(`[MANAGEMENT] Error updating content for transcript ${transcript.id}:`, updateError);
          continue;
        }
        
        processedCount++;
        console.log(`[MANAGEMENT] Successfully extracted content for transcript ${transcript.id} (${content.length} characters)`);
      } catch (err: any) {
        result.errors[transcript.id] = err.message;
        console.error(`[MANAGEMENT] Error processing transcript ${transcript.id}:`, err);
      }
    }
    
    result.processed = processedCount;
    result.success = processedCount > 0;
    
    console.log(`[MANAGEMENT] Content extraction complete: ${processedCount} transcripts processed, ${Object.keys(result.errors).length} errors`);
    
    return result;
  } catch (error: any) {
    console.error(`[MANAGEMENT] Error in batchExtractTranscriptContent:`, error);
    return {
      success: false,
      processed: 0,
      errors: { general: error.message }
    };
  }
}

/**
 * Directly forces transcript processing by manually triggering the webhook endpoint
 * This method includes an additional retry mechanism with exponential backoff
 */
export async function forceProcessTranscriptsWithRetry(
  transcriptIds: string[], 
  maxRetries: number = 3
): Promise<{
  success: boolean;
  processed: number;
  errors: Record<string, string>;
}> {
  console.log(`[MANAGEMENT] Force processing ${transcriptIds.length} transcripts with up to ${maxRetries} retries`);
  
  const result = {
    success: false,
    processed: 0,
    errors: {} as Record<string, string>
  };
  
  for (const id of transcriptIds) {
    let retries = 0;
    let success = false;
    
    while (!success && retries <= maxRetries) {
      try {
        const retryMessage = retries > 0 ? ` (retry ${retries}/${maxRetries})` : '';
        console.log(`[MANAGEMENT] Invoking webhook endpoint for transcript ${id}${retryMessage}`);
        
        // Directly call the webhook endpoint with a simulated INSERT event
        const { error } = await supabase.functions.invoke('transcript-webhook', {
          body: { 
            type: 'INSERT',
            record: { 
              id,
              is_processed: false,
              metadata: {
                force_processing_triggered_at: new Date().toISOString(),
                retry_attempt: retries
              }
            } 
          }
        });
        
        if (error) {
          console.error(`[MANAGEMENT] Error invoking webhook for transcript ${id}${retryMessage}:`, error);
          retries++;
          
          if (retries > maxRetries) {
            result.errors[id] = `Failed after ${maxRetries} attempts: ${error.message}`;
          }
          
          // Exponential backoff delay before retry
          const backoffMs = Math.min(1000 * (2 ** retries), 10000);
          console.log(`[MANAGEMENT] Waiting ${backoffMs}ms before retry for transcript ${id}`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        } else {
          console.log(`[MANAGEMENT] Successfully triggered processing for transcript ${id}`);
          success = true;
          result.processed++;
          break;
        }
      } catch (error: any) {
        console.error(`[MANAGEMENT] Exception during force processing for transcript ${id}:`, error);
        retries++;
        
        if (retries > maxRetries) {
          result.errors[id] = `Failed after ${maxRetries} attempts: ${error.message || 'Unknown error'}`;
        }
      }
    }
  }
  
  console.log(`[MANAGEMENT] Force processing complete. Processed: ${result.processed}, Errors: ${Object.keys(result.errors).length}`);
  result.success = result.processed > 0;
  return result;
}
