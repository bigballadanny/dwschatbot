
import { supabase } from '@/integrations/supabase/client';

/**
 * Update a single transcript's source type
 */
export async function updateTranscriptSourceType(transcriptId: string, newSource: string) {
  console.log(`[MANAGEMENT] Updating transcript ${transcriptId} source type to "${newSource}"`);
  
  try {
    const { error } = await supabase
      .from('transcripts')
      .update({ source: newSource })
      .eq('id', transcriptId);
      
    if (error) {
      console.error(`[MANAGEMENT] Error updating source type:`, error);
      throw error;
    }
    
    console.log(`[MANAGEMENT] Successfully updated transcript ${transcriptId} source type`);
    return { success: true };
  } catch (error: any) {
    console.error('[MANAGEMENT] Error updating transcript source type:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Marks a transcript as processed without actually processing it
 */
export async function markTranscriptAsProcessed(transcriptId: string) {
  console.log(`[MANAGEMENT] Manually marking transcript ${transcriptId} as processed`);
  
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
      console.error(`[MANAGEMENT] Error marking as processed:`, error);
      throw error;
    }
    
    console.log(`[MANAGEMENT] Successfully marked transcript ${transcriptId} as processed`);
    return { success: true };
  } catch (error: any) {
    console.error('[MANAGEMENT] Error marking transcript as processed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Checks the status of the transcripts storage bucket
 */
export async function checkTranscriptStorageBucket(): Promise<{ 
  exists: boolean; 
  isPublic: boolean;
  error?: string;
}> {
  console.log(`[MANAGEMENT] Checking transcripts storage bucket status`);
  
  try {
    // Check if the bucket exists
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error(`[MANAGEMENT] Error listing storage buckets:`, error);
      return { 
        exists: false, 
        isPublic: false,
        error: error.message 
      };
    }
    
    const transcriptsBucket = buckets?.find(bucket => bucket.name === 'transcripts');
    
    if (!transcriptsBucket) {
      console.log(`[MANAGEMENT] Transcripts storage bucket not found`);
      return { exists: false, isPublic: false };
    }
    
    console.log(`[MANAGEMENT] Transcripts bucket exists, public: ${transcriptsBucket.public}`);
    return { 
      exists: true, 
      isPublic: !!transcriptsBucket.public 
    };
  } catch (error: any) {
    console.error(`[MANAGEMENT] Error checking storage bucket:`, error);
    return { 
      exists: false, 
      isPublic: false,
      error: error.message 
    };
  }
}

/**
 * Creates the transcripts storage bucket if it doesn't exist
 */
export async function createTranscriptsBucket(): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log(`[MANAGEMENT] Creating transcripts storage bucket`);
  
  try {
    const { exists } = await checkTranscriptStorageBucket();
    
    if (exists) {
      console.log(`[MANAGEMENT] Transcripts bucket already exists`);
      return { success: true };
    }
    
    const { error } = await supabase.storage.createBucket('transcripts', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
    });
    
    if (error) {
      console.error(`[MANAGEMENT] Error creating transcripts bucket:`, error);
      return { 
        success: false,
        error: error.message
      };
    }
    
    console.log(`[MANAGEMENT] Successfully created transcripts bucket`);
    return { success: true };
  } catch (error: any) {
    console.error(`[MANAGEMENT] Error creating storage bucket:`, error);
    return { 
      success: false,
      error: error.message
    };
  }
}

/**
 * Get file content from storage for a transcript
 */
export async function getTranscriptFileContent(filePath: string): Promise<{
  success: boolean;
  content?: string;
  error?: string;
}> {
  console.log(`[MANAGEMENT] Getting file content for path: ${filePath}`);
  
  try {
    // Get file URL
    const { data, error: urlError } = supabase.storage
      .from('transcripts')
      .getPublicUrl(filePath);
    
    if (urlError || !data || !data.publicUrl) {
      console.error(`[MANAGEMENT] Error generating public URL for file:`, urlError);
      return { 
        success: false,
        error: urlError?.message || 'Failed to generate URL' 
      };
    }
    
    // Fetch the file content
    const response = await fetch(data.publicUrl);
    
    if (!response.ok) {
      console.error(`[MANAGEMENT] Error fetching file: ${response.status} ${response.statusText}`);
      return { 
        success: false,
        error: `Failed to fetch file: ${response.statusText}` 
      };
    }
    
    const content = await response.text();
    console.log(`[MANAGEMENT] Successfully retrieved file content (${content.length} characters)`);
    
    return { 
      success: true,
      content 
    };
  } catch (error: any) {
    console.error(`[MANAGEMENT] Error getting file content:`, error);
    return { 
      success: false,
      error: error.message
    };
  }
}
