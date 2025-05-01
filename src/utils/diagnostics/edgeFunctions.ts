
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

/**
 * Process a transcript using the edge function
 * @param transcriptId ID of the transcript to process
 */
export async function processTranscript(transcriptId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    console.log(`[EDGE] Calling trigger-transcript-processing for transcript ${transcriptId}`);
    
    const { data, error } = await supabase.functions.invoke('trigger-transcript-processing', {
      body: { id: transcriptId }
    });
    
    if (error) {
      console.error(`[EDGE] Error processing transcript ${transcriptId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
    
    console.log(`[EDGE] Successfully triggered processing for transcript ${transcriptId}:`, data);
    
    return {
      success: true,
      message: data?.message || 'Processing started'
    };
  } catch (error: any) {
    console.error(`[EDGE] Exception processing transcript ${transcriptId}:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Retry processing for stuck transcripts
 * @param transcriptId ID of the transcript to retry
 */
export async function retryTranscriptProcessing(transcriptId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    console.log(`[EDGE] Resetting and retrying transcript ${transcriptId}`);
    
    // First reset processing metadata
    const { error: resetError } = await supabase
      .from('transcripts')
      .update({ 
        is_processed: false,
        metadata: {
          retry_triggered_at: new Date().toISOString(),
          retry_count: 1
        } 
      })
      .eq('id', transcriptId);
        
    if (resetError) {
      console.error(`[EDGE] Error resetting transcript ${transcriptId}:`, resetError);
      return {
        success: false,
        error: resetError.message
      };
    }

    // Then trigger processing
    return processTranscript(transcriptId);
  } catch (error: any) {
    console.error(`[EDGE] Exception retrying transcript ${transcriptId}:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Check the health of the transcript processing system
 */
export async function checkTranscriptSystemHealth(): Promise<{
  healthy: boolean;
  issues: string[];
  details: Record<string, any>;
}> {
  try {
    // Call the edge function health check
    const { data, error } = await supabase.functions.invoke('check-environment', {
      method: 'GET'
    });
    
    if (error) {
      console.error('[EDGE] Error checking environment:', error);
      return {
        healthy: false,
        issues: [error.message || 'Error checking environment'],
        details: { error: error.message }
      };
    }
    
    return data?.status || {
      healthy: false,
      issues: ['Unknown status'],
      details: { error: 'No status returned' }
    };
  } catch (error: any) {
    console.error('[EDGE] Exception checking system health:', error);
    return {
      healthy: false,
      issues: [error.message || 'Unknown error'],
      details: { error: error.message }
    };
  }
}

/**
 * Update transcript source type
 */
export async function updateTranscriptSource(transcriptId: string, sourceType: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log(`[EDGE] Updating transcript ${transcriptId} source to ${sourceType}`);
    
    const { error } = await supabase
      .from('transcripts')
      .update({ source: sourceType })
      .eq('id', transcriptId);
      
    if (error) {
      console.error(`[EDGE] Error updating source type:`, error);
      return {
        success: false,
        error: error.message
      };
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('[EDGE] Error updating transcript source:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Batch process transcripts
 * @param transcriptIds Array of transcript IDs to process
 */
export async function batchProcessTranscripts(
  transcriptIds: string[],
  onProgress?: (processed: number, total: number) => void
): Promise<{
  success: boolean;
  processed: number;
  errors: Record<string, string>;
}> {
  console.log(`[EDGE] Batch processing ${transcriptIds.length} transcripts`);
  
  const result = {
    success: false,
    processed: 0,
    errors: {} as Record<string, string>
  };
  
  // Process in smaller batches to avoid overwhelming the system
  const batchSize = 5;
  let processed = 0;
  
  for (let i = 0; i < transcriptIds.length; i += batchSize) {
    const batch = transcriptIds.slice(i, i + batchSize);
    console.log(`[EDGE] Processing batch ${i/batchSize + 1}/${Math.ceil(transcriptIds.length/batchSize)}, size: ${batch.length}`);
    
    const results = await Promise.all(
      batch.map(async id => {
        const result = await processTranscript(id);
        return { id, ...result };
      })
    );
    
    // Update processed count and errors
    results.forEach(({ id, success, error }) => {
      if (success) {
        processed++;
      } else if (error) {
        result.errors[id] = error;
      }
    });
    
    // Report progress if callback provided
    if (onProgress) {
      onProgress(processed, transcriptIds.length);
    }
    
    // Add small delay between batches
    if (i + batchSize < transcriptIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  result.processed = processed;
  result.success = processed > 0;
  
  console.log(`[EDGE] Batch processing complete: ${processed}/${transcriptIds.length} processed, ${Object.keys(result.errors).length} errors`);
  return result;
}

/**
 * Fix empty content in transcripts
 * @param transcriptIds Array of transcript IDs to fix
 */
export async function fixEmptyContentTranscripts(
  transcriptIds: string[],
  onProgress?: (processed: number, total: number) => void
): Promise<{
  success: boolean;
  fixed: number;
  errors: Record<string, string>;
}> {
  console.log(`[EDGE] Fixing content for ${transcriptIds.length} transcripts`);
  
  const result = {
    success: false,
    fixed: 0,
    errors: {} as Record<string, string>
  };
  
  let processed = 0;
  
  for (const id of transcriptIds) {
    try {
      // Get the transcript
      const { data: transcript, error: getError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('id', id)
        .single();
        
      if (getError) {
        result.errors[id] = `Error fetching transcript: ${getError.message}`;
        continue;
      }
      
      if (!transcript) {
        result.errors[id] = 'Transcript not found';
        continue;
      }
      
      // If there's a file path but no content, try to fetch the file
      if (transcript.file_path && (!transcript.content || transcript.content.trim() === '')) {
        console.log(`[EDGE] Extracting content from file for transcript ${id}: ${transcript.file_path}`);
        
        // Get file URL - ensure correct path format
        let storagePath = transcript.file_path;
        if (storagePath.startsWith('transcripts/')) {
          storagePath = storagePath.slice('transcripts/'.length);
        }
        
        const { data: publicURL } = supabase.storage
          .from('transcripts')
          .getPublicUrl(storagePath);
        
        if (!publicURL || !publicURL.publicUrl) {
          result.errors[id] = 'Error generating public URL for file';
          continue;
        }
        
        try {
          // Fetch the file content
          const response = await fetch(publicURL.publicUrl);
          if (!response.ok) {
            result.errors[id] = `Error fetching file: ${response.statusText}`;
            continue;
          }
          
          const textContent = await response.text();
          
          console.log(`[EDGE] Extracted ${textContent.length} characters from file for transcript ${id}`);
          
          // Update the transcript with the file content
          const { error: updateError } = await supabase
            .from('transcripts')
            .update({ content: textContent })
            .eq('id', id);
            
          if (updateError) {
            result.errors[id] = `Error updating content: ${updateError.message}`;
            continue;
          }
          
          result.fixed++;
        } catch (fetchError: any) {
          result.errors[id] = `Error fetching file: ${fetchError.message}`;
        }
      } else if (!transcript.file_path) {
        result.errors[id] = 'No file path available to extract content';
      } else {
        // Already has content
        result.fixed++;
      }
      
      processed++;
      
      // Report progress if callback provided
      if (onProgress) {
        onProgress(processed, transcriptIds.length);
      }
    } catch (error: any) {
      result.errors[id] = `Unexpected error: ${error.message}`;
    }
  }
  
  result.success = result.fixed > 0;
  console.log(`[EDGE] Fixed content complete: ${result.fixed}/${transcriptIds.length} fixed, ${Object.keys(result.errors).length} errors`);
  
  return result;
}
