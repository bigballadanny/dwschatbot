
import React, { useState, useEffect, useRef } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { FileText, Upload, Tag, Loader2, X, Info } from 'lucide-react';
import { detectSourceCategory } from '@/utils/transcriptUtils';
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Transcript {
  id: string;
  title: string;
  content: string;
  created_at: string;
  file_path?: string;
  source?: string;
}

const TranscriptsPage: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [source, setSource] = useState('protege_call');
  const [uploading, setUploading] = useState(false);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filterSource, setFilterSource] = useState<string>('all');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingFiles, setProcessingFiles] = useState(false);
  const [uploadResults, setUploadResults] = useState<{success: number, failed: number}>({success: 0, failed: 0});
  const [failedFiles, setFailedFiles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('general');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const summitFileInputRef = useRef<HTMLInputElement>(null);
  const summitMultiFileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [summitTitle, setSummitTitle] = useState('');
  const [summitContent, setSummitContent] = useState('');
  const [summitSelectedFile, setSummitSelectedFile] = useState<File | null>(null);
  const [summitSelectedFiles, setSummitSelectedFiles] = useState<File[]>([]);
  const [summitUploading, setSummitUploading] = useState(false);
  const [summitUploadProgress, setSummitUploadProgress] = useState(0);
  const [summitProcessingFiles, setSummitProcessingFiles] = useState(false);
  const [summitUploadResults, setSummitUploadResults] = useState<{success: number, failed: number}>({success: 0, failed: 0});
  const [summitFailedFiles, setSummitFailedFiles] = useState<string[]>([]);

  useEffect(() => {
    const fetchTranscripts = async () => {
      try {
        const { data, error } = await supabase
          .from('transcripts')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setTranscripts(data || []);
      } catch (error: any) {
        console.error('Error fetching transcripts:', error);
        toast({
          title: 'Error fetching transcripts',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchTranscripts();
  }, [toast]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (!file.type.includes('text/plain')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select a TXT file',
          variant: 'destructive',
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      setSelectedFile(file);
      
      try {
        const text = await file.text();
        setContent(text);
        
        const fileName = file.name.replace(/\.txt$/, '');
        setTitle(fileName);
        
        const lowercaseFileName = fileName.toLowerCase();
        if (lowercaseFileName.includes('protege')) {
          setSource('protege_call');
        } else if (lowercaseFileName.includes('foundation')) {
          setSource('foundations_call');
        }
        
        toast({
          title: 'Text file loaded',
          description: `File "${fileName}" successfully loaded`,
        });
      } catch (error) {
        console.error('Error reading text file:', error);
        toast({
          title: 'Error reading file',
          description: 'Could not read the file contents',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSummitFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (!file.type.includes('text/plain')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select a TXT file',
          variant: 'destructive',
        });
        if (summitFileInputRef.current) {
          summitFileInputRef.current.value = '';
        }
        return;
      }
      
      setSummitSelectedFile(file);
      
      try {
        const text = await file.text();
        setSummitContent(text);
        
        const fileName = file.name.replace(/\.txt$/, '');
        setSummitTitle(fileName);
        
        toast({
          title: 'Text file loaded',
          description: `File "${fileName}" successfully loaded`,
        });
      } catch (error) {
        console.error('Error reading text file:', error);
        toast({
          title: 'Error reading file',
          description: 'Could not read the file contents',
          variant: 'destructive',
        });
      }
    }
  };

  const handleMultipleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files).filter(file => file.type.includes('text/plain'));
    
    if (fileArray.length === 0) {
      toast({
        title: 'Invalid file type',
        description: 'Please select TXT files only',
        variant: 'destructive',
      });
      if (multiFileInputRef.current) {
        multiFileInputRef.current.value = '';
      }
      return;
    }
    
    if (fileArray.length < files.length) {
      toast({
        title: 'Some files skipped',
        description: `${files.length - fileArray.length} non-TXT files were skipped`,
      });
    }
    
    setSelectedFiles(fileArray);
    
    toast({
      title: 'Files selected',
      description: `${fileArray.length} files ready for upload`,
    });
  };

  const handleSummitMultipleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files).filter(file => file.type.includes('text/plain'));
    
    if (fileArray.length === 0) {
      toast({
        title: 'Invalid file type',
        description: 'Please select TXT files only',
        variant: 'destructive',
      });
      if (summitMultiFileInputRef.current) {
        summitMultiFileInputRef.current.value = '';
      }
      return;
    }
    
    if (fileArray.length < files.length) {
      toast({
        title: 'Some files skipped',
        description: `${files.length - fileArray.length} non-TXT files were skipped`,
      });
    }
    
    setSummitSelectedFiles(fileArray);
    
    toast({
      title: 'Files selected',
      description: `${fileArray.length} files ready for upload`,
    });
  };

  const uploadFile = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('transcripts')
        .upload(filePath, file);
        
      if (uploadError) {
        throw uploadError;
      }
      
      return filePath;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please provide a title for the transcript',
        variant: 'destructive',
      });
      return;
    }
    
    if (!content.trim() && !selectedFile) {
      toast({
        title: 'Missing information',
        description: 'Please provide either content or upload a file',
        variant: 'destructive',
      });
      return;
    }
    
    setUploading(true);
    
    try {
      let filePath = null;
      let finalContent = content;
      
      if (selectedFile) {
        filePath = await uploadFile(selectedFile);
        finalContent = content;
      }
      
      const { data, error } = await supabase
        .from('transcripts')
        .insert([
          { 
            title, 
            content: finalContent,
            file_path: filePath,
            source: source,
            user_id: user?.id 
          }
        ])
        .select();
        
      if (error) throw error;
      
      setTitle('');
      setContent('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      if (data) {
        setTranscripts([data[0], ...transcripts]);
      }
      
      toast({
        title: 'Transcript saved',
        description: `Your transcript has been successfully saved.`,
      });
    } catch (error: any) {
      console.error('Error saving transcript:', error);
      toast({
        title: 'Error saving transcript',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSummitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!summitTitle.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please provide a title for the transcript',
        variant: 'destructive',
      });
      return;
    }
    
    if (!summitContent.trim() && !summitSelectedFile) {
      toast({
        title: 'Missing information',
        description: 'Please provide either content or upload a file',
        variant: 'destructive',
      });
      return;
    }
    
    setSummitUploading(true);
    
    try {
      let filePath = null;
      let finalContent = summitContent;
      
      if (summitSelectedFile) {
        filePath = await uploadFile(summitSelectedFile);
        finalContent = summitContent;
      }
      
      const { data, error } = await supabase
        .from('transcripts')
        .insert([
          { 
            title: summitTitle, 
            content: finalContent,
            file_path: filePath,
            source: 'business_acquisitions_summit',
            user_id: user?.id 
          }
        ])
        .select();
        
      if (error) throw error;
      
      setSummitTitle('');
      setSummitContent('');
      setSummitSelectedFile(null);
      if (summitFileInputRef.current) {
        summitFileInputRef.current.value = '';
      }
      
      if (data) {
        setTranscripts([data[0], ...transcripts]);
      }
      
      toast({
        title: 'Summit transcript saved',
        description: `Your Business Acquisitions Summit transcript has been successfully saved.`,
      });
    } catch (error: any) {
      console.error('Error saving summit transcript:', error);
      toast({
        title: 'Error saving transcript',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSummitUploading(false);
    }
  };

  const handleBatchUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select files to upload',
        variant: 'destructive',
      });
      return;
    }
    
    setProcessingFiles(true);
    setUploadProgress(0);
    setUploadResults({success: 0, failed: 0});
    setFailedFiles([]);
    
    const totalFiles = selectedFiles.length;
    let successCount = 0;
    let failedCount = 0;
    const failedFilesList: string[] = [];
    
    for (let i = 0; i < totalFiles; i++) {
      const file = selectedFiles[i];
      setUploadProgress(Math.floor((i / totalFiles) * 100));
      
      try {
        const text = await file.text();
        const title = file.name.replace(/\.txt$/, '');
        
        const lowercaseFileName = title.toLowerCase();
        let fileSource = 'protege_call';
        
        if (lowercaseFileName.includes('protege')) {
          fileSource = 'protege_call';
        } else if (lowercaseFileName.includes('foundation')) {
          fileSource = 'foundations_call';
        }
        
        const filePath = await uploadFile(file);
        
        const { error } = await supabase
          .from('transcripts')
          .insert([{
            title,
            content: text,
            file_path: filePath,
            source: fileSource,
            user_id: user?.id
          }]);
          
        if (error) {
          console.error(`Error inserting transcript for file ${file.name}:`, error);
          throw error;
        }
        
        successCount++;
      } catch (error: any) {
        console.error(`Error processing file ${file.name}:`, error);
        failedCount++;
        failedFilesList.push(`${file.name} - ${error.message || 'Unknown error'}`);
      }
    }
    
    setUploadProgress(100);
    setUploadResults({success: successCount, failed: failedCount});
    setFailedFiles(failedFilesList);
    
    try {
      const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setTranscripts(data || []);
    } catch (error: any) {
      console.error('Error fetching updated transcripts:', error);
    }
    
    if (multiFileInputRef.current) {
      multiFileInputRef.current.value = '';
    }
    setSelectedFiles([]);
    
    toast({
      title: 'Batch upload completed',
      description: `Successfully uploaded ${successCount} out of ${totalFiles} files`,
    });
    
    setProcessingFiles(false);
  };

  const handleSummitBatchUpload = async () => {
    if (summitSelectedFiles.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select files to upload',
        variant: 'destructive',
      });
      return;
    }
    
    setSummitProcessingFiles(true);
    setSummitUploadProgress(0);
    setSummitUploadResults({success: 0, failed: 0});
    setSummitFailedFiles([]);
    
    const totalFiles = summitSelectedFiles.length;
    let successCount = 0;
    let failedCount = 0;
    const failedFilesList: string[] = [];
    
    for (let i = 0; i < totalFiles; i++) {
      const file = summitSelectedFiles[i];
      setSummitUploadProgress(Math.floor((i / totalFiles) * 100));
      
      try {
        const text = await file.text();
        const title = file.name.replace(/\.txt$/, '');
        const filePath = await uploadFile(file);
        
        const { error } = await supabase
          .from('transcripts')
          .insert([{
            title,
            content: text,
            file_path: filePath,
            source: 'business_acquisitions_summit',
            user_id: user?.id
          }]);
          
        if (error) {
          console.error(`Error inserting summit transcript for file ${file.name}:`, error);
          throw error;
        }
        
        successCount++;
      } catch (error: any) {
        console.error(`Error processing summit file ${file.name}:`, error);
        failedCount++;
        failedFilesList.push(`${file.name} - ${error.message || 'Unknown error'}`);
      }
    }
    
    setSummitUploadProgress(100);
    setSummitUploadResults({success: successCount, failed: failedCount});
    setSummitFailedFiles(failedFilesList);
    
    try {
      const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setTranscripts(data || []);
    } catch (error: any) {
      console.error('Error fetching updated transcripts:', error);
    }
    
    if (summitMultiFileInputRef.current) {
      summitMultiFileInputRef.current.value = '';
    }
    setSummitSelectedFiles([]);
    
    toast({
      title: 'Summit batch upload completed',
      description: `Successfully uploaded ${successCount} out of ${totalFiles} Business Acquisitions Summit files`,
    });
    
    setSummitProcessingFiles(false);
  };

  const getFileUrl = (filePath: string) => {
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/transcripts/${filePath}`;
  };

  const viewTranscript = async (transcript: Transcript) => {
    setSelectedTranscript(transcript);
    
    if (transcript.content && transcript.content !== 'PDF file uploaded') {
      setShowTranscriptDialog(true);
      return;
    }
    
    if (transcript.file_path) {
      setIsLoadingTranscript(true);
      try {
        const response = await fetch(getFileUrl(transcript.file_path));
        if (!response.ok) {
          throw new Error(`Failed to fetch transcript: ${response.statusText}`);
        }
        
        const textContent = await response.text();
        
        const updatedTranscript = { ...transcript, content: textContent };
        setSelectedTranscript(updatedTranscript);
        
        if (!transcript.content || transcript.content === 'PDF file uploaded') {
          const { error } = await supabase
            .from('transcripts')
            .update({ content: textContent })
            .eq('id', transcript.id);
            
          if (error) {
            console.error('Error updating transcript content:', error);
          } else {
            setTranscripts(prev => 
              prev.map(t => t.id === transcript.id ? { ...t, content: textContent } : t)
            );
          }
        }
        
        setShowTranscriptDialog(true);
      } catch (error: any) {
        console.error('Error fetching transcript file:', error);
        toast({
          title: 'Error loading transcript',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setIsLoadingTranscript(false);
      }
    }
  };

  const activeFilterSource = filterSource === 'all' 
    ? 'all' 
    : filterSource;
    
  const filteredTranscripts = activeFilterSource === 'all' 
    ? transcripts 
    : transcripts.filter(t => t.source === activeFilterSource);

  const getSourceColor = (source: string | undefined): string => {
    switch(source) {
      case 'protege_call': return 'bg-blue-100 text-blue-800';
      case 'foundations_call': return 'bg-purple-100 text-purple-800';
      case 'business_acquisitions_summit': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get transcript counts by source
  const protegeCount = transcripts.filter(t => t.source === 'protege_call').length;
  const foundationsCount = transcripts.filter(t => t.source === 'foundations_call').length;
  const summitCount = transcripts.filter(t => t.source === 'business_acquisitions_summit').length;
  const totalCount = transcripts.length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Transcripts</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* Add transcript counts card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Transcript Counts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <span className="font-bold">Total:</span> {totalCount}
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-800 flex items-center gap-1 border-blue-200">
                    <span className="font-bold">Protege Calls:</span> {protegeCount}
                  </Badge>
                  <Badge variant="outline" className="bg-purple-50 text-purple-800 flex items-center gap-1 border-purple-200">
                    <span className="font-bold">Foundations Calls:</span> {foundationsCount}
                  </Badge>
                  <Badge variant="outline" className="bg-amber-50 text-amber-800 flex items-center gap-1 border-amber-200">
                    <span className="font-bold">2024 Business Acquisitions Summit:</span> {summitCount}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="general">Mastermind Call Transcripts</TabsTrigger>
                <TabsTrigger value="summit">Business Acquisitions Summit</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general">
                <Card>
                  <CardHeader>
                    <CardTitle>Add New Mastermind Call Transcript</CardTitle>
                    <CardDescription>
                      Upload a transcript from a Protege or Foundations Call
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          placeholder="Transcript title (auto-filled from filename)"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="source">Call Type</Label>
                        <Select 
                          value={source} 
                          onValueChange={setSource}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select call type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="protege_call">Protege Call</SelectItem>
                            <SelectItem value="foundations_call">Foundations Call</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="file">Upload Transcript (TXT only)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            ref={fileInputRef}
                            id="file"
                            type="file"
                            accept=".txt"
                            className="flex-1"
                            onChange={handleFileChange}
                          />
                          {selectedFile && (
                            <div className="text-sm text-muted-foreground">
                              {selectedFile.name}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="content">Transcript Content</Label>
                        <Textarea
                          id="content"
                          placeholder="Transcript content will be auto-loaded from the file"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          className="min-h-[200px]"
                        />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={uploading}
                      >
                        {uploading ? 'Saving...' : 'Save Transcript'}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
                
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Batch Upload
                    </CardTitle>
                    <CardDescription>
                      Upload multiple Mastermind transcript files at once
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="multiFile">Select Multiple Files (TXT only)</Label>
                      <Input
                        ref={multiFileInputRef}
                        id="multiFile"
                        type="file"
                        accept=".txt"
                        multiple
                        className="flex-1"
                        onChange={handleMultipleFilesChange}
                      />
                      {selectedFiles.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {selectedFiles.length} files selected
                        </p>
                      )}
                    </div>
                    
                    {processingFiles && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Uploading files...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-2">
                    <Button 
                      type="button" 
                      className="w-full"
                      onClick={handleBatchUpload}
                      disabled={processingFiles || selectedFiles.length === 0}
                    >
                      {processingFiles ? (
                        <span className="flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </span>
                      ) : (
                        'Upload All Files'
                      )}
                    </Button>
                    
                    {(uploadResults.success > 0 || uploadResults.failed > 0) && (
                      <div className="flex justify-between w-full text-sm">
                        <span className="text-emerald-600">
                          {uploadResults.success} files uploaded successfully
                        </span>
                        {uploadResults.failed > 0 && (
                          <Sheet>
                            <SheetTrigger asChild>
                              <Button 
                                variant="link" 
                                className="text-rose-600 p-0 h-auto"
                              >
                                {uploadResults.failed} files failed
                              </Button>
                            </SheetTrigger>
                            <SheetContent>
                              <SheetHeader>
                                <SheetTitle>Failed Uploads</SheetTitle>
                                <SheetDescription>
                                  The following files could not be uploaded:
                                </SheetDescription>
                              </SheetHeader>
                              <div className="mt-4">
                                <ul className="list-disc list-inside space-y-1">
                                  {failedFiles.map((file, index) => (
                                    <li key={index} className="text-sm text-rose-600">
                                      {file}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </SheetContent>
                          </Sheet>
                        )}
                      </div>
                    )}
                  </CardFooter>
                </Card>
              </TabsContent>
              
              <TabsContent value="summit">
                <Card>
                  <CardHeader>
                    <CardTitle>Add 2024 Business Acquisitions Summit Transcript</CardTitle>
                    <CardDescription>
                      Upload a transcript from the 2024 Business Acquisitions Summit
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleSummitSubmit}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="summitTitle">Title</Label>
                        <Input
                          id="summitTitle"
                          placeholder="Summit transcript title (auto-filled from filename)"
                          value={summitTitle}
                          onChange={(e) => setSummitTitle(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="summitFile">Upload Transcript (TXT only)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            ref={summitFileInputRef}
                            id="summitFile"
                            type="file"
                            accept=".txt"
                            className="flex-1"
                            onChange={handleSummitFileChange}
                          />
                          {summitSelectedFile && (
                            <div className="text-sm text-muted-foreground">
                              {summitSelectedFile.name}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="summitContent">Transcript Content</Label>
                        <Textarea
                          id="summitContent"
                          placeholder="Summit transcript content will be auto-loaded from the file"
                          value={summitContent}
                          onChange={(e) => setSummitContent(e.target.value)}
                          className="min-h-[200px]"
                        />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={summitUploading}
                      >
                        {summitUploading ? 'Saving...' : 'Save Summit Transcript'}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
                
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Summit Batch Upload
                    </CardTitle>
                    <CardDescription>
                      Upload multiple Business Acquisitions Summit transcript files at once
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="summitMultiFile">Select Multiple Files (TXT only)</Label>
                      <Input
                        ref={summitMultiFileInputRef}
                        id="summitMultiFile"
                        type="file"
                        accept=".txt"
                        multiple
                        className="flex-1"
                        onChange={handleSummitMultipleFilesChange}
                      />
                      {summitSelectedFiles.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {summitSelectedFiles.length} files selected
                        </p>
                      )}
                    </div>
                    
                    {summitProcessingFiles && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Uploading summit files...</span>
                          <span>{summitUploadProgress}%</span>
                        </div>
                        <Progress value={summitUploadProgress} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-2">
                    <Button 
                      type="button" 
                      className="w-full"
                      onClick={handleSummitBatchUpload}
                      disabled={summitProcessingFiles || summitSelectedFiles.length === 0}
                    >
                      {summitProcessingFiles ? (
                        <span className="flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </span>
                      ) : (
                        'Upload All Summit Files'
                      )}
                    </Button>
                    
                    {(summitUploadResults.success > 0 || summitUploadResults.failed > 0) && (
                      <div className="flex justify-between w-full text-sm">
                        <span className="text-emerald-600">
                          {summitUploadResults.success} files uploaded successfully
                        </span>
                        {summitUploadResults.failed > 0 && (
                          <Sheet>
                            <SheetTrigger asChild>
                              <Button 
                                variant="link" 
                                className="text-rose-600 p-0 h-auto"
                              >
                                {summitUploadResults.failed} files failed
                              </Button>
                            </SheetTrigger>
                            <SheetContent>
                              <SheetHeader>
                                <SheetTitle>Failed Summit Uploads</SheetTitle>
                                <SheetDescription>
                                  The following summit files could not be uploaded:
                                </SheetDescription>
                              </SheetHeader>
                              <div className="mt-4">
                                <ul className="list-disc list-inside space-y-1">
                                  {summitFailedFiles.map((file, index) => (
                                    <li key={index} className="text-sm text-rose-600">
                                      {file}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </SheetContent>
                          </Sheet>
                        )}
                      </div>
                    )}
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                Your Transcripts
                {filteredTranscripts.length > 0 && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({filteredTranscripts.length} {filterSource === 'all' ? 'total' : filterSource.replace('_', ' ')})
                  </span>
                )}
              </h2>
              
              <Select 
                value={filterSource} 
                onValueChange={setFilterSource}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="protege_call">Protege Calls</SelectItem>
                  <SelectItem value="foundations_call">Foundations Calls</SelectItem>
                  <SelectItem value="business_acquisitions_summit">Business Acquisitions Summit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {loading ? (
              <p>Loading transcripts...</p>
            ) : filteredTranscripts.length === 0 ? (
              <p className="text-muted-foreground">
                {filterSource === 'all' 
                  ? 'No transcripts found. Add your first transcript!' 
                  : 'No transcripts found with this source filter.'}
              </p>
            ) : (
              filteredTranscripts.map((transcript) => (
                <Card key={transcript.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="flex items-center gap-2">
                        {transcript.file_path ? <FileText className="h-4 w-4" /> : null}
                        {transcript.title}
                      </CardTitle>
                      
                      <span className={`px-2 py-1 rounded-full text-xs flex items-center ${getSourceColor(transcript.source)}`}>
                        <Tag className="h-3 w-3 mr-1" />
                        {transcript.source === 'business_acquisitions_summit' 
                          ? '2024 Business Acquisitions Summit'
                          : transcript.source?.replace('_', ' ')}
                      </span>
                    </div>
                    <CardDescription>
                      Added on {new Date(transcript.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {transcript.file_path && transcript.content === 'PDF file uploaded'
                        ? 'PDF file uploaded' 
                        : transcript.content}
                    </p>
                    {transcript.file_path && (
                      <div className="mt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => viewTranscript(transcript)}
                        >
                          View Transcript
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
      
      <Dialog open={showTranscriptDialog} onOpenChange={setShowTranscriptDialog}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">{selectedTranscript?.title}</DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
            <DialogDescription>
              {selectedTranscript?.source && (
                <span className={`px-2 py-1 rounded-full text-xs inline-flex items-center ${getSourceColor(selectedTranscript?.source)}`}>
                  <Tag className="h-3 w-3 mr-1" />
                  {selectedTranscript?.source === 'business_acquisitions_summit'
                    ? '2024 Business Acquisitions Summit'
                    : selectedTranscript?.source?.replace('_', ' ')}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            {isLoadingTranscript ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4 p-1">
                  {selectedTranscript?.content.split('\n').map((line, index) => (
                    <p key={index} className={line.trim() === '' ? 'h-4' : 'text-sm'}>
                      {line}
                    </p>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TranscriptsPage;
