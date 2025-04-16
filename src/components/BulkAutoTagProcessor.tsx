
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showWarning } from "@/utils/toastUtils";
import { Loader2, CheckCircle, AlertCircle, Search, X } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface Transcript {
  id: string;
  title: string;
  tags?: string[];
}

interface BulkAutoTagProcessorProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

const BulkAutoTagProcessor: React.FC<BulkAutoTagProcessorProps> = ({
  open,
  onClose,
  userId
}) => {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState({
    total: 0,
    completed: 0,
    inProgress: false,
    errors: 0
  });

  useEffect(() => {
    if (open) {
      fetchTranscripts();
    }
  }, [open]);

  const fetchTranscripts = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('transcripts')
        .select('id, title, tags')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      setTranscripts(data || []);
    } catch (err) {
      console.error('Error fetching transcripts:', err);
      showError('Error', 'Failed to fetch transcripts');
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

  const selectUntagged = () => {
    const untaggedIds = transcripts
      .filter(t => !t.tags || t.tags.length === 0)
      .map(t => t.id);
    setSelectedIds(untaggedIds);
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleAutoTagging = async () => {
    if (selectedIds.length === 0) return;
    
    setProgress({
      total: selectedIds.length,
      completed: 0,
      inProgress: true,
      errors: 0
    });

    try {
      for (const transcriptId of selectedIds) {
        const { data, error } = await supabase.functions.invoke('auto-tag-transcript', {
          body: { transcriptId, userId }
        });

        if (error || data?.error) {
          console.error('Error auto-tagging transcript:', error || data?.error);
          setProgress(prev => ({
            ...prev,
            errors: prev.errors + 1,
            completed: prev.completed + 1
          }));
        } else {
          setProgress(prev => ({
            ...prev,
            completed: prev.completed + 1
          }));
        }
      }

      // Refetch transcripts to update tags
      fetchTranscripts();

      if (progress.errors > 0) {
        showWarning(
          'Batch Processing Completed with Errors', 
          `Auto-tagged ${progress.completed} transcripts with ${progress.errors} errors.`
        );
      } else {
        showSuccess(
          'Batch Processing Completed', 
          `Successfully auto-tagged ${progress.completed} transcripts.`
        );
      }
    } catch (err) {
      console.error('Error in batch processing:', err);
      showError("Batch Processing Failed", "An error occurred during batch processing.");
    } finally {
      setProgress(prev => ({
        ...prev,
        inProgress: false
      }));
    }
  };

  const handleClose = () => {
    if (!progress.inProgress) {
      onClose();
    }
  };

  return (
    <div>
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
              <Button variant="outline" size="sm" onClick={selectUntagged} disabled={progress.inProgress}>
                Select Untagged
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
                      {transcript.tags && transcript.tags.length > 0 ? (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span className="text-xs">{transcript.tags.length} Tag{transcript.tags.length !== 1 ? 's' : ''}</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 text-amber-500" />
                          <span className="text-xs">No Tags</span>
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
              <Button variant="destructive" onClick={handleClose} className="flex items-center gap-1">
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
                  onClick={handleAutoTagging}
                  disabled={selectedIds.length === 0}
                >
                  Auto-tag {selectedIds.length} {selectedIds.length === 1 ? 'Transcript' : 'Transcripts'}
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BulkAutoTagProcessor;

