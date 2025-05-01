
import { supabase } from '@/integrations/supabase/client';

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
