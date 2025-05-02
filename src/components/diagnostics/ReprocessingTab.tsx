import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, CheckCircle, RefreshCcw, Loader2 } from 'lucide-react';
import { reprocessAllTranscripts, hasHierarchicalChunks } from '@/utils/diagnostics/reprocessTranscripts';

export function ReprocessingTab() {
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStats, setProcessingStats] = useState<{processed: number, total: number}>({processed: 0, total: 0});
  const [chunkingStats, setChunkingStats] = useState<{hierarchical: number, legacy: number, unknown: number}>({
    hierarchical: 0,
    legacy: 0,
    unknown: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTranscripts();
  }, []);

  const fetchTranscripts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('transcripts')
        .select('id, title, is_processed, metadata, content')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transcripts:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch transcripts',
          variant: 'destructive',
        });
        return;
      }

      const transcriptData = await Promise.all(
        data.map(async (transcript) => {
          const hasHierarchical = await hasHierarchicalChunks(transcript.id);
          const chunkingType = hasHierarchical
            ? 'hierarchical'
            : transcript.is_processed
              ? 'legacy'
              : 'unknown';

          const { count, error: chunkError } = await supabase
            .from('chunks')
            .select('*', { count: 'exact', head: true })
            .eq('transcript_id', transcript.id);

          if (chunkError) {
            console.error('Error fetching chunk count:', chunkError);
            return { ...transcript, chunkingType, chunkCount: 'N/A' };
          }

          return { ...transcript, chunkingType, chunkCount: count };
        })
      );

      setTranscripts(transcriptData);

      const hierarchicalCount = transcriptData.filter(t => t.chunkingType === 'hierarchical').length;
      const legacyCount = transcriptData.filter(t => t.chunkingType === 'legacy').length;
      const unknownCount = transcriptData.filter(t => t.chunkingType === 'unknown').length;

      setChunkingStats({
        hierarchical: hierarchicalCount,
        legacy: legacyCount,
        unknown: unknownCount
      });
    } catch (error) {
      console.error('Error in fetchTranscripts:', error);
      toast({
        title: 'Error',
        description: 'Failed to process transcripts',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReprocessAll = async () => {
    setIsProcessing(true);
    setProgress(0);
    setProcessingStats({ processed: 0, total: transcripts.length });

    try {
      const { success, failed } = await reprocessAllTranscripts();
      toast({
        title: 'Reprocessing Complete',
        description: `Successfully reprocessed ${success} transcripts. Failed to reprocess ${failed} transcripts.`,
      });
      await fetchTranscripts();
    } catch (error) {
      console.error('Error in handleReprocessAll:', error);
      toast({
        title: 'Error',
        description: 'Failed to reprocess all transcripts',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const handleSingleReprocess = async (id: string) => {
    try {
      // Simulate reprocessing
      toast({
        title: 'Reprocessing',
        description: `Reprocessing transcript with ID: ${id}`,
      });
      await reprocessAllTranscripts();
      await fetchTranscripts();
    } catch (error) {
      console.error('Error in handleSingleReprocess:', error);
      toast({
        title: 'Error',
        description: `Failed to reprocess transcript with ID: ${id}`,
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = async () => {
    await fetchTranscripts();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Transcript Reprocessing</h2>
          <p className="text-muted-foreground">Reprocess transcripts with the latest chunking algorithms</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Chunking Stats</CardTitle>
            <CardDescription>Current transcript chunking status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Hierarchical chunking:</span>
                <Badge variant="secondary">{chunkingStats.hierarchical}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Legacy chunking:</span>
                <Badge variant="outline">{chunkingStats.legacy}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Unknown/No chunks:</span>
                <Badge variant="outline">{chunkingStats.unknown}</Badge>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <div className="text-xs text-muted-foreground">
              Total transcripts: {transcripts.length}
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Reprocess All</CardTitle>
            <CardDescription>Reprocess all transcripts without hierarchical chunks</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                This action will reprocess all transcripts that do not have hierarchical chunks.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={handleReprocessAll} disabled={isProcessing} variant="destructive">
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                'Reprocess All'
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Maintenance</CardTitle>
            <CardDescription>Utilities for system maintenance</CardDescription>
          </CardHeader>
          <CardContent>
            <p>No maintenance utilities available at this time.</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" disabled>
              Coming Soon
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {isProcessing && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Processing Progress</CardTitle>
            <CardDescription>Reprocessing transcripts with hierarchical chunking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Processing {processingStats.processed} of {processingStats.total} transcripts</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
      )}
      
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Transcripts</TabsTrigger>
          <TabsTrigger value="hierarchical">Hierarchical Chunks</TabsTrigger>
          <TabsTrigger value="legacy">Legacy Chunks</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          <TranscriptTable 
            transcripts={transcripts} 
            isLoading={isLoading} 
            onReprocess={handleSingleReprocess}
          />
        </TabsContent>
        
        <TabsContent value="hierarchical" className="mt-4">
          <TranscriptTable 
            transcripts={transcripts.filter(t => t.chunkingType === 'hierarchical')} 
            isLoading={isLoading} 
            onReprocess={handleSingleReprocess}
          />
        </TabsContent>
        
        <TabsContent value="legacy" className="mt-4">
          <TranscriptTable 
            transcripts={transcripts.filter(t => t.chunkingType === 'legacy' || t.chunkingType === 'unknown')} 
            isLoading={isLoading} 
            onReprocess={handleSingleReprocess}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TranscriptTable({ 
  transcripts, 
  isLoading, 
  onReprocess 
}: {
  transcripts: any[],
  isLoading: boolean,
  onReprocess: (id: string) => Promise<void>
}) {
  const [processingIds, setProcessingIds] = useState<Record<string, boolean>>({});
  
  const handleReprocess = async (id: string) => {
    setProcessingIds(prev => ({ ...prev, [id]: true }));
    await onReprocess(id);
    setProcessingIds(prev => ({ ...prev, [id]: false }));
  };
  
  if (isLoading) {
    return <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  }
  
  if (transcripts.length === 0) {
    return <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>No transcripts found</AlertTitle>
      <AlertDescription>
        No transcripts match the current filter criteria.
      </AlertDescription>
    </Alert>
  }
  
  return (
    <Card>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Chunking Type</TableHead>
                <TableHead>Chunks</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transcripts.map(transcript => (
                <TableRow key={transcript.id}>
                  <TableCell className="font-medium">{transcript.title}</TableCell>
                  <TableCell>
                    {transcript.is_processed ? (
                      <Badge variant="secondary">Processed</Badge>
                    ) : (
                      <Badge variant="outline">Unprocessed</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {transcript.chunkingType === 'hierarchical' ? (
                      <Badge variant="secondary">Hierarchical</Badge>
                    ) : transcript.chunkingType === 'legacy' ? (
                      <Badge variant="outline">Legacy</Badge>
                    ) : (
                      <Badge variant="outline">Unknown</Badge>
                    )}
                  </TableCell>
                  <TableCell>{transcript.chunkCount}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      onClick={() => handleReprocess(transcript.id)} 
                      disabled={processingIds[transcript.id]} 
                      size="sm" 
                      variant="outline"
                    >
                      {processingIds[transcript.id] ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <RefreshCcw className="h-4 w-4 mr-1" />
                      )}
                      Reprocess
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
