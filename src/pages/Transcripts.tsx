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

      const publicURL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${data.Key}`;
      
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
        .select()

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
    
      
        
          Transcripts
        
        
          Manage and view your transcripts
        
      

      
        
          
            <Tabs defaultValue="manual" className="w-full">
              
                
                  Manual Input
                
                
                  File Upload
                
              
              
                
                  
                    
                      
                        <Label htmlFor="title">Title</Label>
                        <Input
                          type="text"
                          id="title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                        />
                      
                      
                        <Label htmlFor="content">Content</Label>
                        <Textarea
                          id="content"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                        />
                      
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
                    
                  
                
                
                  
                    
                      <Label htmlFor="file">Select File</Label>
                      <Input
                        type="file"
                        id="file"
                        onChange={handleFileSelect}
                        ref={fileInputRef}
                      />
                      {selectedFile && (
                        
                          Selected File: {selectedFile.name}
                        
                      )}
                    
                    <Button onClick={uploadFile} disabled={isUploading || !selectedFile}>
                      {isUploading ? (
                        
                          Uploading... {uploadProgress}%
                        
                      ) : (
                        'Upload File'
                      )}
                    </Button>
                    {uploadProgress !== null && (
                      
                        Upload Progress: {uploadProgress}%
                      
                    )}
                  
                
              
            </Tabs>
          

          
            
              
                
                  
                    <Tags className="w-4 h-4 mr-2" />
                    Filter by Tags
                  
                  
                    {tagFilters.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearAllTags}>
                        Clear All
                      </Button>
                    )}
                  
                
                <TagFilter onTagAdded={handleTagAdded} onTagRemoved={handleTagRemoved} />
              
            
          

          
            {filteredTranscripts.length === 0 ? (
              
                No transcripts found.
              
            ) : (
              
                {filteredTranscripts.map((transcript) => (
                  
                    
                      
                        
                          {transcript.title}
                        
                        
                          {transcript.created_at}
                        
                      
                      
                        
                          <Button variant="ghost" size="sm" onClick={() => handleOpenTranscriptEditor(transcript)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Tags
                          </Button>
                        
                      
                    
                  
                ))}
              
            )}
          
        

        
          
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full">
                <FileText className="w-4 h-4 mr-2" />
                Transcript Diagnostics
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-sm">
              
                
                  
                    Transcript Diagnostics
                  
                  
                    Troubleshoot and fix issues with transcript uploads
                  
                
                <TranscriptDiagnostics onComplete={handleDiagnosticsComplete} />
              
            </SheetContent>
          
        
      

      {selectedTranscript && (
        <TranscriptTagEditor
          open={isTranscriptEditorOpen}
          onClose={handleCloseTranscriptEditor}
          transcriptId={selectedTranscript.id}
          initialTags={selectedTranscript.tags || []}
          onTagsUpdated={handleTagsUpdated}
        />
      )}
    
  );
};

export default TranscriptsPage;
