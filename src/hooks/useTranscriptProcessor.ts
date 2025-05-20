import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showWarning } from '@/utils/toastUtils';

interface ProcessingResult {
  success: number;
  failed: number;
  errors: string[];
}

export const useTranscriptProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<Map<string, string>>(new Map());

  const processTranscript = useCallback(async (transcriptId: string, forceProcess = false) => {
    try {
      setProcessingStatus(prev => new Map(prev).set(transcriptId, 'processing'));
      
      const { data, error } = await supabase.functions.invoke('process-transcript', {
        body: { transcriptId, forceProcess }
      });

      if (error) throw error;

      setProcessingStatus(prev => new Map(prev).set(transcriptId, 'completed'));
      return { success: true, error: null };
    } catch (error) {
      console.error(`Failed to process transcript ${transcriptId}:`, error);
      setProcessingStatus(prev => new Map(prev).set(transcriptId, 'failed'));
      return { success: false, error: error.message };
    }
  }, []);

  const processBatch = useCallback(async (
    transcriptIds: string[], 
    options = { batchSize: 5, delay: 1000 }
  ): Promise<ProcessingResult> => {
    const result: ProcessingResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    setIsProcessing(true);

    try {
      for (let i = 0; i < transcriptIds.length; i += options.batchSize) {
        const batch = transcriptIds.slice(i, i + options.batchSize);
        
        const batchPromises = batch.map(id => processTranscript(id, true));
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((res, index) => {
          if (res.status === 'fulfilled' && res.value.success) {
            result.success++;
          } else {
            result.failed++;
            const error = res.status === 'rejected' 
              ? res.reason 
              : res.value.error;
            result.errors.push(`Transcript ${batch[index]}: ${error}`);
          }
        });

        // Add delay between batches to avoid overwhelming the system
        if (i + options.batchSize < transcriptIds.length) {
          await new Promise(resolve => setTimeout(resolve, options.delay));
        }
      }

      // Show result summary
      if (result.success > 0 && result.failed === 0) {
        showSuccess(
          "Batch Processing Complete", 
          `Successfully processed ${result.success} transcript${result.success !== 1 ? 's' : ''}`
        );
      } else if (result.success > 0 && result.failed > 0) {
        showWarning(
          "Batch Processing Partial Success",
          `Processed ${result.success} successfully, ${result.failed} failed`
        );
      } else {
        showError(
          "Batch Processing Failed",
          `Failed to process all ${result.failed} transcripts`
        );
      }

      return result;
    } finally {
      setIsProcessing(false);
      setProcessingStatus(new Map());
    }
  }, [processTranscript]);

  const retryFailed = useCallback(async (transcriptIds: string[]) => {
    const failedIds = transcriptIds.filter(id => 
      processingStatus.get(id) === 'failed'
    );

    if (failedIds.length === 0) {
      showWarning("No Failed Transcripts", "No failed transcripts to retry");
      return { success: 0, failed: 0, errors: [] };
    }

    showSuccess("Retrying Failed", `Retrying ${failedIds.length} failed transcripts`);
    return processBatch(failedIds, { batchSize: 3, delay: 2000 });
  }, [processingStatus, processBatch]);

  const getProcessingStatus = useCallback((transcriptId: string) => {
    return processingStatus.get(transcriptId) || 'idle';
  }, [processingStatus]);

  return {
    processTranscript,
    processBatch,
    retryFailed,
    isProcessing,
    getProcessingStatus,
    processingStatus
  };
};