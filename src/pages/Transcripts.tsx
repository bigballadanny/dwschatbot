
import React, { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';

interface Transcript {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

const TranscriptsPage: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please provide both a title and content for the transcript',
        variant: 'destructive',
      });
      return;
    }
    
    setUploading(true);
    
    try {
      // Insert transcript into database
      const { data, error } = await supabase
        .from('transcripts')
        .insert([
          { 
            title, 
            content,
            user_id: user?.id 
          }
        ])
        .select();
        
      if (error) throw error;
      
      // Reset form
      setTitle('');
      setContent('');
      
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
                Add a new transcript to the knowledge base
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
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Paste transcript content here"
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
                    <CardTitle>{transcript.title}</CardTitle>
                    <CardDescription>
                      Added on {new Date(transcript.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {transcript.content}
                    </p>
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
