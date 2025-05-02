
/**
 * @file Utility for reprocessing transcripts with hierarchical chunking
 * @status active
 * @lastUsed 2025-05-03
 * @version 1.0
 * @tags transcript, processing, chunking, utilities
 * @dependencies supabase/client
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

/**
 * Clear existing chunks for a transcript
 * @param transcriptId Transcript ID
 */
export async function clearTranscriptChunks(transcriptId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('chunks')
      .delete()
      .eq('transcript_id', transcriptId);

    if (error) {
      console.error(`Error clearing chunks for transcript ${transcriptId}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Unexpected error clearing chunks for transcript ${transcriptId}:`, error);
    return false;
  }
}

/**
 * Mark a transcript for reprocessing
 * @param transcriptId Transcript ID
 */
export async function markForReprocessing(transcriptId: string): Promise<boolean> {
  try {
    // Clear existing chunks first
    const clearResult = await clearTranscriptChunks(transcriptId);
    if (!clearResult) {
      toast({
        title: "Warning",
        description: "Failed to clear existing chunks, but will still attempt to reprocess the transcript",
      });
    }

    // Update transcript to mark as not processed
    const { error } = await supabase
      .from('transcripts')
      .update({
        is_processed: false,
        metadata: {
          reprocessing_requested: true,
          reprocessing_timestamp: new Date().toISOString(),
        }
      })
      .eq('id', transcriptId);

    if (error) {
      console.error(`Error marking transcript ${transcriptId} for reprocessing:`, error);
      toast({
        title: "Error",
        description: "Failed to mark transcript for reprocessing",
        variant: "destructive"
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Unexpected error marking transcript ${transcriptId} for reprocessing:`, error);
    return false;
  }
}

/**
 * Trigger processing for a transcript
 * @param transcriptId Transcript ID
 */
export async function triggerTranscriptProcessing(transcriptId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('trigger-transcript-processing', {
      body: { transcript_id: transcriptId },
    });

    if (error) {
      console.error(`Error triggering processing for transcript ${transcriptId}:`, error);
      toast({
        title: "Error",
        description: "Failed to trigger transcript processing",
        variant: "destructive"
      });
      return false;
    }

    if (data?.success) {
      toast({
        title: "Success",
        description: "Transcript processing triggered successfully",
      });
      return true;
    } else {
      toast({
        title: "Warning",
        description: data?.message || "Unknown response from processing function",
      });
      return false;
    }
  } catch (error) {
    console.error(`Unexpected error triggering processing for transcript ${transcriptId}:`, error);
    toast({
      title: "Error",
      description: "Unexpected error triggering transcript processing",
      variant: "destructive"
    });
    return false;
  }
}

/**
 * Reprocess a transcript with hierarchical chunking
 * @param transcriptId Transcript ID
 */
export async function reprocessTranscript(transcriptId: string): Promise<boolean> {
  // First mark for reprocessing
  const markResult = await markForReprocessing(transcriptId);
  if (!markResult) {
    return false;
  }

  // Then trigger processing
  return triggerTranscriptProcessing(transcriptId);
}

/**
 * Get all transcripts that need to be reprocessed with hierarchical chunking
 * (processed but no chunks or old chunking method)
 */
export async function getTranscriptsNeedingReprocessing(): Promise<any[]> {
  try {
    // This gets transcripts that are marked as processed but have no chunks
    const { data, error } = await supabase
      .from('transcripts')
      .select(`
        id,
        title,
        is_processed,
        metadata
      `)
      .eq('is_processed', true);

    if (error) {
      console.error('Error fetching transcripts needing reprocessing:', error);
      return [];
    }

    // For each transcript, check if it has chunks
    const transcriptsWithChunkCounts = await Promise.all(
      data.map(async (transcript) => {
        const { count, error: countError } = await supabase
          .from('chunks')
          .select('*', { count: 'exact', head: true })
          .eq('transcript_id', transcript.id);
          
        return {
          ...transcript,
          chunk_count: countError ? 0 : (count || 0)
        };
      })
    );

    // Filter transcripts with no chunks or old chunking method
    return transcriptsWithChunkCounts.filter(transcript => 
      transcript.chunk_count === 0 || 
      !(transcript.metadata?.chunking_strategy === 'hierarchical')
    );
  } catch (error) {
    console.error('Unexpected error fetching transcripts needing reprocessing:', error);
    return [];
  }
}

/**
 * Batch reprocess transcripts with hierarchical chunking
 * @param transcriptIds Array of transcript IDs
 * @param delayMs Delay between each processing request in milliseconds
 */
export async function batchReprocessTranscripts(
  transcriptIds: string[],
  delayMs: number = 1000
): Promise<{success: number, failed: number}> {
  let success = 0;
  let failed = 0;

  for (const id of transcriptIds) {
    const result = await reprocessTranscript(id);
    if (result) {
      success++;
    } else {
      failed++;
    }

    // Add delay between requests to avoid overwhelming the system
    if (delayMs > 0 && transcriptIds.indexOf(id) < transcriptIds.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return { success, failed };
}
