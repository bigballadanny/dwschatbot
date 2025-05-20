import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, AlertTriangle, Check, FileType, FileText, Settings, Tags, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { detectSourceCategory, getSourceCategories, suggestTagsFromContent } from '@/utils/transcriptUtils';
import { showSuccess, showError, showWarning } from "@/utils/toastUtils";
import { TagsInput } from "@/components/TagsInput";

interface BulkTagProcessorProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface Transcript {
  id: string;
  title: string;
  content: string;
  created_at: string;
  file_path?: string;
  source?: string;
  tags?: string[];
  is_processed?: boolean;
}

const BulkTagProcessor: React.FC<BulkTagProcessorProps> = ({ open, onClose, onComplete }) => {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [defaultSource, setDefaultSource] = useState<string>('');
  const [useDefaultSource, setUseDefaultSource] = useState(false);
  const [autoTags, setAutoTags] = useState<string[]>([]);
  const [applyAutoTags, setApplyAutoTags] = useState(true);
  const [globalTags, setGlobalTags] = useState<string[]>([]);
  const [applyGlobalTags, setApplyGlobalTags] = useState(false);
  const [overwriteExistingTags, setOverwriteExistingTags] = useState(false);
  const [unprocessedOnly, setUnprocessedOnly] = useState(true);
  const [selectedTab, setSelectedTab] = useState<string>('bulk');
  const { user } = useAuth();

  const fetchUnprocessedTranscripts = useCallback(async () => {
    if (!user) {
      setError('You must be logged in to process transcripts.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const filteredData = unprocessedOnly 
          ? data.filter(t => !t.is_processed) 
          : data;
        setTranscripts(filteredData);
      }
    } catch (error: unknown) {
      console.error('Error fetching transcripts:', error instanceof Error ? error.message : String(error));
      setError(`Error fetching transcripts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [user, unprocessedOnly]);

  useEffect(() => {
    if (open) {
      fetchUnprocessedTranscripts();
    }
  }, [open, fetchUnprocessedTranscripts]);

  const processTranscripts = async () => {
    if (!user || transcripts.length === 0) {
      showWarning("No transcripts", "There are no transcripts to process.");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessedCount(0);
    setError('');

    try {
      let processed = 0;

      for (const transcript of transcripts) {
        try {
          let updatedSource = transcript.source;
          let updatedTags = transcript.tags || [];
          
          if (useDefaultSource && defaultSource) {
            updatedSource = defaultSource;
          } else if (!transcript.source) {
            updatedSource = detectSourceCategory(transcript.title, transcript.content);
          }
          
          if (applyAutoTags && transcript.content) {
            const suggestedTags = suggestTagsFromContent(transcript.content);
            
            if (overwriteExistingTags) {
              updatedTags = [...suggestedTags];
            } else {
              updatedTags = [...new Set([...updatedTags, ...suggestedTags])];
            }
          }
          
          if (applyGlobalTags && globalTags.length > 0) {
            if (overwriteExistingTags) {
              updatedTags = [...globalTags];
            } else {
              updatedTags = [...new Set([...updatedTags, ...globalTags])];
            }
          }
          
          const { error: updateError } = await supabase
            .from('transcripts')
            .update({
              source: updatedSource,
              tags: updatedTags.length > 0 ? updatedTags : null,
              is_processed: true
            })
            .eq('id', transcript.id)
            .eq('user_id', user.id);

          if (updateError) throw updateError;
          
          processed++;
          setProcessedCount(processed);
          setProgress(Math.round((processed / transcripts.length) * 100));
        } catch (error: unknown) {
          console.error(`Error processing transcript ${transcript.id}:`, error instanceof Error ? error.message : String(error));
        }
      }

      showSuccess("Processing complete", `Successfully processed ${processed} transcripts.`);
      onComplete();
    } catch (error: unknown) {
      console.error('Error during bulk processing:', error instanceof Error ? error.message : String(error));
      setError(`Error during processing: ${error instanceof Error ? error.message : String(error)}`);
      showError("Processing error", "There was an error during the bulk processing. Some transcripts may not have been updated.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectTab = (value: string) => {
    setSelectedTab(value);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Transcript Bulk Processor
          </DialogTitle>
          <DialogDescription>
            Process and categorize multiple transcripts at once
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="bulk" value={selectedTab} onValueChange={handleSelectTab} className="w-full">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="bulk" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Bulk Process</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center gap-1">
              <Tags className="h-4 w-4" />
              <span className="hidden sm:inline">Tags</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bulk" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Transcripts to Process</h3>
                  <p className="text-sm text-muted-foreground">
                    {transcripts.length} transcript{transcripts.length !== 1 ? 's' : ''}
                  </p>
                </div>
                
                <Button 
                  variant="outline" 
                  onClick={fetchUnprocessedTranscripts}
                  size="sm"
                >
                  Refresh
                </Button>
              </div>
              
              {isProcessing ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Processing transcripts...</span>
                    <span className="text-sm font-medium">{processedCount} of {transcripts.length}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              ) : transcripts.length === 0 ? (
                <Card className="p-6 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No transcripts found to process</p>
                    
                    {unprocessedOnly && (
                      <div className="mt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setUnprocessedOnly(false);
                            fetchUnprocessedTranscripts();
                          }}
                        >
                          Show All Transcripts
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Ready to Process</AlertTitle>
                  <AlertDescription>
                    {useDefaultSource && defaultSource ? (
                      <p>All transcripts will be tagged with source: <strong>{getSourceCategories().find(cat => cat.id === defaultSource)?.label}</strong></p>
                    ) : (
                      <p>Transcripts will be processed with auto-detected sources</p>
                    )}
                    
                    {applyAutoTags && <p>AI-based automatic tagging will be applied</p>}
                    {applyGlobalTags && globalTags.length > 0 && <p>{globalTags.length} global tag(s) will be applied</p>}
                    {overwriteExistingTags && <p>Existing tags will be overwritten</p>}
                  </AlertDescription>
                </Alert>
              )}
              
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
            
            <div className="flex justify-between pt-4">
              <DialogClose asChild>
                <Button variant="outline" onClick={onClose}>Cancel</Button>
              </DialogClose>
              
              <Button 
                onClick={processTranscripts}
                disabled={isProcessing || transcripts.length === 0}
                className="gap-2"
              >
                {isProcessing ? 'Processing...' : 'Process Transcripts'}
                {!isProcessing && <Sparkles className="h-4 w-4" />}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="unprocessed-only" 
                    checked={unprocessedOnly} 
                    onCheckedChange={(checked) => {
                      setUnprocessedOnly(checked === true);
                      if (checked !== unprocessedOnly) {
                        setTimeout(fetchUnprocessedTranscripts, 100);
                      }
                    }}
                  />
                  <Label htmlFor="unprocessed-only">Only show unprocessed transcripts</Label>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="use-default-source" 
                    checked={useDefaultSource} 
                    onCheckedChange={(checked) => setUseDefaultSource(checked === true)}
                  />
                  <Label htmlFor="use-default-source">Use default source for all transcripts</Label>
                </div>
                
                {useDefaultSource && (
                  <div className="ml-6 mt-2">
                    <Label htmlFor="default-source" className="mb-1 block">Source Category</Label>
                    <Select value={defaultSource} onValueChange={setDefaultSource}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a default source category" />
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
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="apply-auto-tags" 
                    checked={applyAutoTags} 
                    onCheckedChange={(checked) => setApplyAutoTags(checked === true)}
                  />
                  <Label htmlFor="apply-auto-tags">Apply AI-detected tags based on content</Label>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="overwrite-existing" 
                    checked={overwriteExistingTags} 
                    onCheckedChange={(checked) => setOverwriteExistingTags(checked === true)}
                  />
                  <Label htmlFor="overwrite-existing">Overwrite existing tags</Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  If unchecked, new tags will be added to existing ones
                </p>
              </div>
            </div>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Processing Information</AlertTitle>
              <AlertDescription>
                <p className="text-sm">
                  The bulk processor will update the metadata and tags for all selected transcripts. 
                  This process cannot be undone.
                </p>
              </AlertDescription>
            </Alert>
          </TabsContent>
          
          <TabsContent value="tags" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="apply-global-tags" 
                    checked={applyGlobalTags} 
                    onCheckedChange={(checked) => setApplyGlobalTags(checked === true)}
                  />
                  <Label htmlFor="apply-global-tags">Apply global tags to all transcripts</Label>
                </div>
                
                {applyGlobalTags && (
                  <div className="ml-6 mt-2">
                    <Label htmlFor="global-tags" className="mb-1 block">Global Tags</Label>
                    <TagsInput
                      value={globalTags}
                      onChange={setGlobalTags}
                      placeholder="Add global tags to apply to all transcripts..."
                    />
                  </div>
                )}
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Available Tag Options</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>Apply AI-detected tags based on transcript content</li>
                    <li>Apply custom global tags to all transcripts</li>
                    <li>Keep existing tags or overwrite them</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default BulkTagProcessor;
