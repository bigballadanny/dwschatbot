
import React, { useState, useEffect, useRef } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { FileText, Upload } from 'lucide-react';

interface Transcript {
  id: string;
  title: string;
  content: string;
  created_at: string;
  file_path?: string;
}

const TranscriptsPage: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        toast({
          title: 'Invalid file type',
          description: 'Please select a PDF file',
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
        const fileName = file.name.replace(/\.pdf$/, '');
        setTitle(fileName);
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
        description: 'Please provide either content or upload a PDF file',
        variant: 'destructive',
      });
      return;
    }
    
    setUploading(true);
    
    try {
      let filePath = null;
      
      // Upload file if selected
      if (selectedFile) {
        filePath = await uploadFile(selectedFile);
      }
      
      // Insert transcript into database
      const { data, error } = await supabase
        .from('transcripts')
        .insert([
          { 
            title, 
            content: content || 'PDF file uploaded', // Use default text if content is empty
            file_path: filePath,
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
        description: 'Your transcript has been successfully saved',
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
                Add a new transcript by pasting text or uploading a PDF file
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
                  <Label htmlFor="file">Upload PDF (optional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      ref={fileInputRef}
                      id="file"
                      type="file"
                      accept=".pdf"
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
                    placeholder="Paste transcript content here or upload a PDF file"
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
            <h2 className="text-xl font-semibold">Your Transcripts</h2>
            
            {loading ? (
              <p>Loading transcripts...</p>
            ) : transcripts.length === 0 ? (
              <p className="text-muted-foreground">No transcripts found. Add your first transcript!</p>
            ) : (
              transcripts.map((transcript) => (
                <Card key={transcript.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {transcript.file_path ? <FileText className="h-4 w-4" /> : null}
                      {transcript.title}
                    </CardTitle>
                    <CardDescription>
                      Added on {new Date(transcript.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {transcript.file_path 
                        ? 'PDF file uploaded' 
                        : transcript.content}
                    </p>
                    {transcript.file_path && (
                      <div className="mt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(
                            `${supabase.storageUrl}/object/public/transcripts/${transcript.file_path}`,
                            '_blank'
                          )}
                        >
                          View PDF
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
