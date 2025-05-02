
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

// Define proper types for metadata and chunks
export interface ChunkMetadata {
  position: number;
  parent_id: string | null;
  chunk_strategy: string;
  [key: string]: any;
}

export interface TranscriptChunk {
  id: string;
  content: string;
  transcript_id: string;
  chunk_type: 'parent' | 'child';
  topic: string | null;
  metadata: ChunkMetadata;
  created_at?: string;
}

export function useTranscriptDetails(transcriptId: string | null) {
  const [transcript, setTranscript] = useState<any | null>(null);
  const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chunksError, setChunksError] = useState<string | null>(null);
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
  
  const fetchChunks = useCallback(async () => {
    if (!transcriptId) {
      setChunks([]);
      setChunksError(null);
      return;
    }
    
    try {
      setIsLoadingChunks(true);
      setChunksError(null);
      
      const { data, error: chunksError } = await supabase
        .from('chunks')
        .select('*')
        .eq('transcript_id', transcriptId)
        .order('metadata->position', { ascending: true });
        
      if (chunksError) {
        throw chunksError;
      }
      
      // Map the data with proper type casting
      const typedChunks: TranscriptChunk[] = data?.map(chunk => ({
        ...chunk,
        chunk_type: (chunk.chunk_type === 'parent' || chunk.chunk_type === 'child') 
          ? chunk.chunk_type 
          : 'parent', // Default to parent if invalid
        metadata: chunk.metadata as ChunkMetadata
      })) || [];
      
      setChunks(typedChunks);
    } catch (err: any) {
      console.error('Error fetching transcript chunks:', err);
      setChunksError(`Failed to load chunks: ${err.message}`);
      toast({
        title: 'Error',
        description: 'Failed to load transcript chunks',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingChunks(false);
    }
  }, [transcriptId, toast]);

  useEffect(() => {
    fetchTranscript();
  }, [fetchTranscript]);
  
  useEffect(() => {
    if (transcript && transcript.is_processed) {
      fetchChunks();
    }
  }, [transcript, fetchChunks]);

  const refreshTranscript = useCallback(() => {
    fetchTranscript();
  }, [fetchTranscript]);
  
  const refreshChunks = useCallback(() => {
    fetchChunks();
  }, [fetchChunks]);

  return {
    transcript,
    chunks,
    isLoading,
    isLoadingChunks,
    error,
    chunksError,
    refreshTranscript,
    refreshChunks
  };
}
