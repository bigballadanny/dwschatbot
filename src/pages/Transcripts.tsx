import React, { useState, useEffect, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { FileText, Upload, Tag as TagIcon, Loader2, X, Info, AlertTriangle, Edit, Tags } from 'lucide-react';
import { detectSourceCategory, formatTagForDisplay } from '@/utils/transcriptUtils';
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import TranscriptDiagnostics from "@/components/TranscriptDiagnostics";
import { TagsInput } from "@/components/TagsInput";
import TranscriptTagEditor from "@/components/TranscriptTagEditor";
import TagFilter from "@/components/TagFilter";
import { showSuccess, showError, showWarning } from "@/utils/toastUtils";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchTranscripts();
  }, [user]);

  useEffect(() => {
    applyTagFilters();
  }, [transcripts, tagFilters]);

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
      const { data, error } = await supabase
        .from('transcripts')
        .insert([
          {
            title: title,
            content: content,
            file_path: filePath,
            user_id: user.id,
            source: detectSourceCategory(title),
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
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Reset the file input
        }
        showSuccess("Transcript created", "Successfully created the transcript.");
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    createTranscript(title, content);
  };

  const handleTagsUpdated = (transcriptId: string, updatedTags: string[]) => {
    setTranscripts(prevTranscripts =>
      prevTranscripts.map(transcript =>
        transcript.id === transcriptId ? { ...transcript, tags: updatedTags } : transcript
      )
    );
  };

  const handleOpenTranscriptEditor = (transcript: Transcript) => {
    setSelectedTranscript(transcript);
    setIsTranscriptEditorOpen(true);
  };

  const handleCloseTranscriptEditor = () => {
    setIsTranscriptEditorOpen(false);
    setSelectedTranscript(null);
  };

  const handleOpenDiagnostics = () => {
    setIsDiagnosticsOpen(true);
  };

  const handleCloseDiagnostics = () => {
    setIsDiagnosticsOpen(false);
  };

  const handleDiagnosticsComplete = () => {
    setIsDiagnosticsOpen(false);
    fetchTranscripts();
  };

  return (
    <div className="container mx-auto py-6">
      <Header 
        title="Transcripts" 
        description="Manage and view your transcripts" 
      />

      <div className="grid gap-6 mt-6">
        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="mb-4">
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
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
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

        <div className="grid gap-4">
          {filteredTranscripts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">No transcripts found.</CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredTranscripts.map((transcript) => (
                <Card key={transcript.id}>
                  <CardHeader className="pb-3">
                    <CardTitle>{transcript.title}</CardTitle>
                    <CardDescription>{transcript.created_at}</CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenTranscriptEditor(transcript)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Tags
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <FileText className="w-4 h-4 mr-2" />
              Transcript Diagnostics
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-sm">
            <SheetHeader>
              <SheetTitle>Transcript Diagnostics</SheetTitle>
              <SheetDescription>
                Troubleshoot and fix issues with transcript uploads
              </SheetDescription>
            </SheetHeader>
            <TranscriptDiagnostics onComplete={handleDiagnosticsComplete} />
          </SheetContent>
        </Sheet>
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
    </div>
  );
};

export default TranscriptsPage;
