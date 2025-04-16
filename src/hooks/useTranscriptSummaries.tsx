
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showWarning } from "@/utils/toastUtils";

interface SummaryProgress {
  completed: number;
  total: number;
  inProgress: boolean;
  errors: number;
}

interface UseTranscriptSummariesOptions {
  userId: string;
  maxConcurrent?: number;
}

export function useTranscriptSummaries({ userId, maxConcurrent = 2 }: UseTranscriptSummariesOptions) {
  const [progress, setProgress] = useState<SummaryProgress>({
    completed: 0,
    total: 0,
    inProgress: false,
    errors: 0
  });

  const summarizeTranscript = async (transcriptId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-transcript-summary', {
        body: { transcriptId, userId }
      });

      if (error || data?.error) {
        console.error('Error generating summary:', error || data?.error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Exception in summarizeTranscript:', err);
      return false;
    }
  };

  const batchSummarizeTranscripts = async (transcriptIds: string[]): Promise<void> => {
    // Don't start if already in progress
    if (progress.inProgress) {
      showWarning("Process Already Running", "A summarization batch is already in progress.");
      return;
    }
    
    if (!transcriptIds.length) {
      showWarning("No Transcripts Selected", "Please select at least one transcript to summarize.");
      return;
    }
    
    const totalCount = transcriptIds.length;
    
    setProgress({
      total: totalCount,
      completed: 0,
      inProgress: true,
      errors: 0
    });
    
    try {
      let completed = 0;
      let errors = 0;
      
      // Process in batches to avoid overwhelming the API
      for (let i = 0; i < totalCount; i += maxConcurrent) {
        const batch = transcriptIds.slice(i, i + maxConcurrent);
        
        // Process batch in parallel
        const results = await Promise.all(
          batch.map(id => summarizeTranscript(id))
        );
        
        // Update counts
        completed += results.filter(success => success).length;
        errors += results.filter(success => !success).length;
        
        // Update progress
        setProgress({
          total: totalCount,
          completed,
          inProgress: completed + errors < totalCount,
          errors
        });
      }
      
      if (errors > 0) {
        showWarning(
          "Batch Processing Completed with Errors", 
          `Summarized ${completed} transcripts with ${errors} errors.`
        );
      } else {
        showSuccess(
          "Batch Processing Completed", 
          `Successfully summarized ${completed} transcripts.`
        );
      }
    } catch (err) {
      console.error('Error in batch processing:', err);
      showError("Batch Processing Failed", "An error occurred during batch processing.");
      
      setProgress(prev => ({
        ...prev,
        inProgress: false
      }));
    }
  };

  const cancelBatchProcessing = () => {
    // In this implementation, we're not actually canceling in-flight requests
    // since that would require a more complex implementation with signal controllers
    // Instead, we just mark the processing as no longer in progress
    setProgress(prev => ({
      ...prev,
      inProgress: false
    }));
    
    showWarning("Processing Stopped", "Summary generation has been stopped. Any in-progress summaries may still complete.");
  };

  return {
    progress,
    summarizeTranscript,
    batchSummarizeTranscripts,
    cancelBatchProcessing
  };
}
