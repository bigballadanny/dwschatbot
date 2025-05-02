
/**
 * @file Hook for loading and managing transcript details
 * @status active
 * @lastUsed 2025-05-03
 * @version 1.0
 * @tags transcript, hooks
 * @dependencies supabase/client
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export function useTranscriptDetails(transcriptId: string | null) {
  const [transcript, setTranscript] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTranscript = useCallback(async () => {
    if (!transcriptId) {
      setTranscript(null);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('id', transcriptId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      setTranscript(data);
    } catch (err: any) {
      console.error('Error fetching transcript details:', err);
      setError(`Failed to load transcript: ${err.message}`);
      toast({
        title: 'Error',
        description: 'Failed to load transcript details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [transcriptId, toast]);

  useEffect(() => {
    fetchTranscript();
  }, [fetchTranscript]);

  const refreshTranscript = useCallback(() => {
    fetchTranscript();
  }, [fetchTranscript]);

  return {
    transcript,
    isLoading,
    error,
    refreshTranscript
  };
}
