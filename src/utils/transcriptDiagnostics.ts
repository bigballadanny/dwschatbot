import { supabase } from '@/integrations/supabase/client';

/**
 * Checks environment status for transcript processing
 */
export async function checkEnvironmentVariables() {
  try {
    // Call the edge function to check environment status
    const { data, error } = await supabase.functions.invoke('check-environment', {
      method: 'GET'
    });
    
    if (error) {
      console.error('Error checking environment:', error);
      return {
        systemStatus: 'error',
        transcriptProcessingEnabled: false,
        supabaseConfigured: false
      };
    }
    
    // Return simplified status
    return data.status || {
      systemStatus: 'unknown',
      transcriptProcessingEnabled: false,
      supabaseConfigured: false
    };
  } catch (error) {
    console.error('Error checking environment:', error);
    return {
      systemStatus: 'error',
      transcriptProcessingEnabled: false,
      supabaseConfigured: false
    };
  }
}

/**
 * Checks for transcripts that might have upload issues
 */
export async function checkForTranscriptIssues() {
  try {
    // Get all transcripts
    const { data: transcripts, error } = await supabase
      .from('transcripts')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      throw error;
    }
    
    const stats = {
      total: transcripts.length,
      emptyContent: 0,
      missingFilePath: 0,
      recentlyUploaded: 0,
      businessSummitTranscripts: 0,
      potentialSummitTranscripts: 0,
      unprocessedTranscripts: 0,
      processingFailures: 0,
      stuckInProcessing: 0
    };
    
    const lastHour = new Date();
    lastHour.setHours(lastHour.getHours() - 1);
    
    const recentTranscripts = [];
    const potentialSummitTranscripts = [];
    const unprocessedTranscripts = [];
    const processingFailures = [];
    const stuckInProcessing = [];
    
    transcripts.forEach(transcript => {
      // Check for empty content
      if (!transcript.content || transcript.content.trim() === '') {
        stats.emptyContent++;
      }
      
      // Check for missing file path
      if (!transcript.file_path) {
        stats.missingFilePath++;
      }
      
      // Check for recent uploads
      const createdAt = new Date(transcript.created_at);
      if (createdAt > lastHour) {
        stats.recentlyUploaded++;
        recentTranscripts.push(transcript);
      }
      
      // Count business summit transcripts
      if (transcript.source === 'business_acquisitions_summit') {
        stats.businessSummitTranscripts++;
      }
      
      // Check if this transcript was uploaded on the 27th but not marked as summit
      const uploadDate = new Date(transcript.created_at);
      const is27thUpload = uploadDate.getDate() === 27 && 
                         uploadDate.getMonth() === new Date().getMonth() && 
                         uploadDate.getFullYear() === new Date().getFullYear();
                         
      if (is27thUpload && transcript.source !== 'business_acquisitions_summit') {
        potentialSummitTranscripts.push(transcript);
        stats.potentialSummitTranscripts++;
      }
      
      // Check for unprocessed transcripts
      if (transcript.is_processed === false) {
        unprocessedTranscripts.push(transcript);
        stats.unprocessedTranscripts++;
        
        // Check for transcripts stuck in processing
        if (transcript.metadata && typeof transcript.metadata === 'object') {
          const metadata = transcript.metadata as Record<string, any>;
          if (metadata.processing_started_at) {
            const processingStartedAt = new Date(metadata.processing_started_at);
            const fiveMinutesAgo = new Date();
            fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
            
            if (processingStartedAt < fiveMinutesAgo) {
              stuckInProcessing.push(transcript);
              stats.stuckInProcessing++;
            }
          }
        }
      }
      
      // Check for processing failures
      if (transcript.metadata && typeof transcript.metadata === 'object') {
        const metadata = transcript.metadata as Record<string, any>;
        if (metadata.processing_failed || metadata.processing_error) {
          processingFailures.push(transcript);
          stats.processingFailures++;
        }
      }
    });
    
    return { 
      stats, 
      recentTranscripts, 
      potentialSummitTranscripts, 
      unprocessedTranscripts, 
      processingFailures,
      stuckInProcessing
    };
  } catch (error) {
    console.error('Error checking for transcript issues:', error);
    throw error;
  }
}

/**
 * Attempts to fix issues with transcript uploads
 */
export async function fixTranscriptIssues(transcriptIds: string[]) {
  const results = {
    success: 0,
    errors: [] as string[]
  };
  
  for (const id of transcriptIds) {
    try {
      // Get the transcript
      const { data: transcript, error: getError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('id', id)
        .single();
        
      if (getError) {
        results.errors.push(`Error fetching transcript ${id}: ${getError.message}`);
        continue;
      }
      
      if (!transcript) {
        results.errors.push(`Transcript ${id} not found`);
        continue;
      }
      
      // If there's a file path but no content, try to fetch the file
      if (transcript.file_path && (!transcript.content || transcript.content.trim() === '')) {
        // Get file URL
        const { data: publicURL } = supabase.storage
          .from('transcripts')
          .getPublicUrl(transcript.file_path);
        
        if (!publicURL || !publicURL.publicUrl) {
          results.errors.push(`Error generating public URL for transcript ${id}`);
          continue;
        }
        
        try {
          // Fetch the file content
          const response = await fetch(publicURL.publicUrl);
          if (!response.ok) {
            results.errors.push(`Error fetching file for transcript ${id}: ${response.statusText}`);
            continue;
          }
          
          const textContent = await response.text();
          
          // Update the transcript with the file content
          const { error: updateError } = await supabase
            .from('transcripts')
            .update({ content: textContent })
            .eq('id', id);
            
          if (updateError) {
            results.errors.push(`Error updating transcript ${id}: ${updateError.message}`);
            continue;
          }
          
          results.success++;
        } catch (fetchError: any) {
          results.errors.push(`Error fetching file for transcript ${id}: ${fetchError.message}`);
        }
      } else {
        // No issues to fix for this transcript
        results.success++;
      }
    } catch (error: any) {
      results.errors.push(`Unexpected error for transcript ${id}: ${error.message}`);
    }
  }
  
  return results;
}

/**
 * Manually triggers processing for transcripts
 */
export async function manuallyProcessTranscripts(transcriptIds: string[]) {
  const results = {
    success: 0,
    errors: [] as string[]
  };
  
  for (const id of transcriptIds) {
    try {
      // Reset any previous processing metadata
      await supabase
        .from('transcripts')
        .update({ 
          metadata: {
            manual_processing_triggered_at: new Date().toISOString()
          } 
        })
        .eq('id', id);
        
      // Call the process-transcript function directly
      const { data, error } = await supabase.functions.invoke('process-transcript', {
        body: { transcript_id: id }
      });
      
      if (error) {
        results.errors.push(`Error processing transcript ${id}: ${error.message}`);
        continue;
      }
      
      results.success++;
    } catch (error: any) {
      results.errors.push(`Unexpected error processing transcript ${id}: ${error.message}`);
    }
  }
  
  return results;
}

/**
 * Update a single transcript's source type
 */
export async function updateTranscriptSourceType(transcriptId: string, newSource: string) {
  try {
    const { error } = await supabase
      .from('transcripts')
      .update({ source: newSource })
      .eq('id', transcriptId);
      
    if (error) {
      throw error;
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error updating transcript source type:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Marks a transcript as processed without actually processing it
 */
export async function markTranscriptAsProcessed(transcriptId: string) {
  try {
    const { error } = await supabase
      .from('transcripts')
      .update({ 
        is_processed: true,
        metadata: {
          processing_completed_at: new Date().toISOString(),
          manually_marked_as_processed: true
        }
      })
      .eq('id', transcriptId);
      
    if (error) {
      throw error;
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error marking transcript as processed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Retries processing for transcripts that are stuck
 */
export async function retryStuckTranscripts(transcriptIds: string[]) {
  const results = {
    success: 0,
    errors: [] as string[]
  };

  for (const id of transcriptIds) {
    try {
      // Reset processing metadata
      const { error: resetError } = await supabase
        .from('transcripts')
        .update({ 
          is_processed: false,
          metadata: {
            retry_triggered_at: new Date().toISOString(),
            retry_count: 1
          } 
        })
        .eq('id', id);
        
      if (resetError) {
        results.errors.push(`Error resetting transcript ${id}: ${resetError.message}`);
        continue;
      }

      // Call the webhook function to restart processing
      const { error } = await supabase.functions.invoke('transcript-webhook', {
        body: { 
          type: 'INSERT',
          record: { id } 
        }
      });
      
      if (error) {
        results.errors.push(`Error triggering webhook for transcript ${id}: ${error.message}`);
        continue;
      }
      
      results.success++;
    } catch (error: any) {
      results.errors.push(`Unexpected error processing transcript ${id}: ${error.message}`);
    }
  }
  
  return results;
}
