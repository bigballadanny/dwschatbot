
import { supabase } from '@/integrations/supabase/client';

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
      businessSummitTranscripts: 0
    };
    
    const lastHour = new Date();
    lastHour.setHours(lastHour.getHours() - 1);
    
    const recentTranscripts = [];
    
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
    });
    
    return { stats, recentTranscripts };
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
        const fileUrl = `${supabase.storageUrl}/object/public/transcripts/${transcript.file_path}`;
        
        try {
          // Fetch the file content
          const response = await fetch(fileUrl);
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
 * Ensures all transcripts have the correct source type
 */
export async function fixTranscriptSourceTypes() {
  try {
    // Get all transcripts
    const { data: transcripts, error } = await supabase
      .from('transcripts')
      .select('*');
      
    if (error) {
      throw error;
    }
    
    let fixedCount = 0;
    const errors = [];
    
    for (const transcript of transcripts) {
      // Detect if this should be a business acquisitions summit transcript
      const isSummitTranscript = 
        transcript.title.toLowerCase().includes('summit') || 
        transcript.title.toLowerCase().includes('acquisitions summit') ||
        (transcript.content && transcript.content.toLowerCase().includes('business acquisitions summit'));
      
      // If it's a summit transcript but not labeled as such, update it
      if (isSummitTranscript && transcript.source !== 'business_acquisitions_summit') {
        const { error: updateError } = await supabase
          .from('transcripts')
          .update({ source: 'business_acquisitions_summit' })
          .eq('id', transcript.id);
          
        if (updateError) {
          errors.push(`Error updating transcript ${transcript.id}: ${updateError.message}`);
        } else {
          fixedCount++;
        }
      }
    }
    
    return { fixedCount, errors };
  } catch (error: any) {
    console.error('Error fixing transcript source types:', error);
    return { fixedCount: 0, errors: [error.message] };
  }
}
