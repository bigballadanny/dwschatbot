
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
import { FileText, Upload, Tag } from 'lucide-react';
import { detectSourceCategory, getSourceDescription } from '@/utils/transcriptUtils';

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
  const [source, setSource] = useState('creative_dealmaker');
  const [uploading, setUploading] = useState(false);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filterSource, setFilterSource] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch transcripts on page load
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
      // Validate file type
      if (file.type !== 'application/pdf' && !file.type.includes('text/plain')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select a PDF or TXT file',
          variant: 'destructive',
        });
        // Reset the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      setSelectedFile(file);
      
      // Auto-fill title from filename if title is empty
      if (!title) {
        const fileName = file.name.replace(/\.(pdf|txt)$/, '');
        setTitle(fileName);
      }
      
      // If it's a text file, try to read it and auto-detect the source
      if (file.type.includes('text/plain')) {
        try {
          const text = await file.text();
          setContent(text);
          
          // Auto-detect source category
          const detectedSource = detectSourceCategory(file.name, text);
          setSource(detectedSource);
          
          toast({
            title: 'Text file loaded',
            description: `Source category detected: ${getSourceDescription(detectedSource)}`,
          });
        } catch (error) {
          console.error('Error reading text file:', error);
        }
      }
    }
  };

  const uploadFile = async (file: File) => {
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
    
    // Either content or file should be provided
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
      
      // Upload file if selected
      if (selectedFile) {
        filePath = await uploadFile(selectedFile);
        
        // If it's a PDF and there's no content, use placeholder
        if (selectedFile.type === 'application/pdf' && !content.trim()) {
          finalContent = 'PDF file uploaded';
        }
      }
      
      // Insert transcript into database
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
      
      // Reset form
      setTitle('');
      setContent('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Update transcripts list
      if (data) {
        setTranscripts([data[0], ...transcripts]);
      }
      
      toast({
        title: 'Transcript saved',
        description: `Your transcript has been successfully saved as ${getSourceDescription(source)}`,
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

  // Function to get the public URL for a file
  const getFileUrl = (filePath: string) => {
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/transcripts/${filePath}`;
  };

  // Filter transcripts based on selected source
  const filteredTranscripts = filterSource === 'all' 
    ? transcripts 
    : transcripts.filter(t => t.source === filterSource);

  // Get source badge color
  const getSourceColor = (source: string | undefined): string => {
    switch(source) {
      case 'creative_dealmaker': return 'bg-blue-100 text-blue-800';
      case 'mastermind_call': return 'bg-purple-100 text-purple-800';
      case 'case_study': return 'bg-green-100 text-green-800';
      case 'financial_advice': return 'bg-yellow-100 text-yellow-800';
      case 'due_diligence': return 'bg-red-100 text-red-800';
      case 'negotiation': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Transcripts</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Transcript Form */}
          <Card>
            <CardHeader>
              <CardTitle>Add New Transcript</CardTitle>
              <CardDescription>
                Add a new transcript by pasting text or uploading a file
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter transcript title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="source">Source Category</Label>
                  <Select 
                    value={source} 
                    onValueChange={setSource}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="creative_dealmaker">The Creative Dealmaker Book</SelectItem>
                      <SelectItem value="mastermind_call">Mastermind Call Transcript</SelectItem>
                      <SelectItem value="case_study">Case Study / Success Story</SelectItem>
                      <SelectItem value="financial_advice">Financial Guidance</SelectItem>
                      <SelectItem value="due_diligence">Due Diligence Process</SelectItem>
                      <SelectItem value="negotiation">Negotiation Strategies</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getSourceDescription(source)}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="file">Upload File (PDF or TXT)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      ref={fileInputRef}
                      id="file"
                      type="file"
                      accept=".pdf,.txt"
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
                  <Label htmlFor="content">Content (optional if PDF is uploaded)</Label>
                  <Textarea
                    id="content"
                    placeholder="Paste transcript content here or upload a file"
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
          
          {/* Transcript List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Your Transcripts</h2>
              
              <Select 
                value={filterSource} 
                onValueChange={setFilterSource}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="creative_dealmaker">Creative Dealmaker</SelectItem>
                  <SelectItem value="mastermind_call">Mastermind Call</SelectItem>
                  <SelectItem value="case_study">Case Study</SelectItem>
                  <SelectItem value="financial_advice">Financial Advice</SelectItem>
                  <SelectItem value="due_diligence">Due Diligence</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
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
                        {transcript.source?.replace('_', ' ')}
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
                          onClick={() => window.open(
                            getFileUrl(transcript.file_path!),
                            '_blank'
                          )}
                        >
                          View File
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
    </div>
  );
};

export default TranscriptsPage;
