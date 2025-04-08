
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { 
  Tag as TagIcon, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Play,
  Pause,
  Sparkles
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { formatTagForDisplay, suggestTagsFromContent, detectSourceCategory } from '@/utils/transcriptUtils';
import { showSuccess, showError, showWarning } from '@/utils/toastUtils';

interface BulkTagProcessorProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const BulkTagProcessor: React.FC<BulkTagProcessorProps> = ({ open, onClose, onComplete }) => {
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState({ 
    processed: 0,
    tagged: 0, 
    categorized: 0,
    errors: 0 
  });
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchTranscripts();
    }
  }, [open]);

  const fetchTranscripts = async () => {
    try {
      const { data, error } = await supabase
        .from('transcripts')
        .select('id, title, content, source, tags')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        setTranscripts(data);
        setCurrentIndex(0);
        setProgress(0);
        setResults({ processed: 0, tagged: 0, categorized: 0, errors: 0 });
        setProcessingLogs([]);
        addLog(`Found ${data.length} transcripts to process`);
      }
    } catch (error) {
      console.error("Error fetching transcripts:", error);
      showError("Failed to fetch transcripts", "There was an error loading the transcripts. Please try again.");
    }
  };

  const addLog = (message: string) => {
    setProcessingLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const startProcessing = () => {
    if (transcripts.length === 0) {
      showWarning("No transcripts to process", "There are no transcripts available for processing.");
      return;
    }
    
    setIsProcessing(true);
    setIsPaused(false);
    setProgress(0);
    setResults({ processed: 0, tagged: 0, categorized: 0, errors: 0 });
    setCurrentIndex(0);
    processNextTranscript();
  };

  const pauseProcessing = () => {
    setIsPaused(true);
    setProcessingStatus("Processing paused");
  };

  const resumeProcessing = () => {
    setIsPaused(false);
    processNextTranscript();
  };

  const processNextTranscript = async () => {
    if (isPaused || currentIndex >= transcripts.length) {
      if (currentIndex >= transcripts.length) {
        setIsProcessing(false);
        setProcessingStatus("Processing complete");
        showSuccess(
          "Processing complete", 
          `Processed ${results.processed} transcripts: ${results.tagged} tagged, ${results.categorized} categorized, ${results.errors} errors`
        );
      }
      return;
    }

    const transcript = transcripts[currentIndex];
    setProcessingStatus(`Processing transcript ${currentIndex + 1}/${transcripts.length}: ${transcript.title}`);
    addLog(`Processing: ${transcript.title}`);

    try {
      let wasUpdated = false;
      const updates: Record<string, any> = {};
      
      // Process source categorization
      const currentSource = transcript.source;
      const detectedSource = detectSourceCategory(transcript.title, transcript.content);
      
      // Only update source if needed
      if (
        (!currentSource || 
        currentSource === 'other' || 
        (detectedSource === 'business_acquisitions_summit' && currentSource !== 'business_acquisitions_summit') ||
        (detectedSource === 'foundations_call' && currentSource === 'protege_call'))
      ) {
        updates.source = detectedSource;
        wasUpdated = true;
        addLog(`Updated source category to: ${detectedSource}`);
        setResults(prev => ({ ...prev, categorized: prev.categorized + 1 }));
      }
      
      // Process tags
      if (transcript.content) {
        const suggestedTags = suggestTagsFromContent(transcript.content);
        const existingTags = transcript.tags || [];
        
        // Add new tags that don't exist yet
        const newTags = suggestedTags.filter(tag => !existingTags.includes(tag));
        
        if (newTags.length > 0) {
          const updatedTags = [...existingTags, ...newTags];
          updates.tags = updatedTags;
          wasUpdated = true;
          addLog(`Added ${newTags.length} new tags: ${newTags.map(formatTagForDisplay).join(', ')}`);
          setResults(prev => ({ ...prev, tagged: prev.tagged + 1 }));
        }
      }
      
      // Update the transcript if changes were made
      if (wasUpdated) {
        const { error } = await supabase
          .from('transcripts')
          .update(updates)
          .eq('id', transcript.id);
        
        if (error) {
          throw error;
        }
        
        // Update the local transcript data
        setTranscripts(prevTranscripts => {
          const updated = [...prevTranscripts];
          updated[currentIndex] = { ...updated[currentIndex], ...updates };
          return updated;
        });
      }
      
      setResults(prev => ({ ...prev, processed: prev.processed + 1 }));
    } catch (error) {
      console.error(`Error processing transcript ${transcript.id}:`, error);
      addLog(`Error processing transcript: ${transcript.title}`);
      setResults(prev => ({ ...prev, errors: prev.errors + 1, processed: prev.processed + 1 }));
    }
    
    // Update progress
    const newProgress = Math.round(((currentIndex + 1) / transcripts.length) * 100);
    setProgress(newProgress);
    
    // Move to the next transcript
    setCurrentIndex(prev => prev + 1);
    
    // Process the next one with a small delay to avoid overwhelming the browser
    setTimeout(() => {
      processNextTranscript();
    }, 100);
  };

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Bulk Tag & Categorize Transcripts
          </DialogTitle>
          <DialogDescription>
            Automatically detect tags and categories for all your transcripts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {transcripts.length > 0 && (
            <Alert>
              <AlertTitle>Found {transcripts.length} transcripts</AlertTitle>
              <AlertDescription>
                Ready to process {transcripts.length} transcripts for tag and category detection
              </AlertDescription>
            </Alert>
          )}

          {isProcessing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">{processingStatus}</p>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {currentIndex} of {transcripts.length} ({progress}% complete)
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted rounded-md p-2 text-center">
                  <p className="text-sm font-medium">Tagged</p>
                  <p className="text-lg">{results.tagged}</p>
                </div>
                <div className="bg-muted rounded-md p-2 text-center">
                  <p className="text-sm font-medium">Categorized</p>
                  <p className="text-lg">{results.categorized}</p>
                </div>
              </div>
              
              <div className="flex justify-center">
                {isPaused ? (
                  <Button onClick={resumeProcessing} variant="outline" size="sm" className="w-full">
                    <Play className="w-4 h-4 mr-2" />
                    Resume Processing
                  </Button>
                ) : (
                  <Button onClick={pauseProcessing} variant="outline" size="sm" className="w-full">
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Processing
                  </Button>
                )}
              </div>
              
              <Button 
                onClick={() => setDetailsOpen(true)} 
                variant="ghost" 
                size="sm" 
                className="w-full"
              >
                View Processing Details
              </Button>
            </div>
          )}

          {!isProcessing && !results.processed && (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                This process will scan all your transcripts and automatically:
              </p>
              <ul className="text-sm list-disc pl-6 space-y-1 text-left">
                <li>Detect and add relevant tags based on content</li>
                <li>Categorize transcripts by type (Protege, Foundations, Business Summit, etc.)</li>
                <li>Only add new information without overwriting existing customizations</li>
              </ul>
            </div>
          )}

          {!isProcessing && results.processed > 0 && (
            <div className="space-y-4">
              <Alert variant="default" className="bg-green-50 border-green-100">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle>Processing Complete</AlertTitle>
                <AlertDescription>
                  Successfully processed {results.processed} transcripts
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted rounded-md p-2 text-center">
                  <p className="text-sm font-medium">Processed</p>
                  <p className="text-lg">{results.processed}</p>
                </div>
                <div className="bg-muted rounded-md p-2 text-center">
                  <p className="text-sm font-medium">Tagged</p>
                  <p className="text-lg">{results.tagged}</p>
                </div>
                <div className="bg-muted rounded-md p-2 text-center">
                  <p className="text-sm font-medium">Categorized</p>
                  <p className="text-lg">{results.categorized}</p>
                </div>
              </div>
              
              {results.errors > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Processing Errors</AlertTitle>
                  <AlertDescription>
                    Encountered {results.errors} errors during processing
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={results.processed > 0 ? handleComplete : onClose}
            disabled={isProcessing && !isPaused}
          >
            {results.processed > 0 ? 'Done' : 'Cancel'}
          </Button>
          
          {!isProcessing && !results.processed && (
            <Button 
              onClick={startProcessing}
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Start Processing
            </Button>
          )}
          
          {!isProcessing && results.processed > 0 && (
            <Button 
              onClick={startProcessing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Process Again
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Processing details dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Processing Details</DialogTitle>
            <DialogDescription>
              Log of all tag and categorization operations
            </DialogDescription>
          </DialogHeader>
          <div className="h-[300px] overflow-y-auto border rounded-md p-3 bg-muted/20">
            {processingLogs.map((log, index) => (
              <p key={index} className="text-xs mb-1 font-mono">{log}</p>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default BulkTagProcessor;
