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

/**
 * Check the health of the transcript processing system
 */
export async function checkTranscriptProcessingHealth() {
  console.log('[HEALTH] Checking transcript processing system health');
  
  try {
    const { data, error } = await supabase.functions.invoke('transcript-processing-health', {
      method: 'GET'
    });
    
    if (error) {
      console.error('[HEALTH] Error checking transcript processing health:', error);
      return {
        healthy: false,
        issues: [`Error checking health: ${error.message}`],
        details: { error: error.message }
      };
    }
    
    if (!data) {
      return {
        healthy: false,
        issues: ['Invalid response from health check'],
        details: { error: 'Invalid response' }
      };
    }
    
    // Calculate if the system is healthy based on the issues
    const healthy = !data.issues || data.issues.length === 0;
    
    // Format the response
    return {
      healthy,
      issues: data.issues || [],
      recommendations: data.recommendations || [],
      details: {
        storage: data.storage,
        statistics: {
          total: data.transcripts.total,
          processed: data.transcripts.processed,
          processedPercent: data.transcripts.total > 0 
            ? Math.round((data.transcripts.processed / data.transcripts.total) * 100) 
            : 0,
          unprocessed: data.transcripts.unprocessed,
          withContent: data.transcripts.withContent,
          withoutContent: data.transcripts.withoutContent,
          summarized: data.transcripts.summarized || 0,
          stuck: data.transcripts.stuck
        },
        functions: data.edgeFunctions,
        timestamp: data.timestamp
      }
    };
  } catch (error: any) {
    console.error('[HEALTH] Unexpected error checking health:', error);
    return {
      healthy: false,
      issues: [`Unexpected error: ${error.message || 'Unknown error'}`],
      details: { error: error.message || 'Unknown error' }
    };
  }
}

/**
 * Batch process unprocessed transcripts with progress tracking
 */
export async function batchProcessUnprocessedTranscripts(options = {
  prepareFirst: true,
  batchSize: 5,
  maxRetries: 2
}) {
  console.log('[BATCH] Starting batch processing of unprocessed transcripts');
  
  try {
    // Get all unprocessed transcripts
    const { data: transcripts, error } = await supabase
      .from('transcripts')
      .select('id, title, content, file_path')
      .eq('is_processed', false)
      .order('created_at', { ascending: true });
      
    if (error) {
      console.error('[BATCH] Error fetching unprocessed transcripts:', error);
      return {
        success: false,
        message: `Error fetching transcripts: ${error.message}`,
        total: 0,
        processed: 0,
        prepared: 0,
        errors: { general: error.message }
      };
    }
    
    if (!transcripts || transcripts.length === 0) {
      console.log('[BATCH] No unprocessed transcripts found');
      return {
        success: true,
        message: 'No unprocessed transcripts found',
        total: 0,
        processed: 0,
        prepared: 0,
        errors: {}
      };
    }
    
    console.log(`[BATCH] Found ${transcripts.length} unprocessed transcripts`);
    
    const results = {
      success: true,
      total: transcripts.length,
      processed: 0,
      prepared: 0,
      errors: {} as Record<string, string>
    };
    
    // First pass: prepare transcripts by ensuring they have content
    if (options.prepareFirst) {
      console.log('[BATCH] Preparing transcripts before processing');
      
      // Identify transcripts that need preparation (have file_path but no content)
      const needsContentExtraction = transcripts.filter(t => 
        (!t.content || t.content.trim() === '') && t.file_path
      );
      
      if (needsContentExtraction.length > 0) {
        console.log(`[BATCH] Extracting content for ${needsContentExtraction.length} transcripts`);
        
        // Call the fix-transcript-paths function to extract content
        const { data, error: extractError } = await supabase.functions.invoke('fix-transcript-paths', {
          method: 'POST'
        });
        
        if (extractError) {
          console.error('[BATCH] Error extracting content:', extractError);
        } else if (data && data.extraction) {
          results.prepared = data.extraction.extracted || 0;
          console.log(`[BATCH] Prepared ${results.prepared} transcripts`);
        }
      }
    }
    
    // Second pass: process transcripts in batches
    console.log(`[BATCH] Processing transcripts in batches of ${options.batchSize}`);
    
    const batchSize = options.batchSize || 5;
    const errors = {} as Record<string, string>;
    
    // Process in batches
    for (let i = 0; i < transcripts.length; i += batchSize) {
      const batch = transcripts.slice(i, i + batchSize);
      
      console.log(`[BATCH] Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(transcripts.length / batchSize)}`);
      
      // Process each transcript in the batch
      for (const transcript of batch) {
        try {
          const { error: processError } = await supabase.functions.invoke('trigger-transcript-processing', {
            body: { id: transcript.id }
          });
          
          if (processError) {
            console.error(`[BATCH] Error processing transcript ${transcript.id}:`, processError);
            errors[transcript.id] = `Processing error: ${processError.message}`;
          } else {
            results.processed++;
          }
        } catch (error: any) {
          console.error(`[BATCH] Unexpected error for transcript ${transcript.id}:`, error);
          errors[transcript.id] = `Unexpected error: ${error.message || 'Unknown error'}`;
        }
        
        // Small delay between requests to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Delay between batches
      if (i + batchSize < transcripts.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    results.errors = errors;
    
    // Update result status
    if (Object.keys(errors).length > 0) {
      results.success = results.processed > 0;
    }
    
    console.log(`[BATCH] Batch processing complete: ${results.processed} of ${results.total} processed`);
    return results;
  } catch (error: any) {
    console.error('[BATCH] Unexpected error in batch processing:', error);
    return {
      success: false,
      message: `Unexpected error: ${error.message || 'Unknown error'}`,
      total: 0,
      processed: 0,
      prepared: 0,
      errors: { general: error.message || 'Unknown error' }
    };
  }
}

/**
 * Process a single transcript with hierarchical chunking
 */
export async function processTranscriptWithHierarchicalChunking(transcriptId: string): Promise<boolean> {
  try {
    const { data: transcript } = await supabaseClient
      .from('transcripts')
      .select('*')
      .eq('id', transcriptId)
      .single();
    
    if (!transcript) {
      console.error(`No transcript found with ID: ${transcriptId}`);
      return false;
    }

    // Implement hierarchical chunking with parent-child relationships
    // First, create large parent chunks
    const parentChunks = await createParentChunks(transcript.content);
    
    // Then create child chunks for each parent
    const hierarchicalChunks = await createHierarchicalChunks(parentChunks, transcript);
    
    // Store hierarchical chunks with parent-child relationships
    const success = await storeHierarchicalChunks(hierarchicalChunks, transcriptId);
    
    // Update transcript status
    if (success) {
      await supabaseClient
        .from('transcripts')
        .update({
          processing_status: 'processed',
          chunking_strategy: 'hierarchical',
          last_processed: new Date().toISOString()
        })
        .eq('id', transcriptId);
    }
    
    return success;
  } catch (error) {
    console.error('Error in processTranscriptWithHierarchicalChunking:', error);
    return false;
  }
}

/**
 * Create large, topically coherent parent chunks
 */
async function createParentChunks(content: string): Promise<any[]> {
  // Create large, topically coherent parent chunks
  // This is a simplified implementation - in production, you'd use more sophisticated NLP
  const paragraphs = content.split('\n\n');
  
  // Group paragraphs into topically related sections
  let currentTopic = '';
  let currentChunk = '';
  const parentChunks = [];
  
  for (const paragraph of paragraphs) {
    // For this simplified implementation, we'll just use paragraph breaks
    // In a real system, you'd use NLP to detect topic changes
    if (currentChunk.length > 1500) {
      parentChunks.push({
        content: currentChunk,
        topic: currentTopic || 'Unknown',
      });
      currentChunk = paragraph;
      // Extract topic from first sentence for demo purposes
      currentTopic = paragraph.split('.')[0];
    } else {
      currentChunk += '\n\n' + paragraph;
    }
  }
  
  // Add the last chunk
  if (currentChunk) {
    parentChunks.push({
      content: currentChunk,
      topic: currentTopic || 'Unknown',
    });
  }
  
  return parentChunks;
}

/**
 * Create child chunks for each parent
 */
async function createHierarchicalChunks(parentChunks: any[], transcript: any): Promise<any[]> {
  // Create child chunks for each parent
  const hierarchicalChunks = [];
  
  for (let i = 0; i < parentChunks.length; i++) {
    const parentChunk = parentChunks[i];
    const parentId = `${transcript.id}-parent-${i}`;
    
    // Add parent chunk
    hierarchicalChunks.push({
      id: parentId,
      content: parentChunk.content,
      transcript_id: transcript.id,
      chunk_type: 'parent',
      topic: parentChunk.topic,
      metadata: {
        position: i,
        parent_id: null,
        chunk_strategy: 'hierarchical',
      }
    });
    
    // Create child chunks
    const sentences = parentChunk.content.match(/[^.!?]+[.!?]+/g) || [];
    for (let j = 0; j < sentences.length; j++) {
      const sentence = sentences[j].trim();
      if (sentence.split(' ').length > 5) { // Only include substantive sentences
        hierarchicalChunks.push({
          id: `${transcript.id}-child-${i}-${j}`,
          content: sentence,
          transcript_id: transcript.id,
          chunk_type: 'child',
          topic: parentChunk.topic,
          metadata: {
            position: j,
            parent_id: parentId,
            chunk_strategy: 'hierarchical',
          }
        });
      }
    }
  }
  
  return hierarchicalChunks;
}

/**
 * Store hierarchical chunks with parent-child relationships
 */
async function storeHierarchicalChunks(chunks: any[], transcriptId: string): Promise<boolean> {
  try {
    // First, remove any existing chunks for this transcript
    await supabaseClient
      .from('chunks')
      .delete()
      .eq('transcript_id', transcriptId);
    
    // Then insert the new hierarchical chunks
    const { error } = await supabaseClient
      .from('chunks')
      .insert(chunks);
    
    if (error) {
      console.error('Error storing hierarchical chunks:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in storeHierarchicalChunks:', error);
    return false;
  }
}

/**
 * Process a single transcript
 */
export async function processTranscript(transcriptId: string): Promise<boolean> {
  // Check if the transcript exists and has content
  const { data: transcript } = await supabaseClient
    .from('transcripts')
    .select('*')
    .eq('id', transcriptId)
    .single();
  
  if (!transcript || !transcript.content) {
    console.error(`Cannot process transcript ${transcriptId}: Missing content`);
    return false;
  }
  
  // Use hierarchical chunking as the default strategy
  return await processTranscriptWithHierarchicalChunking(transcriptId);
}
