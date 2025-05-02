
/**
 * Utilities for transcript chunking strategies
 */
import { supabase } from '@/integrations/supabase/client';

/**
 * Process a single transcript with hierarchical chunking
 */
export async function processTranscriptWithHierarchicalChunking(transcriptId: string): Promise<boolean> {
  try {
    const { data: transcript } = await supabase
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
      await supabase
        .from('transcripts')
        .update({
          is_processed: true,
          metadata: {
            ...transcript.metadata,
            processing_completed_at: new Date().toISOString(),
            chunking_strategy: 'hierarchical'
          }
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
export async function createParentChunks(content: string): Promise<any[]> {
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
export async function createHierarchicalChunks(parentChunks: any[], transcript: any): Promise<any[]> {
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
export async function storeHierarchicalChunks(chunks: any[], transcriptId: string): Promise<boolean> {
  try {
    // First, remove any existing chunks for this transcript
    await supabase
      .from('chunks')
      .delete()
      .eq('transcript_id', transcriptId);
    
    // Then insert the new hierarchical chunks
    const { error } = await supabase
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
  const { data: transcript } = await supabase
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
