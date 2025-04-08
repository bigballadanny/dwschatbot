import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Tag as TagIcon, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Play,
  Pause,
  Sparkles,
  Settings,
  FileText
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { formatTagForDisplay, suggestTagsFromContent, detectSourceCategory, getSourceCategories } from '@/utils/transcriptUtils';
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
  const [enableAutoTagging, setEnableAutoTagging] = useState(false);
  const [enableCategorizing, setEnableCategorizing] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [defaultSourceCategory, setDefaultSourceCategory] = useState<string>('');
  const [useDefaultSource, setUseDefaultSource] = useState(false);

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
    
    if (!enableAutoTagging && !enableCategorizing && !useDefaultSource) {
      showWarning("No actions selected", "Please enable at least one action (auto-tagging, categorizing, or default source) before processing.");
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
      
      // Process source categorization if enabled
      if (enableCategorizing || useDefaultSource) {
        const currentSource = transcript.source;
        
        // Apply default source if enabled and a default is selected
        if (useDefaultSource && defaultSourceCategory) {
          updates.source = defaultSourceCategory;
          wasUpdated = true;
          addLog(`Applied default source category: ${defaultSourceCategory}`);
          setResults(prev => ({ ...prev, categorized: prev.categorized + 1 }));
        } 
        // Otherwise use automatic detection if categorizing is enabled
        else if (enableCategorizing) {
          const detectedSource = detectSourceCategory(transcript.title, transcript.content);
          
          // Only update source if needed
          if (
            (!currentSource || 
            currentSource === 'other' || 
            (detectedSource === 'business_acquisitions_summit' && currentSource !== 'business_acquisitions_summit') ||
            (detectedSource === 'foundations_call' && currentSource === 'protege_call') ||
            (detectedSource === 'business_acquisitions_summit_2025' && currentSource !== 'business_acquisitions_summit_2025'))
          ) {
            updates.source = detectedSource;
            wasUpdated = true;
            addLog(`Auto-detected source category: ${detectedSource}`);
            setResults(prev => ({ ...prev, categorized: prev.categorized + 1 }));
          }
        }
      }
      
      // Process tags if enabled
      if (enableAutoTagging && transcript.content) {
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
      } else {
        addLog(`No changes needed for: ${transcript.title}`);
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
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <DialogTitle>Bulk Process Transcripts</DialogTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                className="h-8 w-8"
              >
                <Settings className="h-4 w-4" />
                <span className="sr-only">Settings</span>
              </Button>
            </div>
            <DialogDescription>
              Automatically process multiple transcripts at once
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {transcripts.length > 0 && (
              <Alert>
                <AlertTitle>Found {transcripts.length} transcripts</AlertTitle>
                <AlertDescription>
                  Ready to process {transcripts.length} transcripts 
                  {[enableCategorizing && !useDefaultSource, enableAutoTagging, useDefaultSource].filter(Boolean).length > 0 
                    ? ' for ' + [
                        enableAutoTagging ? 'tag detection' : '',
                        enableCategorizing && !useDefaultSource ? 'auto-categorization' : '',
                        useDefaultSource ? 'default source assignment' : ''
                      ].filter(Boolean).join(', ')
                    : ''}
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
                  {enableAutoTagging && (
                    <div className="bg-muted rounded-md p-2 text-center">
                      <p className="text-sm font-medium">Tagged</p>
                      <p className="text-lg">{results.tagged}</p>
                    </div>
                  )}
                  {(enableCategorizing || useDefaultSource) && (
                    <div className="bg-muted rounded-md p-2 text-center">
                      <p className="text-sm font-medium">Categorized</p>
                      <p className="text-lg">{results.categorized}</p>
                    </div>
                  )}
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
                  Selected operations:
                </p>
                <ul className="text-sm list-disc pl-6 space-y-1 text-left">
                  {useDefaultSource && (
                    <li>Apply a default source category to all transcripts</li>
                  )}
                  {enableCategorizing && !useDefaultSource && (
                    <li>Auto-categorize transcripts by type (Protege, Foundations, Business Summit, etc.)</li>
                  )}
                  {enableAutoTagging && (
                    <li>Detect and add relevant tags based on content (uses AI resources)</li>
                  )}
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
                  {enableAutoTagging && (
                    <div className="bg-muted rounded-md p-2 text-center">
                      <p className="text-sm font-medium">Tagged</p>
                      <p className="text-lg">{results.tagged}</p>
                    </div>
                  )}
                  {(enableCategorizing || useDefaultSource) && (
                    <div className="bg-muted rounded-md p-2 text-center">
                      <p className="text-sm font-medium">Categorized</p>
                      <p className="text-lg">{results.categorized}</p>
                    </div>
                  )}
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
      </Dialog>

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

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Processing Settings</DialogTitle>
            <DialogDescription>
              Configure which operations to run on your transcripts
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="enable-auto-tagging"
                checked={enableAutoTagging}
                onCheckedChange={(checked) => setEnableAutoTagging(checked === true)}
              />
              <label 
                htmlFor="enable-auto-tagging" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Enable auto-tagging (uses AI resources)
              </label>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="use-default-source"
                  checked={useDefaultSource}
                  onCheckedChange={(checked) => {
                    const isChecked = checked === true;
                    setUseDefaultSource(isChecked);
                    
                    // If enabling default source, disable auto categorization
                    if (isChecked) {
                      setEnableCategorizing(false);
                    }
                  }}
                />
                <label 
                  htmlFor="use-default-source" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Apply default source category to all transcripts
                </label>
              </div>
              
              {useDefaultSource && (
                <div className="pl-6">
                  <div className="grid gap-2">
                    <Label htmlFor="default-source" className="text-sm">Default Source:</Label>
                    <Select 
                      value={defaultSourceCategory} 
                      onValueChange={setDefaultSourceCategory}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a source category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Source Categories</SelectLabel>
                          {getSourceCategories().map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="enable-categorizing"
                checked={enableCategorizing}
                disabled={useDefaultSource}
                onCheckedChange={(checked) => setEnableCategorizing(checked === true)}
              />
              <label 
                htmlFor="enable-categorizing" 
                className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed ${useDefaultSource ? 'text-gray-400' : ''}`}
              >
                Enable auto-categorization
                {useDefaultSource && " (disabled when using default source)"}
              </label>
            </div>

            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Resource Usage</AlertTitle>
              <AlertDescription className="text-xs">
                Auto-tagging analyzes transcript content and may use more resources. 
                Categorization is lightweight and primarily based on transcript titles.
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BulkTagProcessor;
