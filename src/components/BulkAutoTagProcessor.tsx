
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from "@/utils/toastUtils";
import { Loader2, Tag, ChevronRight, CheckCircle2 } from 'lucide-react';

interface BulkAutoTagProcessorProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

const BulkAutoTagProcessor: React.FC<BulkAutoTagProcessorProps> = ({ 
  open, 
  onClose,
  userId 
}) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalTranscripts, setTotalTranscripts] = useState(0);
  const [processedTranscripts, setProcessedTranscripts] = useState(0);
  const [completed, setCompleted] = useState(false);

  const startBulkTagging = async () => {
    if (!userId) {
      showError("Authentication Error", "You must be logged in to use this feature.");
      return;
    }

    setLoading(true);
    setProgress(0);
    setCompleted(false);

    try {
      // First, get all untagged transcripts
      const { data: transcripts, error } = await supabase
        .from('transcripts')
        .select('id, title, content')
        .is('tags', null)
        .eq('user_id', userId);

      if (error) throw error;
      
      if (!transcripts || transcripts.length === 0) {
        showSuccess("No Transcripts to Tag", "All your transcripts already have tags.");
        setLoading(false);
        return;
      }

      setTotalTranscripts(transcripts.length);
      
      // Process each transcript
      for (let i = 0; i < transcripts.length; i++) {
        const transcript = transcripts[i];
        
        // Using a simple tag generation approach - in a real app you'd likely 
        // use a more sophisticated AI tagging system
        try {
          const tags = await generateTagsForTranscript(transcript);
          
          // Update the transcript with new tags
          await supabase
            .from('transcripts')
            .update({ tags })
            .eq('id', transcript.id);
          
          setProcessedTranscripts(i + 1);
          setProgress(Math.round(((i + 1) / transcripts.length) * 100));
        } catch (err) {
          console.error(`Error processing transcript ${transcript.id}:`, err);
          // Continue with other transcripts even if one fails
        }
      }

      setCompleted(true);
      showSuccess("Tagging Complete", `Successfully tagged ${processedTranscripts} transcripts.`);
    } catch (err: any) {
      console.error("Error in bulk tagging:", err);
      showError("Tagging Error", err.message || "An error occurred while tagging transcripts");
    } finally {
      setLoading(false);
    }
  };

  // Simple tag generation function - in a real app this would use AI
  const generateTagsForTranscript = async (transcript: {id: string, title: string, content: string}): Promise<string[]> => {
    // This is a placeholder - in a real app you'd call an AI service
    // Here we're just extracting some common words as tags
    const tags = new Set<string>();
    
    // Extract potential tag words from title and content
    const text = (transcript.title + ' ' + transcript.content).toLowerCase();
    
    // Common topics that might appear in transcripts
    const potentialTags = [
      'meeting', 'interview', 'presentation', 'training', 'webinar',
      'sales', 'marketing', 'finance', 'hr', 'product', 'technical',
      'customer', 'project', 'strategy', 'planning', 'review'
    ];
    
    // Add tags if they appear in the text
    potentialTags.forEach(tag => {
      if (text.includes(tag)) {
        tags.add(tag);
      }
    });
    
    // Delay to simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return Array.from(tags).slice(0, 5); // Limit to 5 tags
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Card className="mt-4">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Processing {processedTranscripts} of {totalTranscripts} transcripts
                </span>
                <span className="text-sm font-medium">{progress}%</span>
              </div>
              
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              <div className="flex justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          ) : completed ? (
            <div className="flex flex-col items-center py-6 space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div className="text-center">
                <h3 className="font-medium text-lg">Tagging Complete</h3>
                <p className="text-muted-foreground">
                  Successfully tagged {processedTranscripts} transcripts
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Tag className="h-5 w-5" />
                <h3 className="font-medium">Auto-Tag Your Transcripts</h3>
              </div>
              
              <p className="text-muted-foreground text-sm">
                This will analyze your transcripts and generate relevant tags based on their content.
                The process may take a few minutes depending on how many transcripts need to be processed.
              </p>
              
              <div className="bg-muted/30 p-3 rounded-md border border-muted">
                <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                  <ChevronRight className="h-3 w-3" /> 
                  How It Works
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                  <li>Only transcripts without tags will be processed</li>
                  <li>The system analyzes the content to identify key topics</li>
                  <li>Tags are assigned based on detected topics and themes</li>
                  <li>Each transcript will receive up to 5 relevant tags</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end space-x-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClose}
          disabled={loading}
        >
          {completed ? 'Close' : 'Cancel'}
        </Button>
        
        {!loading && !completed && (
          <Button 
            size="sm"
            onClick={startBulkTagging}
            className="flex items-center gap-1.5"
          >
            <Tag className="h-3.5 w-3.5" />
            Start Tagging
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default BulkAutoTagProcessor;
