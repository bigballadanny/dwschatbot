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
import { supabase } from '@/integrations/supabase/client';

/**
 * Enhanced bucket check with better error handling and authentication checks
 * FIXED: Prevents unnecessary bucket creation attempts
 */
export async function checkTranscriptStorageBucket(): Promise<{ 
  exists: boolean; 
  isPublic: boolean;
  error?: string;
}> {
  console.log(`[BUCKET] Checking transcripts storage bucket status`);
  
  try {
    // First check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log(`[BUCKET] User not authenticated, skipping bucket check`);
      return { 
        exists: false, 
        isPublic: false,
        error: 'User not authenticated' 
      };
    }

    // Try to list buckets with proper error handling
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error(`[BUCKET] Error listing storage buckets:`, error);
      
      // If it's an RLS error, the bucket likely exists but user can't see it
      // This happens in some edge cases with timing
      if (error.message?.includes('RLS') || error.message?.includes('policy')) {
        console.log(`[BUCKET] RLS error during listing - assuming bucket exists`);
        return { 
          exists: true, 
          isPublic: true // Assume public since that's our standard setup
        };
      }
      
      return { 
        exists: false, 
        isPublic: false,
        error: error.message 
      };
    }
    
    if (!buckets) {
      console.log(`[BUCKET] No buckets returned from listing`);
      return { exists: false, isPublic: false };
    }
    
    const transcriptsBucket = buckets.find(bucket => bucket.name === 'transcripts');
    
    if (!transcriptsBucket) {
      console.log(`[BUCKET] Transcripts storage bucket not found in list`);
      return { exists: false, isPublic: false };
    }
    
    console.log(`[BUCKET] Transcripts bucket exists, public: ${transcriptsBucket.public}`);
    return { 
      exists: true, 
      isPublic: !!transcriptsBucket.public 
    };
  } catch (error: any) {
    console.error(`[BUCKET] Exception during bucket check:`, error);
    
    // If it's a general authentication or RLS error, assume bucket exists
    // to prevent unnecessary creation attempts
    if (error.message?.includes('RLS') || 
        error.message?.includes('policy') || 
        error.message?.includes('authentication')) {
      console.log(`[BUCKET] Auth/RLS exception - assuming bucket exists to prevent creation attempts`);
      return { 
        exists: true, 
        isPublic: true 
      };
    }
    
    return { 
      exists: false, 
      isPublic: false,
      error: error.message 
    };
  }
}

/**
 * SAFER bucket creation that won't attempt duplicate creation
 * FIXED: Enhanced logic to prevent RLS violations
 */
export async function createTranscriptsBucket(): Promise<{
  success: boolean;
  error?: string;
  message?: string;
}> {
  console.log(`[BUCKET] Starting safe bucket creation process`);
  
  try {
    // Always check first - with enhanced logic
    const { exists, error: checkError } = await checkTranscriptStorageBucket();
    
    if (checkError && !checkError.includes('RLS') && !checkError.includes('policy')) {
      console.error(`[BUCKET] Error during bucket check: ${checkError}`);
      return { 
        success: false,
        error: `Bucket check failed: ${checkError}`
      };
    }
    
    if (exists) {
      console.log(`[BUCKET] Transcripts bucket already exists - no creation needed`);
      return { 
        success: true,
        message: 'Bucket already exists'
      };
    }
    
    console.log(`[BUCKET] Bucket doesn't exist, attempting creation`);
    
    // Only create if we're certain it doesn't exist
    const { error } = await supabase.storage.createBucket('transcripts', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: [
        'text/plain',
        'application/pdf', 
        'text/csv',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ]
    });
    
    if (error) {
      // If error says bucket already exists, that's actually success
      if (error.message?.includes('already exists') || 
          error.message?.includes('duplicate')) {
        console.log(`[BUCKET] Bucket creation returned 'already exists' - treating as success`);
        return { 
          success: true,
          message: 'Bucket already existed'
        };
      }
      
      console.error(`[BUCKET] Error creating transcripts bucket:`, error);
      return { 
        success: false,
        error: error.message
      };
    }
    
    console.log(`[BUCKET] Successfully created transcripts bucket`);
    return { 
      success: true,
      message: 'Bucket created successfully'
    };
  } catch (error: any) {
    console.error(`[BUCKET] Exception during bucket creation:`, error);
    
    // Handle "already exists" exceptions gracefully
    if (error.message?.includes('already exists') || 
        error.message?.includes('duplicate')) {
      console.log(`[BUCKET] Exception indicates bucket already exists - treating as success`);
      return { 
        success: true,
        message: 'Bucket already existed'
      };
    }
    
    return { 
      success: false,
      error: error.message
    };
  }
}
