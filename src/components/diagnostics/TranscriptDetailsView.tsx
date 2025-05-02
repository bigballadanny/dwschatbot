
/**
 * @file Component for viewing detailed transcript information including chunks
 * @status active
 * @lastUsed 2025-05-03
 * @version 1.0
 * @tags diagnostics, transcript, chunks
 * @dependencies TranscriptChunks, reprocessTranscripts
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TranscriptChunks } from './TranscriptChunks';
import { reprocessTranscript } from '@/utils/diagnostics/reprocessTranscripts';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface TranscriptDetailsViewProps {
  transcript: any;
  onClose: () => void;
  onRefresh: () => void;
}

export const TranscriptDetailsView: React.FC<TranscriptDetailsViewProps> = ({ 
  transcript, 
  onClose,
  onRefresh
}) => {
  const [isReprocessing, setIsReprocessing] = React.useState(false);
  const { toast } = useToast();

  const handleReprocess = async () => {
    try {
      setIsReprocessing(true);
      const result = await reprocessTranscript(transcript.id);
      
      if (result) {
        toast({
          title: "Reprocessing Triggered",
          description: "Transcript will be reprocessed with hierarchical chunking",
        });
        onRefresh();
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{transcript.title}</h2>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={transcript.is_processed ? "success" : "outline"}>
          {transcript.is_processed ? "Processed" : "Unprocessed"}
        </Badge>
        <Badge variant={transcript.is_summarized ? "success" : "outline"}>
          {transcript.is_summarized ? "Summarized" : "Not Summarized"}
        </Badge>
        {transcript.tags && transcript.tags.map((tag: string) => (
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
          <TranscriptChunks transcriptId={transcript.id} />
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
                <pre className="whitespace-pre-wrap">{transcript.content}</pre>
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
              {formatMetadata(transcript.metadata)}
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-sm">
                Created: {new Date(transcript.created_at).toLocaleString()}
              </div>
              <div className="text-sm">
                Updated: {new Date(transcript.updated_at).toLocaleString()}
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
