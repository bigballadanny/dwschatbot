
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/integrations/supabase/client';
import { useTranscriptSummaries } from '@/hooks/transcripts/useTranscriptSummaries';
import { Loader2, CheckCircle, AlertCircle, Search, X } from 'lucide-react';

interface Transcript {
  id: string;
  title: string;
  is_summarized: boolean;
}

interface BatchSummaryProcessorProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  selectedTranscriptIds?: string[];
}

const BatchSummaryProcessor: React.FC<BatchSummaryProcessorProps> = ({
  open,
  onClose,
  userId,
  selectedTranscriptIds = []
}) => {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedTranscriptIds);
  const [isLoading, setIsLoading] = useState(true);
  
  const {
    progress,
    batchSummarizeTranscripts,
    cancelBatchProcessing
  } = useTranscriptSummaries({ userId });

  useEffect(() => {
    if (open) {
      fetchTranscripts();
    }
  }, [open]);

  useEffect(() => {
    setSelectedIds(selectedTranscriptIds);
  }, [selectedTranscriptIds]);

  const fetchTranscripts = async () => {
    setIsLoading(true);
    
    try {
      // Fetch all transcripts without summaries
      const { data, error } = await supabase
        .from('transcripts')
        .select('id, title, is_summarized')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      setTranscripts(data || []);
    } catch (err) {
      console.error('Error fetching transcripts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTranscript = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  };

  const selectUnsummarized = () => {
    const unsummarizedIds = transcripts
      .filter(t => !t.is_summarized)
      .map(t => t.id);
    setSelectedIds(unsummarizedIds);
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleStartProcessing = async () => {
    if (selectedIds.length === 0) return;
    await batchSummarizeTranscripts(selectedIds);
  };

  const handleClose = () => {
    if (!progress.inProgress) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Batch Summary Generation</DialogTitle>
          <DialogDescription>
            Generate AI summaries for multiple transcripts at once.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-3">
              <div>
                <span className="text-sm font-medium">
                  {selectedIds.length} of {transcripts.length} selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectUnsummarized} disabled={progress.inProgress}>
                  Select Unsummarized
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection} disabled={selectedIds.length === 0 || progress.inProgress}>
                  Clear
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[300px] border rounded-md p-1">
              {transcripts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <Search className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No transcripts found</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {transcripts.map(transcript => (
                    <div
                      key={transcript.id}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted/70 ${
                        selectedIds.includes(transcript.id) ? 'bg-muted' : ''
                      } ${progress.inProgress ? 'pointer-events-none' : ''}`}
                      onClick={() => toggleTranscript(transcript.id)}
                    >
                      <div className="flex-1 truncate mr-2">
                        {transcript.title}
                      </div>
                      <div className="flex items-center gap-2">
                        {transcript.is_summarized ? (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span className="text-xs">Summarized</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 text-amber-500" />
                            <span className="text-xs">No Summary</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {progress.inProgress && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>Processing: {progress.completed} of {progress.total}</span>
                  {progress.errors > 0 && (
                    <span className="text-red-500">Errors: {progress.errors}</span>
                  )}
                </div>
                <Progress value={(progress.completed / progress.total) * 100} />
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              {progress.inProgress ? (
                <Button variant="destructive" onClick={cancelBatchProcessing} className="flex items-center gap-1">
                  <X className="h-4 w-4" />
                  Cancel Processing
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    onClick={handleStartProcessing}
                    disabled={selectedIds.length === 0}
                  >
                    Generate {selectedIds.length} {selectedIds.length === 1 ? 'Summary' : 'Summaries'}
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BatchSummaryProcessor;
