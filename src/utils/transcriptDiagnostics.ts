
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
      businessSummitTranscripts: 0,
      potentialSummitTranscripts: 0
    };
    
    const lastHour = new Date();
    lastHour.setHours(lastHour.getHours() - 1);
    
    const recentTranscripts = [];
    const potentialSummitTranscripts = [];
    
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
    });
    
    return { stats, recentTranscripts, potentialSummitTranscripts };
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
 * Ensures all transcripts have the correct source type
 */
export async function fixTranscriptSourceTypes(specificIds?: string[]) {
  try {
    // Get all transcripts or specified ones
    const query = supabase.from('transcripts').select('*');
    
    if (specificIds && specificIds.length > 0) {
      query.in('id', specificIds);
    }
    
    const { data: transcripts, error } = await query;
      
    if (error) {
      throw error;
    }
    
    let fixedCount = 0;
    const errors = [];
    
    // Get transcripts with upload date on the 27th (current or previous month)
    const targetDate = new Date();
    const monthsToCheck = [targetDate.getMonth(), targetDate.getMonth() - 1];
    const year = targetDate.getFullYear();
    
    for (const transcript of transcripts) {
      let shouldFix = false;
      let newSource = transcript.source;
      
      // Detect if this should be a business acquisitions summit transcript
      const isSummitTranscript = 
        transcript.title?.toLowerCase().includes('summit') || 
        transcript.title?.toLowerCase().includes('acquisitions summit') ||
        transcript.title?.toLowerCase().includes('acquisition summit') ||
        (transcript.content && (
          transcript.content.toLowerCase().includes('business acquisitions summit') ||
          transcript.content.toLowerCase().includes('business acquisition summit')
        ));
      
      // Check if it was uploaded on the 27th of current or previous month
      const createdAt = new Date(transcript.created_at);
      const isUploadedOn27th = createdAt.getDate() === 27 && 
                              monthsToCheck.includes(createdAt.getMonth()) && 
                              createdAt.getFullYear() === year;
      
      // If it's a summit transcript but not labeled as such, update it
      if (isSummitTranscript && transcript.source !== 'business_acquisitions_summit') {
        shouldFix = true;
        newSource = 'business_acquisitions_summit';
      }
      
      // If it was uploaded on the 27th and not properly categorized as summit
      if (isUploadedOn27th && transcript.source !== 'business_acquisitions_summit') {
        shouldFix = true;
        newSource = 'business_acquisitions_summit';
      }
      
      // If specific IDs were provided, force update regardless of other conditions
      if (specificIds && specificIds.includes(transcript.id)) {
        shouldFix = true;
      }
      
      if (shouldFix) {
        const { error: updateError } = await supabase
          .from('transcripts')
          .update({ source: newSource })
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
