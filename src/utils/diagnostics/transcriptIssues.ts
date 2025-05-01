
import { supabase } from '@/integrations/supabase/client';
import { Transcript } from '@/utils/transcriptUtils';

// Define a proper type for the transcript metadata
export type TranscriptMetadata = {
  processing_started_at?: string;
  processing_completed_at?: string; 
  processing_error?: string;
  processing_failed?: boolean;
  retry_count?: number;
  retry_triggered_at?: string;
  manually_marked_as_processed?: boolean;
  manual_processing_triggered_at?: string;
  [key: string]: any;
};

// Export the DiagnosticTranscript type that extends Transcript
export interface DiagnosticTranscript extends Transcript {
  metadata: TranscriptMetadata;
}

export interface TranscriptIssuesResult {
  stats: {
    total: number;
    emptyContent: number;
    missingFilePath: number;
    recentlyUploaded: number;
    businessSummitTranscripts: number;
    potentialSummitTranscripts: number;
    unprocessedTranscripts: number;
    processingFailures: number;
    stuckInProcessing: number;
  };
  recentTranscripts: DiagnosticTranscript[];
  potentialSummitTranscripts: DiagnosticTranscript[];
  unprocessedTranscripts: DiagnosticTranscript[];
  processingFailures: DiagnosticTranscript[];
  stuckInProcessing: DiagnosticTranscript[];
  emptyContentTranscripts: DiagnosticTranscript[];
}

/**
 * Checks for transcripts that might have upload or processing issues
 */
export async function checkForTranscriptIssues(): Promise<TranscriptIssuesResult> {
  try {
    console.log(`[ISSUES] Checking for transcript issues`);
    
    // Get all transcripts
    const { data: transcripts, error } = await supabase
      .from('transcripts')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error(`[ISSUES] Error fetching transcripts:`, error);
      throw error;
    }
    
    console.log(`[ISSUES] Successfully fetched ${transcripts.length} transcripts`);
    
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
    
    const recentTranscripts: DiagnosticTranscript[] = [];
    const potentialSummitTranscripts: DiagnosticTranscript[] = [];
    const unprocessedTranscripts: DiagnosticTranscript[] = [];
    const processingFailures: DiagnosticTranscript[] = [];
    const stuckInProcessing: DiagnosticTranscript[] = [];
    const emptyContentTranscripts: DiagnosticTranscript[] = [];
    
    transcripts.forEach(transcript => {
      // Ensure metadata is an object
      const metadata = transcript.metadata && typeof transcript.metadata === 'object' 
        ? transcript.metadata as TranscriptMetadata
        : {} as TranscriptMetadata;
        
      const typedTranscript = {
        ...transcript,
        metadata
      } as DiagnosticTranscript;
      
      // Check for empty content
      if (!transcript.content || transcript.content.trim() === '') {
        stats.emptyContent++;
        emptyContentTranscripts.push(typedTranscript);
      }
      
      // Check for missing file path
      if (!transcript.file_path) {
        stats.missingFilePath++;
      }
      
      // Check for recent uploads
      const createdAt = new Date(transcript.created_at);
      if (createdAt > lastHour) {
        stats.recentlyUploaded++;
        recentTranscripts.push(typedTranscript);
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
        potentialSummitTranscripts.push(typedTranscript);
        stats.potentialSummitTranscripts++;
      }
      
      // Check for unprocessed transcripts
      if (transcript.is_processed === false) {
        unprocessedTranscripts.push(typedTranscript);
        stats.unprocessedTranscripts++;
        
        // Check for transcripts stuck in processing
        if (metadata.processing_started_at) {
          const processingStartedAt = new Date(metadata.processing_started_at);
          const fiveMinutesAgo = new Date();
          fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
          
          if (processingStartedAt < fiveMinutesAgo) {
            stuckInProcessing.push(typedTranscript);
            stats.stuckInProcessing++;
          }
        }
      }
      
      // Check for processing failures
      if (metadata.processing_failed || metadata.processing_error) {
        processingFailures.push(typedTranscript);
        stats.processingFailures++;
      }
    });
    
    return { 
      stats, 
      recentTranscripts, 
      potentialSummitTranscripts, 
      unprocessedTranscripts, 
      processingFailures,
      stuckInProcessing,
      emptyContentTranscripts
    };
  } catch (error) {
    console.error('[ISSUES] Error checking for transcript issues:', error);
    throw error;
  }
}
