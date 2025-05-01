
/**
 * Utilities for identifying and retrieving transcript issues
 */
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

/**
 * Type definitions for transcript diagnostics
 */
export interface DiagnosticTranscript {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  source?: string;
  content?: string;
  file_path?: string;
  is_processed?: boolean;
  is_summarized?: boolean;
  metadata?: Record<string, any> | Json;
}

export interface DiagnosticResult {
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
  emptyContentTranscripts?: DiagnosticTranscript[];
}

/**
 * Checks for transcripts that might have upload issues
 */
export async function checkForTranscriptIssues(): Promise<DiagnosticResult> {
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
    
    const recentTranscripts: DiagnosticTranscript[] = [];
    const potentialSummitTranscripts: DiagnosticTranscript[] = [];
    const unprocessedTranscripts: DiagnosticTranscript[] = [];
    const processingFailures: DiagnosticTranscript[] = [];
    const stuckInProcessing: DiagnosticTranscript[] = [];
    const emptyContentTranscripts: DiagnosticTranscript[] = [];
    
    // Type assertion to make TypeScript happy
    (transcripts || []).forEach((transcript: any) => {
      // Check for empty content
      if (!transcript.content || transcript.content.trim() === '') {
        stats.emptyContent++;
        emptyContentTranscripts.push(transcript as DiagnosticTranscript);
      }
      
      // Check for missing file path
      if (!transcript.file_path) {
        stats.missingFilePath++;
      }
      
      // Check for recent uploads
      const createdAt = new Date(transcript.created_at);
      if (createdAt > lastHour) {
        stats.recentlyUploaded++;
        recentTranscripts.push(transcript as DiagnosticTranscript);
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
        potentialSummitTranscripts.push(transcript as DiagnosticTranscript);
        stats.potentialSummitTranscripts++;
      }
      
      // Check for unprocessed transcripts
      if (transcript.is_processed === false) {
        unprocessedTranscripts.push(transcript as DiagnosticTranscript);
        stats.unprocessedTranscripts++;
        
        // Check for transcripts stuck in processing
        if (transcript.metadata && typeof transcript.metadata === 'object') {
          const metadata = transcript.metadata as Record<string, any>;
          if (metadata.processing_started_at) {
            const processingStartedAt = new Date(metadata.processing_started_at);
            const fiveMinutesAgo = new Date();
            fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
            
            if (processingStartedAt < fiveMinutesAgo) {
              stuckInProcessing.push(transcript as DiagnosticTranscript);
              stats.stuckInProcessing++;
            }
          }
        }
      }
      
      // Check for processing failures
      if (transcript.metadata && typeof transcript.metadata === 'object') {
        const metadata = transcript.metadata as Record<string, any>;
        if (metadata.processing_failed || metadata.processing_error) {
          processingFailures.push(transcript as DiagnosticTranscript);
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
      stuckInProcessing,
      emptyContentTranscripts
    };
  } catch (error) {
    console.error('Error checking for transcript issues:', error);
    throw error;
  }
}

/**
 * Gets all transcripts with no content but with file paths
 */
export async function getTranscriptsWithEmptyContent(): Promise<DiagnosticTranscript[]> {
  try {
    const { data: transcripts, error } = await supabase
      .from('transcripts')
      .select('*')
      .or('content.is.null,content.eq.')
      .order('created_at', { ascending: false });
      
    if (error) {
      throw error;
    }
    
    return transcripts as DiagnosticTranscript[] || [];
  } catch (error) {
    console.error('Error fetching empty content transcripts:', error);
    return [];
  }
}

/**
 * Gets all unprocessed transcripts
 */
export async function getUnprocessedTranscripts(): Promise<DiagnosticTranscript[]> {
  try {
    const { data: transcripts, error } = await supabase
      .from('transcripts')
      .select('*')
      .eq('is_processed', false)
      .order('created_at', { ascending: false });
      
    if (error) {
      throw error;
    }
    
    return transcripts as DiagnosticTranscript[] || [];
  } catch (error) {
    console.error('Error fetching unprocessed transcripts:', error);
    return [];
  }
}

/**
 * Gets all stuck transcripts (started processing but not completed after 5 minutes)
 */
export async function getStuckTranscripts(): Promise<DiagnosticTranscript[]> {
  try {
    const { data: transcripts, error } = await supabase
      .from('transcripts')
      .select('*')
      .eq('is_processed', false)
      .order('created_at', { ascending: false });
      
    if (error) {
      throw error;
    }
    
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    
    const stuckTranscripts = (transcripts || []).filter(transcript => {
      if (!transcript.metadata || typeof transcript.metadata !== 'object') {
        return false;
      }
      
      const metadata = transcript.metadata as Record<string, any>;
      if (!metadata.processing_started_at) {
        return false;
      }
      
      const processingStartedAt = new Date(metadata.processing_started_at);
      return processingStartedAt < fiveMinutesAgo;
    });
    
    return stuckTranscripts as DiagnosticTranscript[];
  } catch (error) {
    console.error('Error fetching stuck transcripts:', error);
    return [];
  }
}
