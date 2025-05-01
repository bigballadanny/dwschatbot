
import { supabase } from '@/integrations/supabase/client';

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
        } as Record<string, any>
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
