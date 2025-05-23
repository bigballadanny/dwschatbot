
/**
 * @file Component for viewing detailed transcript information including chunks
 * @status active
 * @lastUsed 2025-05-03
 * @version 1.0
 * @tags diagnostics, transcript, chunks
 * @dependencies TranscriptChunks, reprocessTranscripts
 */

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TranscriptChunks } from './TranscriptChunks';
import { reprocessTranscript } from '@/utils/diagnostics/reprocessTranscripts';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { useTranscriptDetails } from '@/hooks/transcripts/useTranscriptDetails';

interface TranscriptDetailsViewProps {
  transcript?: any;
  transcriptId?: string;
  onClose: () => void;
  onRefresh: () => void;
}

export const TranscriptDetailsView: React.FC<TranscriptDetailsViewProps> = ({ 
  transcript: propTranscript, 
  transcriptId,
  onClose,
  onRefresh
}) => {
  const [isReprocessing, setIsReprocessing] = React.useState(false);
  const { toast } = useToast();
  const { transcript, isLoading, error, refreshTranscript } = useTranscriptDetails(transcriptId);
  
  // Use either the provided transcript or the one fetched via the hook
  const transcriptData = propTranscript || transcript;

  const handleReprocess = async () => {
    if (!transcriptData) return;

    try {
      setIsReprocessing(true);
      const result = await reprocessTranscript(transcriptData.id);
      
      if (result) {
        toast({
          title: "Reprocessing Triggered",
          description: "Transcript will be reprocessed with hierarchical chunking",
        });
        
        // Refresh data
        refreshTranscript();
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Error reprocessing transcript:', error);
      toast({
        title: "Error",
        description: "Failed to reprocess transcript",
        variant: "destructive"
      });
    } finally {
      setIsReprocessing(false);
    }
  };

  const formatMetadata = (metadata: any) => {
    if (!metadata) return "No metadata";
    
    return (
      <div className="space-y-2">
        {Object.entries(metadata).map(([key, value]) => (
          <div key={key} className="flex flex-col">
            <span className="text-xs font-medium">{key}</span>
            <span className="text-xs text-muted-foreground break-all">
              {typeof value === 'object' 
                ? JSON.stringify(value) 
                : String(value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin mr-2" />
      <p>Loading transcript details...</p>
    </div>;
  }

  if (error || (!transcriptData && !isLoading)) {
    return <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg">
      <h3 className="text-lg font-medium text-red-800 dark:text-red-300">Error loading transcript</h3>
      <p className="text-red-700 dark:text-red-400">{error || "Transcript not found"}</p>
      <Button variant="outline" onClick={onClose} className="mt-4">Close</Button>
    </div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{transcriptData.title}</h2>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={transcriptData.is_processed ? "secondary" : "outline"}>
          {transcriptData.is_processed ? "Processed" : "Unprocessed"}
        </Badge>
        <Badge variant={transcriptData.is_summarized ? "secondary" : "outline"}>
          {transcriptData.is_summarized ? "Summarized" : "Not Summarized"}
        </Badge>
        {transcriptData.tags && transcriptData.tags.map((tag: string) => (
          <Badge key={tag} variant="secondary">{tag}</Badge>
        ))}
      </div>
      
      <Tabs defaultValue="chunks">
        <TabsList>
          <TabsTrigger value="chunks">Chunks</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chunks" className="space-y-4">
          <div className="flex justify-end">
            <Button 
              onClick={handleReprocess} 
              disabled={isReprocessing}
              variant="outline"
            >
              {isReprocessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reprocess with Hierarchical Chunking
            </Button>
          </div>
          <TranscriptChunks transcriptId={transcriptData.id} />
        </TabsContent>
        
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Transcript Content</CardTitle>
              <CardDescription>
                Full content of the transcript
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[500px] overflow-y-auto bg-muted p-4 rounded">
                <pre className="whitespace-pre-wrap">{transcriptData.content}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="metadata">
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
              <CardDescription>
                Additional information about this transcript
              </CardDescription>
            </CardHeader>
            <CardContent>
              {formatMetadata(transcriptData.metadata)}
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-sm">
                Created: {new Date(transcriptData.created_at).toLocaleString()}
              </div>
              <div className="text-sm">
                Updated: {new Date(transcriptData.updated_at).toLocaleString()}
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
