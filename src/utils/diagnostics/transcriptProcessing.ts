
/**
 * Utilities for managing transcript processing
 */
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { DiagnosticTranscript } from './transcriptIssues';

/**
 * Process multiple transcripts using the trigger-transcript-processing edge function
 */
export async function processTranscripts(transcriptIds: string[]) {
  const results = {
    success: 0,
    errors: [] as string[]
  };
  
  for (const id of transcriptIds) {
    try {
      console.log(`[PROCESSING] Triggering processing for transcript ${id}`);
      
      // Call the trigger-transcript-processing edge function
      const { error } = await supabase.functions.invoke('trigger-transcript-processing', {
        body: { id }
      });
      
      if (error) {
        console.error(`[PROCESSING] Error triggering processing for transcript ${id}:`, error);
        results.errors.push(`Error processing transcript ${id}: ${error.message}`);
        toast.error(`Failed to process transcript: ${error.message}`);
        continue;
      }
      
      results.success++;
      toast.success(`Processing started for transcript ${id}`);
    } catch (error: any) {
      console.error(`[PROCESSING] Unexpected error processing transcript ${id}:`, error);
      results.errors.push(`Unexpected error processing transcript ${id}: ${error.message || 'Unknown error'}`);
      toast.error(`Failed to process transcript: ${error.message || 'Unknown error'}`);
    }
  }
  
  return results;
}

/**
 * Manually trigger content extraction for transcripts with empty content
 */
export async function extractTranscriptContent(transcriptIds: string[]) {
  const results = {
    success: 0,
    errors: [] as string[]
  };
  
  console.log(`[PROCESSING] Starting content extraction for ${transcriptIds.length} transcripts`);
  
  try {
    // Call the fix-transcript-paths edge function to fix paths and extract content
    const { data, error } = await supabase.functions.invoke('fix-transcript-paths', {
      method: 'POST'
    });
    
    if (error) {
      console.error('[PROCESSING] Error calling fix-transcript-paths function:', error);
      results.errors.push(`Error extracting content: ${error.message}`);
      toast.error(`Failed to extract content: ${error.message}`);
      return results;
    }
    
    // Check result data
    if (!data || !data.extraction) {
      console.error('[PROCESSING] Invalid response from fix-transcript-paths');
      results.errors.push('Invalid response from fix-transcript-paths function');
      toast.error('Invalid response from transcript content extraction');
      return results;
    }
    
    console.log('[PROCESSING] Content extraction results:', data);
    
    // Update results based on function response
    results.success = data.extraction.extracted || 0;
    
    if (data.extraction.errors && Object.keys(data.extraction.errors).length > 0) {
      for (const [id, errorMessage] of Object.entries(data.extraction.errors)) {
        results.errors.push(`Error extracting content for transcript ${id}: ${errorMessage}`);
      }
    }
    
    // Show success message
    if (results.success > 0) {
      toast.success(`Successfully extracted content for ${results.success} transcripts`);
    } else {
      toast.info('No content was extracted');
    }
  } catch (error: any) {
    console.error('[PROCESSING] Unexpected error extracting content:', error);
    results.errors.push(`Unexpected error extracting content: ${error.message || 'Unknown error'}`);
    toast.error(`Failed to extract content: ${error.message || 'Unknown error'}`);
  }
  
  return results;
}

/**
 * Fix issues for stuck transcripts by retrying processing
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
      const { error } = await supabase.functions.invoke('trigger-transcript-processing', {
        body: { id }
      });
      
      if (error) {
        results.errors.push(`Error triggering processing for transcript ${id}: ${error.message}`);
        continue;
      }
      
      results.success++;
      toast.success(`Successfully triggered processing for transcript ${id}`);
    } catch (error: any) {
      results.errors.push(`Unexpected error processing transcript ${id}: ${error.message}`);
    }
  }
  
  return results;
}

/**
 * Fix path standardization and content extraction issues for all transcripts
 */
export async function runTranscriptMaintenance() {
  console.log('[MAINTENANCE] Starting transcript maintenance process');
  
  try {
    // Call the fix-transcript-paths edge function
    const { data, error } = await supabase.functions.invoke('fix-transcript-paths', {
      method: 'POST'
    });
    
    if (error) {
      console.error('[MAINTENANCE] Error calling fix-transcript-paths function:', error);
      toast.error(`Maintenance error: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
    
    console.log('[MAINTENANCE] Maintenance results:', data);
    
    // Show success messages based on results
    if (data.paths && data.paths.standardized > 0) {
      toast.success(`Standardized ${data.paths.standardized} file paths`);
    }
    
    if (data.extraction && data.extraction.extracted > 0) {
      toast.success(`Extracted content for ${data.extraction.extracted} transcripts`);
    }
    
    // Show errors if any
    const totalErrors = 
      (data.paths?.errors?.length || 0) + 
      Object.keys(data.extraction?.errors || {}).length;
      
    if (totalErrors > 0) {
      toast.warning(`${totalErrors} errors occurred during maintenance`);
      console.error('[MAINTENANCE] Errors:', {
        pathErrors: data.paths?.errors || [],
        extractionErrors: data.extraction?.errors || {}
      });
    }
    
    return {
      success: true,
      results: data
    };
  } catch (error: any) {
    console.error('[MAINTENANCE] Unexpected error during maintenance:', error);
    toast.error(`Maintenance failed: ${error.message || 'Unknown error'}`);
    
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Standardize paths for all transcripts
 */
export async function standardizeAllTranscriptPaths() {
  console.log('[PATHS] Starting path standardization for all transcripts');
  
  try {
    // Call the fix-transcript-paths edge function
    const { data, error } = await supabase.functions.invoke('fix-transcript-paths', {
      method: 'POST'
    });
    
    if (error) {
      console.error('[PATHS] Error standardizing paths:', error);
      toast.error(`Failed to standardize paths: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
    
    console.log('[PATHS] Standardization results:', data);
    
    if (data.paths && data.paths.standardized > 0) {
      toast.success(`Standardized ${data.paths.standardized} transcript file paths`);
    } else {
      toast.info('No paths needed standardization');
    }
    
    return {
      success: true,
      standardized: data.paths?.standardized || 0,
      errors: data.paths?.errors || []
    };
  } catch (error: any) {
    console.error('[PATHS] Unexpected error standardizing paths:', error);
    toast.error(`Failed to standardize paths: ${error.message || 'Unknown error'}`);
    
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}
