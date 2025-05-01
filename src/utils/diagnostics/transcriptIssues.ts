
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
      potentialSummitTranscripts: 0,
      unprocessedTranscripts: 0,
      processingFailures: 0,
      stuckInProcessing: 0
    };
    
    const lastHour = new Date();
    lastHour.setHours(lastHour.getHours() - 1);
    
    const recentTranscripts = [];
    const potentialSummitTranscripts = [];
    const unprocessedTranscripts = [];
    const processingFailures = [];
    const stuckInProcessing = [];
    
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
      
      // Check for unprocessed transcripts
      if (transcript.is_processed === false) {
        unprocessedTranscripts.push(transcript);
        stats.unprocessedTranscripts++;
        
        // Check for transcripts stuck in processing
        if (transcript.metadata && typeof transcript.metadata === 'object') {
          const metadata = transcript.metadata as Record<string, any>;
          if (metadata.processing_started_at) {
            const processingStartedAt = new Date(metadata.processing_started_at);
            const fiveMinutesAgo = new Date();
            fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
            
            if (processingStartedAt < fiveMinutesAgo) {
              stuckInProcessing.push(transcript);
              stats.stuckInProcessing++;
            }
          }
        }
      }
      
      // Check for processing failures
      if (transcript.metadata && typeof transcript.metadata === 'object') {
        const metadata = transcript.metadata as Record<string, any>;
        if (metadata.processing_failed || metadata.processing_error) {
          processingFailures.push(transcript);
          stats.processingFailures++;
        }
      }
    });
    
    return { 
      stats, 
      recentTranscripts, 
      potentialSummitTranscripts, 
      unprocessedTranscripts, 
      processingFailures,
      stuckInProcessing
    };
  } catch (error) {
    console.error('Error checking for transcript issues:', error);
    throw error;
  }
}
