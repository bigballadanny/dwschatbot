
/**
 * @file Tab for reprocessing transcripts with hierarchical chunking
 * @status active
 * @lastUsed 2025-05-03
 * @version 1.0
 * @tags diagnostics, transcript, reprocessing
 * @dependencies reprocessTranscripts
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { InfoIcon, Loader2 } from 'lucide-react';
import { getTranscriptsNeedingReprocessing, batchReprocessTranscripts } from '@/utils/diagnostics/reprocessTranscripts';
import { formatDistanceToNow } from 'date-fns';

export const ReprocessingTab: React.FC = () => {
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTranscripts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const transcriptsData = await getTranscriptsNeedingReprocessing();
      setTranscripts(transcriptsData);
    } catch (err) {
      console.error('Error fetching transcripts for reprocessing:', err);
      setError('Failed to fetch transcripts');
      toast({
        title: 'Error',
        description: 'Failed to fetch transcripts that need reprocessing',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTranscripts();
  }, []);

  const handleRefresh = () => {
    fetchTranscripts();
  };

  const handleReprocessAll = async () => {
    if (transcripts.length === 0 || isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      const ids = transcripts.map(t => t.id);
      const { success, failed } = await batchReprocessTranscripts(ids, 2000);
      
      toast({
        title: 'Reprocessing Initiated',
        description: `Successfully initiated reprocessing for ${success} transcripts. Failed: ${failed}.`,
        variant: success > 0 ? 'default' : 'destructive',
      });
      
      // Refresh the list after processing
      setTimeout(() => {
        fetchTranscripts();
      }, 5000);
    } catch (err) {
      console.error('Error reprocessing transcripts:', err);
      toast({
        title: 'Error',
        description: 'Failed to reprocess transcripts',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Hierarchical Chunking Reprocessing</span>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
          </Button>
        </CardTitle>
        <CardDescription>
          Reprocess transcripts with hierarchical chunking
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : transcripts.length === 0 ? (
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>No transcripts need reprocessing</AlertTitle>
            <AlertDescription>
              All transcripts have already been processed with the latest chunking method.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">
                {transcripts.length} Transcript{transcripts.length !== 1 ? 's' : ''} Need Reprocessing
              </h3>
              <Button onClick={handleReprocessAll} disabled={isProcessing}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reprocess All
              </Button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {transcripts.map(transcript => (
                <div key={transcript.id} className="border p-3 rounded-md flex justify-between items-center">
                  <div>
                    <div className="font-medium">{transcript.title}</div>
                    <div className="text-sm text-muted-foreground">
                      Created {formatDistanceToNow(new Date(transcript.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {transcript.chunk_count} chunks
                    </Badge>
                    <Badge variant={transcript.is_processed ? "success" : "outline"}>
                      {transcript.is_processed ? "Processed" : "Unprocessed"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Hierarchical chunking creates parent-child relationships between chunks to preserve context.
        </p>
      </CardFooter>
    </Card>
  );
};
