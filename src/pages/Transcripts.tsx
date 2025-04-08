
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { FileText, Upload, Tag as TagIcon, Loader2, X, Info, AlertTriangle, Edit, Tags, Plus, Sparkles, Settings, Filter } from 'lucide-react';
import { detectSourceCategory, formatTagForDisplay, suggestTagsFromContent } from '@/utils/transcriptUtils';
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import TranscriptDiagnostics from "@/components/TranscriptDiagnostics";
import { TagsInput } from "@/components/TagsInput";
import TranscriptTagEditor from "@/components/TranscriptTagEditor";
import TagFilter from "@/components/TagFilter";
import { showSuccess, showError, showWarning } from "@/utils/toastUtils";
import BulkTagProcessor from "@/components/BulkTagProcessor";

interface Transcript {
  id: string;
  title: string;
  content: string;
  created_at: string;
  file_path?: string;
  source?: string;
  tags?: string[];
  is_processed?: boolean;
  updated_at?: string;
  user_id?: string;
}

const TranscriptsPage: React.FC = () => {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [source, setSource] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [isTranscriptEditorOpen, setIsTranscriptEditorOpen] = useState(false);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [filteredTranscripts, setFilteredTranscripts] = useState<Transcript[]>([]);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isBulkProcessorOpen, setIsBulkProcessorOpen] = useState(false);
  const [isBatchTaggingMode, setIsBatchTaggingMode] = useState(false);
  const [selectedTranscriptIds, setSelectedTranscriptIds] = useState<string[]>([]);
  const [isBatchTagEditorOpen, setIsBatchTagEditorOpen] = useState(false);
  const [autoDetectTags, setAutoDetectTags] = useState(false);
  const [showAddTranscript, setShowAddTranscript] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchTranscripts();
  }, [user]);

  useEffect(() => {
    applyTagFilters();
  }, [transcripts, tagFilters]);

  useEffect(() => {
    if (content && autoDetectTags) {
      const tags = suggestTagsFromContent(content);
      setSuggestedTags(tags);
    } else {
      setSuggestedTags([]);
    }
  }, [content, autoDetectTags]);

  const fetchTranscripts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transcripts:', error);
        showError("Failed to load transcripts", "There was an error fetching the transcripts. Please try again.");
      }

      if (data) {
        setTranscripts(data);
      }
    } catch (error: any) {
      console.error('Error fetching transcripts:', error.message);
      showError("Failed to load transcripts", "There was an error fetching the transcripts. Please try again.");
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    setSelectedFile(file || null);
  };

  const handleTagAdded = (tag: string) => {
    setTagFilters(prevFilters => [...prevFilters, tag]);
  };

  const handleTagRemoved = (tag: string) => {
    setTagFilters(prevFilters => prevFilters.filter(filter => filter !== tag));
  };

  const clearAllTags = () => {
    setTagFilters([]);
  };

  const applyTagFilters = () => {
    if (tagFilters.length === 0) {
      setFilteredTranscripts(transcripts);
      return;
    }

    const filtered = transcripts.filter(transcript => {
      if (!transcript.tags) return false;
      return tagFilters.every(tag => transcript.tags?.includes(tag));
    });

    setFilteredTranscripts(filtered);
  };

  const uploadFile = async () => {
    if (!user) {
      showWarning("Not authenticated", "You must be logged in to upload files.");
      return;
    }

    if (!selectedFile) {
      showWarning("No file selected", "Please select a file to upload.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const filePath = `transcripts/${user.id}/${Date.now()}_${selectedFile.name}`;
      const { data, error } = await supabase.storage
        .from('transcripts')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading file:', error);
        showError("File upload failed", "There was an error uploading the file. Please try again.");
        setIsUploading(false);
        setUploadProgress(null);
        return;
      }

      const publicURL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/transcripts/${filePath}`;
      
      createTranscript(selectedFile.name, '', filePath, publicURL);
    } catch (error: any) {
      console.error('Error during upload:', error);
      showError("File upload failed", "There was an error uploading the file. Please try again.");
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const createTranscript = async (title: string, content: string, filePath: string | null = null, fileURL: string | null = null) => {
    if (!user) {
      showWarning("Not authenticated", "You must be logged in to create transcripts.");
      return;
    }

    setIsProcessing(true);
    try {
      const autoTags = (content && autoDetectTags) ? suggestTagsFromContent(content) : [];
      const finalTags = [...new Set([...selectedTags, ...autoTags])];
      
      const { data, error } = await supabase
        .from('transcripts')
        .insert([
          {
            title: title,
            content: content,
            file_path: filePath,
            user_id: user.id,
            source: detectSourceCategory(title),
            tags: finalTags.length > 0 ? finalTags : null
          },
        ])
        .select();

      if (error) {
        console.error('Error creating transcript:', error);
        showError("Failed to create transcript", "There was an error creating the transcript. Please try again.");
        setIsProcessing(false);
        return;
      }

      if (data && data.length > 0) {
        const newTranscript = data[0];
        setTranscripts(prevTranscripts => [newTranscript, ...prevTranscripts]);
        setTitle('');
        setContent('');
        setSelectedFile(null);
        setUploadProgress(null);
        setSource('');
        setSelectedTags([]);
        setSuggestedTags([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Reset the file input
        }
        showSuccess("Transcript created", `Successfully created the transcript${autoTags.length > 0 ? ` with ${autoTags.length} auto-detected tags` : ''}.`);
        setShowAddTranscript(false);
      } else {
        showWarning("No transcript created", "No transcript was created.");
      }
    } catch (error: any) {
      console.error('Error creating transcript:', error.message);
      showError("Failed to create transcript", "There was an error creating the transcript. Please try again.");
    } finally {
      setIsProcessing(false);
      setIsUploading(false);
    }
  };

  const handleAddTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag]);
    }
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    createTranscript(title, content);
  };

  const handleTagsUpdated = (transcriptId: string | string[], updatedTags: string[]) => {
    if (Array.isArray(transcriptId)) {
      // Batch update
      setTranscripts(prevTranscripts =>
        prevTranscripts.map(transcript =>
          transcriptId.includes(transcript.id) ? { ...transcript, tags: updatedTags } : transcript
        )
      );
    } else {
      // Single transcript update
      setTranscripts(prevTranscripts =>
        prevTranscripts.map(transcript =>
          transcript.id === transcriptId ? { ...transcript, tags: updatedTags } : transcript
        )
      );
    }
  };

  const handleOpenTranscriptEditor = (transcript: Transcript) => {
    setSelectedTranscript(transcript);
    setIsBatchTaggingMode(false);
    setIsTranscriptEditorOpen(true);
  };

  const handleCloseTranscriptEditor = () => {
    setIsTranscriptEditorOpen(false);
    setSelectedTranscript(null);
  };

  const handleOpenBulkProcessor = () => {
    setIsBulkProcessorOpen(true);
  };

  const handleCloseBulkProcessor = () => {
    setIsBulkProcessorOpen(false);
  };

  const handleBulkProcessingComplete = () => {
    fetchTranscripts();
    setIsBulkProcessorOpen(false);
  };
  
  const toggleTranscriptSelection = (transcriptId: string) => {
    setSelectedTranscriptIds(prev => {
      if (prev.includes(transcriptId)) {
        return prev.filter(id => id !== transcriptId);
      } else {
        return [...prev, transcriptId];
      }
    });
  };
  
  const toggleSelectAll = () => {
    if (selectedTranscriptIds.length === filteredTranscripts.length) {
      setSelectedTranscriptIds([]);
    } else {
      setSelectedTranscriptIds(filteredTranscripts.map(t => t.id));
    }
  };
  
  const handleOpenBatchTagEditor = () => {
    if (selectedTranscriptIds.length === 0) {
      showWarning("No transcripts selected", "Please select at least one transcript to batch edit tags.");
      return;
    }
    
    setIsBatchTagEditorOpen(true);
  };
  
  const handleCloseBatchTagEditor = () => {
    setIsBatchTagEditorOpen(false);
  };

  return (
    <div className="container mx-auto py-6">
      <Header>
        <div className="flex justify-between items-center w-full">
          <h2 className="text-3xl font-bold tracking-tight">Transcripts</h2>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1"
            >
              <Filter className="w-4 h-4" />
              {tagFilters.length > 0 && (
                <Badge variant="secondary" className="ml-1">{tagFilters.length}</Badge>
              )}
            </Button>
            
            <Button
              size="sm"
              onClick={() => setShowAddTranscript(!showAddTranscript)}
              className="flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Transcript
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleOpenBulkProcessor}
              className="flex items-center gap-1"
            >
              <Sparkles className="w-4 h-4" />
              Bulk Process
            </Button>
          </div>
        </div>
      </Header>
      
      <div className="grid gap-6 mt-6">
        {/* Filter section - only shown when filters are enabled */}
        {showFilters && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Tags className="w-4 h-4 mr-2" />
                  <CardTitle className="text-lg">Filter by Tags</CardTitle>
                </div>
                {tagFilters.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllTags}>
                    Clear All
                  </Button>
                )}
              </div>
              <TagFilter onTagAdded={handleTagAdded} onTagRemoved={handleTagRemoved} />
            </CardHeader>
          </Card>
        )}

        {/* Add Transcript section - only shown when add is clicked */}
        {showAddTranscript && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Add New Transcript</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAddTranscript(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="manual" className="w-full">
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="manual">Manual Input</TabsTrigger>
                  <TabsTrigger value="upload">File Upload</TabsTrigger>
                </TabsList>
                
                <TabsContent value="manual">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter transcript title"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        value={content}
                        onChange={handleContentChange}
                        className="min-h-[200px]"
                        placeholder="Enter transcript content"
                      />
                    </div>

                    <div className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        id="auto-detect-tags" 
                        checked={autoDetectTags}
                        onCheckedChange={(checked) => setAutoDetectTags(checked === true)}
                      />
                      <label
                        htmlFor="auto-detect-tags"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Auto-detect tags (uses AI resources)
                      </label>
                    </div>

                    {suggestedTags.length > 0 && (
                      <div className="grid gap-2">
                        <Label>Suggested Tags</Label>
                        <div className="flex flex-wrap gap-2">
                          {suggestedTags.map((tag) => (
                            <Badge 
                              key={tag} 
                              className={`cursor-pointer ${selectedTags.includes(tag) ? 'bg-primary' : 'bg-secondary'}`}
                              onClick={() => selectedTags.includes(tag) ? handleRemoveTag(tag) : handleAddTag(tag)}
                            >
                              {formatTagForDisplay(tag)}
                              {selectedTags.includes(tag) ? (
                                <X className="ml-1 h-3 w-3" />
                              ) : (
                                <Plus className="ml-1 h-3 w-3" />
                              )}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid gap-2">
                      <Label htmlFor="manual-tags">Custom Tags</Label>
                      <TagsInput
                        value={selectedTags}
                        onChange={setSelectedTags}
                        placeholder="Add custom tags..."
                      />
                    </div>

                    <Button onClick={handleSubmit} disabled={isProcessing}>
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Create Transcript'
                      )}
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="upload">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="file">Select File</Label>
                      <Input
                        type="file"
                        id="file"
                        onChange={handleFileSelect}
                        ref={fileInputRef}
                      />
                      {selectedFile && (
                        <p className="text-sm text-muted-foreground">
                          Selected File: {selectedFile.name}
                        </p>
                      )}
                    </div>
                    <Button onClick={uploadFile} disabled={isUploading || !selectedFile}>
                      {isUploading ? (
                        <span className="flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading... {uploadProgress}%
                        </span>
                      ) : (
                        'Upload File'
                      )}
                    </Button>
                    {uploadProgress !== null && (
                      <Progress value={uploadProgress} className="w-full" />
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Transcripts List */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center">
              <FileText className="w-5 h-5 mr-2 text-muted-foreground" />
              <div>
                <CardTitle>My Transcripts</CardTitle>
                <CardDescription className="mt-1">
                  {filteredTranscripts.length} transcript{filteredTranscripts.length !== 1 ? 's' : ''}
                  {tagFilters.length > 0 ? ' (filtered)' : ''}
                </CardDescription>
              </div>
            </div>
            
            <div className="flex gap-2">
              {filteredTranscripts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1"
                >
                  {selectedTranscriptIds.length === filteredTranscripts.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
              
              <Button
                variant={selectedTranscriptIds.length > 0 ? "default" : "outline"}
                size="sm"
                onClick={handleOpenBatchTagEditor}
                disabled={selectedTranscriptIds.length === 0}
                className="flex items-center gap-1"
              >
                <TagIcon className="w-3 h-3 mr-1" />
                Edit Tags ({selectedTranscriptIds.length})
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            {filteredTranscripts.length === 0 ? (
              <div className="text-center p-6 space-y-4">
                <div className="text-muted-foreground">No transcripts found</div>
                {tagFilters.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearAllTags}>
                    Clear Filters
                  </Button>
                )}
                {tagFilters.length === 0 && (
                  <Button onClick={() => setShowAddTranscript(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Transcript
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTranscripts.map((transcript) => (
                  <div 
                    key={transcript.id} 
                    className={`p-4 border rounded-lg ${selectedTranscriptIds.includes(transcript.id) ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedTranscriptIds.includes(transcript.id)}
                          onCheckedChange={() => toggleTranscriptSelection(transcript.id)}
                        />
                        <div>
                          <h3 className="font-medium">{transcript.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transcript.created_at).toLocaleDateString()} · 
                            {transcript.source ? ` ${transcript.source.replace(/_/g, ' ')}` : ' No source'}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0" 
                        onClick={() => handleOpenTranscriptEditor(transcript)}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                    </div>
                    
                    {transcript.tags && transcript.tags.length > 0 && (
                      <div className="mt-2 ml-9">
                        <div className="flex flex-wrap gap-1">
                          {transcript.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {formatTagForDisplay(tag)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between pt-2 border-t">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsDiagnosticsOpen(true)} 
              className="text-xs flex items-center"
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              Run Diagnostics
            </Button>
            
            {filteredTranscripts.length >= 5 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenBulkProcessor}
                className="text-xs flex items-center"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Bulk Process All
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {selectedTranscript && (
        <TranscriptTagEditor
          open={isTranscriptEditorOpen}
          onClose={handleCloseTranscriptEditor}
          transcriptId={selectedTranscript.id}
          initialTags={selectedTranscript.tags || []}
          onTagsUpdated={handleTagsUpdated}
        />
      )}
      
      {/* Batch Tag Editor */}
      <TranscriptTagEditor
        open={isBatchTagEditorOpen}
        onClose={handleCloseBatchTagEditor}
        transcriptId={selectedTranscriptIds}
        initialTags={[]}
        onTagsUpdated={handleTagsUpdated}
        isBatchMode={true}
      />
      
      {/* Bulk Tag Processor */}
      <BulkTagProcessor
        open={isBulkProcessorOpen}
        onClose={handleCloseBulkProcessor}
        onComplete={handleBulkProcessingComplete}
      />
      
      {/* Transcript Diagnostics in Dialog */}
      <Dialog open={isDiagnosticsOpen} onOpenChange={setIsDiagnosticsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transcript Diagnostics</DialogTitle>
            <DialogDescription>
              Troubleshoot and fix issues with transcript uploads
            </DialogDescription>
          </DialogHeader>
          <TranscriptDiagnostics onComplete={() => {
            setIsDiagnosticsOpen(false);
            fetchTranscripts();
          }} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TranscriptsPage;
