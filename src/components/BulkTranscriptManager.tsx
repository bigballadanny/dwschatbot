import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Tag, 
  CheckSquare, 
  X, 
  Plus, 
  Settings, 
  FilterX, 
  Search, 
  RefreshCw, 
  Trash2, 
  Download,
  Upload,
  UploadCloud,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { formatTagForDisplay } from "@/utils/transcriptUtils";
import { Transcript } from "@/utils/transcriptUtils";
import TranscriptStatusIndicator from "./TranscriptStatusIndicator";
import TagFilter from "./TagFilter";
import { cn } from "@/lib/utils";

interface BulkTranscriptManagerProps {
  transcripts: Transcript[];
  onUpdate?: () => void;
  isAdmin?: boolean;
  userId: string;
}

type ActionType = 'tag' | 'retag' | 'delete' | 'reprocess' | 'summarize' | 'export';
type ActionProgress = {
  total: number;
  completed: number;
  failed: number;
  inProgress: boolean;
};

const BulkTranscriptManager: React.FC<BulkTranscriptManagerProps> = ({
  transcripts,
  onUpdate,
  isAdmin = false,
  userId
}) => {
  const [selectedTranscripts, setSelectedTranscripts] = useState<string[]>([]);
  const [selectedAction, setSelectedAction] = useState<ActionType>('tag');
  const [searchQuery, setSearchQuery] = useState('');
  const [sourcesToShow, setSourcestoShow] = useState<string[]>([]);
  const [tagsToAdd, setTagsToAdd] = useState<string[]>([]);
  const [showProcessed, setShowProcessed] = useState(true);
  const [showUnprocessed, setShowUnprocessed] = useState(true);
  const [showSummarized, setShowSummarized] = useState(true);
  const [newTag, setNewTag] = useState('');
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [isActionRunning, setIsActionRunning] = useState(false);
  const [progress, setProgress] = useState<ActionProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    inProgress: false
  });
  const [actionResult, setActionResult] = useState<{
    success?: string;
    error?: string;
  }>({});
  
  // Get all unique sources from transcripts
  const sources = Array.from(new Set(transcripts.map(t => t.source || 'unknown')));
  
  // Filter transcripts based on search, source, and processing status
  const filteredTranscripts = transcripts.filter(transcript => {
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = transcript.title.toLowerCase().includes(query);
      const matchesTags = transcript.tags && transcript.tags.some(tag => 
        tag.toLowerCase().includes(query) || formatTagForDisplay(tag).toLowerCase().includes(query)
      );
      
      if (!matchesTitle && !matchesTags) return false;
    }
    
    // Filter by source
    if (selectedSource && transcript.source !== selectedSource) {
      return false;
    }
    
    // Filter by processing status
    if (!showProcessed && transcript.is_processed) return false;
    if (!showUnprocessed && !transcript.is_processed) return false;
    if (!showSummarized && transcript.is_summarized) return false;
    
    return true;
  });

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedTranscripts(filteredTranscripts.map(t => t.id));
    } else {
      setSelectedTranscripts([]);
    }
  };

  const handleSelectTranscript = (id: string, selected: boolean) => {
    if (selected) {
      setSelectedTranscripts(prev => [...prev, id]);
    } else {
      setSelectedTranscripts(prev => prev.filter(tid => tid !== id));
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    
    const formattedTag = newTag.toLowerCase().replace(/\s+/g, '_');
    if (!tagsToAdd.includes(formattedTag)) {
      setTagsToAdd([...tagsToAdd, formattedTag]);
    }
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    setTagsToAdd(tagsToAdd.filter(t => t !== tag));
  };

  const applyTagsToTranscripts = async () => {
    if (!selectedTranscripts.length || !tagsToAdd.length) return;
    
    setIsActionRunning(true);
    setProgress({
      total: selectedTranscripts.length,
      completed: 0,
      failed: 0,
      inProgress: true
    });
    
    let successCount = 0;
    let failCount = 0;
    
    for (const transcriptId of selectedTranscripts) {
      try {
        const transcript = transcripts.find(t => t.id === transcriptId);
        if (!transcript) {
          failCount++;
          continue;
        }
        
        const currentTags = transcript.tags || [];
        const newTags = [...new Set([...currentTags, ...tagsToAdd])];
        
        const { error } = await supabase
          .from('transcripts')
          .update({ tags: newTags })
          .eq('id', transcriptId);
          
        if (error) throw error;
        
        successCount++;
        setProgress(prev => ({
          ...prev,
          completed: prev.completed + 1
        }));
      } catch (error) {
        console.error(`Error applying tags to transcript ${transcriptId}:`, error);
        failCount++;
        setProgress(prev => ({
          ...prev,
          failed: prev.failed + 1
        }));
      }
    }
    
    setIsActionRunning(false);
    setProgress(prev => ({
      ...prev,
      inProgress: false
    }));
    
    // Show result message
    if (successCount > 0) {
      setActionResult({
        success: `Applied tags to ${successCount} transcripts` + 
                (failCount > 0 ? ` (${failCount} failed)` : '')
      });
    } else {
      setActionResult({
        error: 'Failed to apply tags to transcripts'
      });
    }
    
    // Call onUpdate if provided
    if (onUpdate) {
      onUpdate();
    }
  };

  const reprocessTranscripts = async () => {
    if (!selectedTranscripts.length) return;
    
    setIsActionRunning(true);
    setProgress({
      total: selectedTranscripts.length,
      completed: 0,
      failed: 0,
      inProgress: true
    });
    
    let successCount = 0;
    let failCount = 0;
    
    // Import dynamically to reduce initial load time
    const { reprocessTranscript } = await import('@/utils/diagnostics/reprocessTranscripts');
    
    for (const transcriptId of selectedTranscripts) {
      try {
        const result = await reprocessTranscript(transcriptId);
        
        if (result) {
          successCount++;
        } else {
          failCount++;
        }
        
        setProgress(prev => ({
          ...prev,
          completed: result ? prev.completed + 1 : prev.completed,
          failed: !result ? prev.failed + 1 : prev.failed
        }));
      } catch (error) {
        console.error(`Error reprocessing transcript ${transcriptId}:`, error);
        failCount++;
        setProgress(prev => ({
          ...prev,
          failed: prev.failed + 1
        }));
      }
    }
    
    setIsActionRunning(false);
    setProgress(prev => ({
      ...prev,
      inProgress: false
    }));
    
    // Show result message
    if (successCount > 0) {
      setActionResult({
        success: `Started reprocessing ${successCount} transcripts` + 
                (failCount > 0 ? ` (${failCount} failed)` : '')
      });
    } else {
      setActionResult({
        error: 'Failed to reprocess transcripts'
      });
    }
    
    // Call onUpdate if provided
    if (onUpdate) {
      onUpdate();
    }
  };

  const runAction = async () => {
    // Clear previous results
    setActionResult({});
    
    switch (selectedAction) {
      case 'tag':
        await applyTagsToTranscripts();
        break;
      case 'reprocess':
        await reprocessTranscripts();
        break;
      // Implement other actions as needed
      default:
        setActionResult({
          error: 'This action is not yet implemented'
        });
    }
  };

  const getActionTitle = () => {
    switch (selectedAction) {
      case 'tag': return 'Add Tags';
      case 'retag': return 'Replace Tags';
      case 'delete': return 'Delete Transcripts';
      case 'reprocess': return 'Reprocess Transcripts';
      case 'summarize': return 'Generate Summaries';
      case 'export': return 'Export Transcripts';
      default: return 'Select Action';
    }
  };

  const getActionIcon = () => {
    switch (selectedAction) {
      case 'tag': return <Tag className="h-4 w-4" />;
      case 'retag': return <Tag className="h-4 w-4" />;
      case 'delete': return <Trash2 className="h-4 w-4" />;
      case 'reprocess': return <RefreshCw className="h-4 w-4" />;
      case 'summarize': return <Sparkles className="h-4 w-4" />;
      case 'export': return <Download className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getActionDescription = () => {
    switch (selectedAction) {
      case 'tag': return 'Add additional tags to selected transcripts';
      case 'retag': return 'Replace all existing tags with new ones';
      case 'delete': return 'Permanently delete selected transcripts';
      case 'reprocess': return 'Reprocess selected transcripts with hierarchical chunking';
      case 'summarize': return 'Generate or regenerate summaries for selected transcripts';
      case 'export': return 'Export transcripts to CSV or JSON';
      default: return 'Select an action to perform on selected transcripts';
    }
  };

  const getActionButton = () => {
    switch (selectedAction) {
      case 'tag': 
        return (
          <Button 
            onClick={runAction} 
            disabled={selectedTranscripts.length === 0 || tagsToAdd.length === 0 || isActionRunning}
            iconLeft={isActionRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
          >
            {isActionRunning ? 'Applying Tags...' : 'Apply Tags'}
          </Button>
        );
      case 'reprocess':
        return (
          <Button 
            onClick={runAction} 
            disabled={selectedTranscripts.length === 0 || isActionRunning}
            iconLeft={isActionRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          >
            {isActionRunning ? 'Reprocessing...' : 'Reprocess Selected'}
          </Button>
        );
      default:
        return (
          <Button 
            onClick={runAction} 
            disabled={selectedTranscripts.length === 0 || isActionRunning}
            iconLeft={getActionIcon()}
          >
            {`Run ${getActionTitle()}`}
          </Button>
        );
    }
  };

  const renderActionForm = () => {
    switch (selectedAction) {
      case 'tag':
        return (
          <div className="space-y-4">
            <div>
              <Label>Add tags to {selectedTranscripts.length} selected transcripts</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Input 
                  placeholder="Enter tag name..." 
                  value={newTag} 
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                />
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Tags to apply</Label>
              {tagsToAdd.length === 0 ? (
                <div className="text-sm text-muted-foreground mt-1">
                  No tags added yet
                </div>
              ) : (
                <div className="flex flex-wrap gap-1 mt-1">
                  {tagsToAdd.map(tag => (
                    <Badge key={tag} variant="tag" className="group">
                      {formatTagForDisplay(tag)}
                      <Button
                        variant="ghost"
                        size="iconXs"
                        className="ml-1 h-4 w-4 p-0 opacity-70 hover:opacity-100 hover:bg-background/50 rounded-full"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        <X className="h-2.5 w-2.5" />
                        <span className="sr-only">Remove {tag}</span>
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      
      case 'reprocess':
        return (
          <div className="space-y-4">
            <div>
              <Label>Reprocess {selectedTranscripts.length} selected transcripts</Label>
              <p className="text-sm text-muted-foreground mt-1">
                This will reprocess the selected transcripts with hierarchical chunking, improving search and summarization quality.
              </p>
            </div>
            <div className="p-3 bg-muted/30 rounded-md">
              <p className="text-sm font-medium">Notes:</p>
              <ul className="text-sm list-disc list-inside text-muted-foreground mt-1 space-y-1">
                <li>Reprocessing can take several minutes per transcript</li>
                <li>Existing summaries will not be affected</li>
                <li>This is recommended for transcripts with chunking issues</li>
              </ul>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="p-4 text-center text-muted-foreground">
            <Settings className="h-10 w-10 mx-auto opacity-50 mb-2" />
            <p>This action is not yet implemented</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Selection Panel */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Select Transcripts</CardTitle>
            <CardDescription>
              Select the transcripts you want to manage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search & filters */}
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search transcripts..." 
                  className="pl-8" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
              </div>
              <div className="flex gap-2">
                <Select value={selectedSource || ""} onValueChange={v => setSelectedSource(v || null)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All sources</SelectItem>
                    {sources.map(source => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSource(null);
                    setShowProcessed(true);
                    setShowUnprocessed(true);
                    setShowSummarized(true);
                  }}
                  title="Clear filters"
                >
                  <FilterX className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Processing status filters */}
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant={showProcessed ? "outline" : "secondary"} 
                className={cn(
                  "cursor-pointer",
                  showProcessed ? "bg-green-50 hover:bg-green-100 dark:bg-green-900/10 dark:hover:bg-green-900/20" : ""
                )}
                onClick={() => setShowProcessed(!showProcessed)}
              >
                <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                Processed
              </Badge>
              
              <Badge 
                variant={showUnprocessed ? "outline" : "secondary"} 
                className={cn(
                  "cursor-pointer",
                  showUnprocessed ? "bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/10 dark:hover:bg-amber-900/20" : ""
                )}
                onClick={() => setShowUnprocessed(!showUnprocessed)}
              >
                <Clock className="h-3 w-3 mr-1 text-amber-500" />
                Unprocessed
              </Badge>
              
              <Badge 
                variant={showSummarized ? "outline" : "secondary"} 
                className={cn(
                  "cursor-pointer",
                  showSummarized ? "bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/10 dark:hover:bg-blue-900/20" : ""
                )}
                onClick={() => setShowSummarized(!showSummarized)}
              >
                <Sparkles className="h-3 w-3 mr-1 text-blue-500" />
                Summarized
              </Badge>
            </div>
            
            {/* Transcript listing */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 p-2 border-b flex items-center">
                <div className="flex items-center">
                  <Checkbox 
                    id="select-all" 
                    checked={filteredTranscripts.length > 0 && selectedTranscripts.length === filteredTranscripts.length} 
                    onCheckedChange={handleSelectAll} 
                  />
                  <Label htmlFor="select-all" className="ml-2">
                    Select all ({filteredTranscripts.length})
                  </Label>
                </div>
                
                <div className="ml-auto text-sm text-muted-foreground">
                  {selectedTranscripts.length} selected
                </div>
              </div>
              
              <ScrollArea className="h-[300px]">
                {filteredTranscripts.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No transcripts match your search criteria</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredTranscripts.map(transcript => (
                      <div 
                        key={transcript.id} 
                        className={cn(
                          "flex items-center p-2 hover:bg-muted/40",
                          selectedTranscripts.includes(transcript.id) ? "bg-primary-foreground/10" : ""
                        )}
                      >
                        <Checkbox 
                          id={`transcript-${transcript.id}`} 
                          checked={selectedTranscripts.includes(transcript.id)} 
                          onCheckedChange={(checked) => handleSelectTranscript(transcript.id, !!checked)} 
                        />
                        <div className="ml-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{transcript.title}</p>
                            <TranscriptStatusIndicator 
                              status={transcript.is_processed 
                                ? transcript.is_summarized 
                                  ? 'summarized' 
                                  : 'processed'
                                : 'unprocessed'
                              }
                              size="sm"
                              showText={false}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground flex gap-3">
                            <span>{transcript.source || 'Unknown source'}</span>
                            <span>•</span>
                            <span>{new Date(transcript.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 max-w-[150px] justify-end">
                          {(transcript.tags || []).slice(0, 2).map(tag => (
                            <Badge key={tag} variant="outline" size="sm" className="truncate max-w-[70px]">
                              {formatTagForDisplay(tag)}
                            </Badge>
                          ))}
                          {(transcript.tags?.length || 0) > 2 && (
                            <Badge variant="outline" size="sm">
                              +{(transcript.tags?.length || 0) - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
        
        {/* Action Panel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Bulk Actions</CardTitle>
            <CardDescription>
              Perform actions on {selectedTranscripts.length} selected transcript{selectedTranscripts.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Select Action</Label>
              <Select value={selectedAction} onValueChange={(v) => setSelectedAction(v as ActionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tag">
                    <div className="flex items-center">
                      <Tag className="h-4 w-4 mr-2" />
                      <span>Add Tags</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="reprocess">
                    <div className="flex items-center">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      <span>Reprocess Transcripts</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="summarize">
                    <div className="flex items-center">
                      <Sparkles className="h-4 w-4 mr-2" />
                      <span>Generate Summaries</span>
                    </div>
                  </SelectItem>
                  {isAdmin && (
                    <SelectItem value="delete">
                      <div className="flex items-center">
                        <Trash2 className="h-4 w-4 mr-2" />
                        <span>Delete Transcripts</span>
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                {getActionIcon()}
                {getActionTitle()}
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                {getActionDescription()}
              </p>
              
              {renderActionForm()}
              
              {/* Progress display */}
              {progress.inProgress && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing {progress.completed + progress.failed} of {progress.total}</span>
                    <span>
                      {progress.completed} completed
                      {progress.failed > 0 ? `, ${progress.failed} failed` : ''}
                    </span>
                  </div>
                  <Progress value={(progress.completed + progress.failed) / progress.total * 100} />
                </div>
              )}
              
              {/* Result messages */}
              {actionResult.success && (
                <Alert className="mt-4 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800/30">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    {actionResult.success}
                  </AlertDescription>
                </Alert>
              )}
              
              {actionResult.error && (
                <Alert className="mt-4 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/30">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <AlertDescription className="text-red-700 dark:text-red-300">
                    {actionResult.error}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSelectedTranscripts([])}
              disabled={selectedTranscripts.length === 0 || isActionRunning}
            >
              Clear selection
            </Button>
            {getActionButton()}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default BulkTranscriptManager;