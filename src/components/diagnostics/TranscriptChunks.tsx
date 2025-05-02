
/**
 * @file Component for viewing transcript chunks in hierarchy
 * @status active
 * @lastUsed 2025-05-03
 * @version 1.0
 * @tags diagnostics, chunks, transcript
 * @dependencies supabase/client, ui/card, ui/alert
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { InfoIcon, ChevronRight, ChevronDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ChunkMetadata {
  position: number;
  parent_id: string | null;
  chunk_strategy: string;
  [key: string]: any;
}

interface TranscriptChunk {
  id: string;
  content: string;
  transcript_id: string;
  chunk_type: 'parent' | 'child';
  topic: string | null;
  metadata: ChunkMetadata;
}

interface TranscriptChunksProps {
  transcriptId: string;
}

export const TranscriptChunks: React.FC<TranscriptChunksProps> = ({ transcriptId }) => {
  const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('hierarchical');
  const { toast } = useToast();

  useEffect(() => {
    const fetchChunks = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('chunks')
          .select('*')
          .eq('transcript_id', transcriptId);

        if (error) {
          throw error;
        }

        if (data) {
          setChunks(data as TranscriptChunk[]);
          
          // Initialize expanded state for parent chunks
          const initialExpanded: Record<string, boolean> = {};
          data
            .filter((chunk: TranscriptChunk) => chunk.chunk_type === 'parent')
            .forEach((chunk: TranscriptChunk) => {
              initialExpanded[chunk.id] = false;
            });
          
          setExpandedParents(initialExpanded);
        }
      } catch (err) {
        console.error('Error fetching transcript chunks:', err);
        setError('Failed to fetch chunks for this transcript');
        toast({
          title: 'Error',
          description: 'Failed to fetch transcript chunks',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (transcriptId) {
      fetchChunks();
    }
  }, [transcriptId, toast]);

  const toggleParentExpansion = (parentId: string) => {
    setExpandedParents(prev => ({
      ...prev,
      [parentId]: !prev[parentId]
    }));
  };

  const parentChunks = chunks.filter(chunk => chunk.chunk_type === 'parent');
  const childChunks = chunks.filter(chunk => chunk.chunk_type === 'child');

  const getChildrenOfParent = (parentId: string) => {
    return childChunks.filter(chunk => 
      chunk.metadata?.parent_id === parentId
    ).sort((a, b) => 
      (a.metadata?.position || 0) - (b.metadata?.position || 0)
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Transcript Chunks</span>
          <Badge variant={chunks.length > 0 ? "success" : "destructive"}>
            {chunks.length} chunks
          </Badge>
        </CardTitle>
        <CardDescription>
          View hierarchical chunks created for this transcript
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : chunks.length === 0 ? (
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>No chunks found</AlertTitle>
            <AlertDescription>
              This transcript hasn't been processed with chunking yet.
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs defaultValue="hierarchical" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="hierarchical">Hierarchical View</TabsTrigger>
              <TabsTrigger value="parents">Parents Only</TabsTrigger>
              <TabsTrigger value="children">Children Only</TabsTrigger>
            </TabsList>
            
            <TabsContent value="hierarchical" className="space-y-4">
              {parentChunks.map(parent => (
                <div key={parent.id} className="border rounded-md p-4">
                  <div 
                    className="cursor-pointer flex items-center justify-between font-medium"
                    onClick={() => toggleParentExpansion(parent.id)}
                  >
                    <div className="flex items-center gap-2">
                      {expandedParents[parent.id] ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                      <span>
                        {parent.topic || `Parent Chunk ${parent.metadata?.position || 0}`}
                      </span>
                    </div>
                    <Badge>Position: {parent.metadata?.position || 0}</Badge>
                  </div>
                  
                  <div className="mt-2 bg-muted p-3 rounded text-sm">
                    {parent.content.substring(0, 150)}...
                  </div>
                  
                  {expandedParents[parent.id] && (
                    <div className="mt-4 pl-6 border-l-2 border-muted space-y-3">
                      {getChildrenOfParent(parent.id).map(child => (
                        <div key={child.id} className="bg-accent/20 p-3 rounded-md">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-medium">Child #{child.metadata?.position}</span>
                            <Badge variant="outline" className="text-xs">
                              {child.id.substring(0, 8)}
                            </Badge>
                          </div>
                          <div className="text-sm">{child.content}</div>
                        </div>
                      ))}
                      {getChildrenOfParent(parent.id).length === 0 && (
                        <div className="text-sm text-muted-foreground italic p-2">
                          No child chunks found for this parent
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>
            
            <TabsContent value="parents">
              <div className="space-y-4">
                {parentChunks.map(parent => (
                  <Card key={parent.id}>
                    <CardHeader className="py-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>{parent.topic || `Parent ${parent.metadata?.position || 0}`}</span>
                        <Badge>ID: {parent.id.substring(0, 8)}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="whitespace-pre-wrap text-sm">{parent.content}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="children">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {childChunks.map(child => (
                  <Card key={child.id}>
                    <CardHeader className="py-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>Child #{child.metadata?.position}</span>
                        <Badge variant="outline">
                          Parent: {(child.metadata?.parent_id || "").substring(0, 8)}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="whitespace-pre-wrap text-sm">{child.content}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Chunking strategy: {chunks[0]?.metadata?.chunk_strategy || "Not specified"}
      </CardFooter>
    </Card>
  );
};
