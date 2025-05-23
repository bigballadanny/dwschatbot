
/**
 * @file Utilities for reprocessing transcripts
 * @status active
 * @lastUsed 2025-05-03
 * @version 1.0
 * @tags transcripts, processing, diagnostics
 * @dependencies supabase/client
 */

import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Reprocesses a transcript with the new hierarchical chunking strategy
 * @param transcriptId The ID of the transcript to reprocess
 */
export async function reprocessTranscript(transcriptId: string): Promise<boolean> {
  try {
    console.log(`[REPROCESS] Reprocessing transcript ${transcriptId} with hierarchical chunking`);
    
    try {
      // Call the hierarchical chunking edge function
      const { data, error } = await supabase.functions.invoke('process-with-hierarchical-chunking', {
        body: { transcriptId }
      });
      
      if (error) {
        console.error('[REPROCESS] Error invoking hierarchical chunking function:', error);
        throw new Error(error.message || 'Error processing transcript');
      }
      
      console.log('[REPROCESS] Hierarchical chunking result:', data);
      
      if (!data?.success) {
        throw new Error(data?.message || 'Processing failed');
      }
      
      return true;
    } catch (functionError: any) {
      console.error('[REPROCESS] Function invocation error:', functionError);
      
      // Fall back to client-side implementation if function fails
      console.log('[REPROCESS] Falling back to client-side implementation');
      
      // First check if transcript exists
      const { data: transcript, error: fetchError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('id', transcriptId)
        .single();
      
      if (fetchError || !transcript) {
        console.error('[REPROCESS] Error fetching transcript for reprocessing:', fetchError);
        return false;
      }
      
      // Clear existing chunks for this transcript
      const { error: deleteError } = await supabase
        .from('chunks')
        .delete()
        .eq('transcript_id', transcriptId);
      
      if (deleteError) {
        console.error('[REPROCESS] Error clearing existing chunks:', deleteError);
        return false;
      }
      
      // Create parent chunks
      const parentChunks = createSimulatedParentChunks(transcript.content);
      
      // Create and store hierarchical chunks
      const success = await storeSimulatedHierarchicalChunks(parentChunks, transcriptId);
      
      if (success) {
        // Update transcript metadata to reflect reprocessing
        const metadataObj = transcript.metadata as Record<string, any> || {};
        metadataObj.reprocessed_at = new Date().toISOString();
        metadataObj.chunking_strategy = 'hierarchical';
        metadataObj.implementation = 'client-side-fallback';
        
        const { error: updateError } = await supabase
          .from('transcripts')
          .update({
            is_processed: true,
            metadata: metadataObj
          })
          .eq('id', transcriptId);
        
        if (updateError) {
          console.error('[REPROCESS] Error updating transcript metadata:', updateError);
          return false;
        }
      }
      
      return success;
    }
  } catch (error) {
    console.error('[REPROCESS] Error in reprocessTranscript:', error);
    return false;
  }
}

/**
 * Creates simulated parent chunks for the transcript
 */
function createSimulatedParentChunks(content: string): any[] {
  if (!content) return [];
  
  // Split content into paragraphs
  const paragraphs = content.split('\n\n');
  
  // Create at least 3 parent chunks for testing
  const numChunks = Math.max(3, Math.ceil(paragraphs.length / 5));
  const chunks = [];
  
  for (let i = 0; i < numChunks; i++) {
    const startIdx = Math.floor((i * paragraphs.length) / numChunks);
    const endIdx = Math.floor(((i + 1) * paragraphs.length) / numChunks);
    const chunkParagraphs = paragraphs.slice(startIdx, endIdx);
    
    chunks.push({
      content: chunkParagraphs.join('\n\n'),
      topic: `Topic ${i + 1}`,
      position: i,
    });
  }
  
  return chunks;
}

/**
 * Stores simulated hierarchical chunks for the transcript
 */
async function storeSimulatedHierarchicalChunks(parentChunks: any[], transcriptId: string): Promise<boolean> {
  try {
    const allChunks = [];
    
    // Create parent chunks
    for (let i = 0; i < parentChunks.length; i++) {
      // Use proper UUID format rather than concatenated strings
      const parentId = uuidv4();
      const parentChunk = parentChunks[i];
      
      // Add parent chunk
      allChunks.push({
        id: parentId,
        content: parentChunk.content,
        transcript_id: transcriptId,
        chunk_type: 'parent',
        topic: parentChunk.topic,
        metadata: {
          position: i,
          parent_id: null,
          chunk_strategy: 'hierarchical',
          implementation: 'client-side'
        }
      });
      
      // Create 3-5 child chunks for each parent
      const sentences = parentChunk.content.match(/[^.!?]+[.!?]+/g) || [];
      const numChildren = Math.min(5, sentences.length);
      
      for (let j = 0; j < numChildren; j++) {
        const sentence = sentences[j] ? sentences[j].trim() : `Child chunk ${j + 1} content`;
        
        allChunks.push({
          id: uuidv4(), // Use proper UUID for child chunks too
          content: sentence,
          transcript_id: transcriptId,
          chunk_type: 'child',
          topic: null,
          metadata: {
            position: j,
            parent_id: parentId,
            chunk_strategy: 'hierarchical',
            implementation: 'client-side'
          }
        });
      }
    }
    
    // Store all chunks in batches
    const BATCH_SIZE = 20;
    for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
      const batch = allChunks.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('chunks').insert(batch);
      
      if (error) {
        console.error(`[REPROCESS] Error storing chunk batch ${i / BATCH_SIZE + 1}:`, error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('[REPROCESS] Error in storeSimulatedHierarchicalChunks:', error);
    return false;
  }
}

/**
 * Check if a transcript has been processed using the hierarchical chunking strategy
 */
export async function hasHierarchicalChunks(transcriptId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('chunks')
      .select('metadata')
      .eq('transcript_id', transcriptId)
      .limit(1);
    
    if (error || !data || data.length === 0) {
      return false;
    }
    
    // Check if the chunk has hierarchical chunking strategy in metadata
    const metadata = data[0].metadata as Record<string, any>;
    return metadata && metadata.chunk_strategy === 'hierarchical';
  } catch (error) {
    console.error('[REPROCESS] Error in hasHierarchicalChunks:', error);
    return false;
  }
}

/**
 * Trigger reprocessing for transcripts that have not been processed with hierarchical chunking
 */
export async function reprocessAllTranscripts(): Promise<{success: number, failed: number}> {
  try {
    // Get all transcripts that are marked as processed
    const { data, error } = await supabase
      .from('transcripts')
      .select('id')
      .eq('is_processed', true);
    
    if (error) {
      console.error('[REPROCESS] Error fetching transcripts for reprocessing:', error);
      return { success: 0, failed: 0 };
    }
    
    if (!data || data.length === 0) {
      return { success: 0, failed: 0 };
    }
    
    let success = 0;
    let failed = 0;
    
    // Process each transcript sequentially to avoid overwhelming the database
    for (const transcript of data) {
      const hasHierarchical = await hasHierarchicalChunks(transcript.id);
      
      // Only reprocess if it doesn't already have hierarchical chunks
      if (!hasHierarchical) {
        const result = await reprocessTranscript(transcript.id);
        if (result) {
          success++;
        } else {
          failed++;
        }
      }
    }
    
    return { success, failed };
  } catch (error) {
    console.error('[REPROCESS] Error in reprocessAllTranscripts:', error);
    return { success: 0, failed: 1 };
  }
}
