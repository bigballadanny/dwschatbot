import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, FileText, AlertTriangle, Check } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from "@/utils/toastUtils";
import { Json } from '@/integrations/supabase/types';

interface KeyPoint {
  point: string;
  explanation: string;
}

interface SummaryData {
  id: string;
  transcript_id: string;
  summary: string;
  key_points: KeyPoint[];
  token_count: number;
  model_used: string;
  created_at: string;
}

interface TranscriptSummaryProps {
  transcriptId: string;
  userId: string;
}

const TranscriptSummary: React.FC<TranscriptSummaryProps> = ({ transcriptId, userId }) => {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateDisabled, setGenerateDisabled] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, [transcriptId]);

  const fetchSummary = async () => {
    if (!transcriptId) return;

    try {
      const { data, error } = await supabase
        .from('transcript_summaries')
        .select('*')
        .eq('transcript_id', transcriptId)
        .single();

      if (error) {
        console.error('Error fetching summary:', error);
      } else if (data) {
        const processedData: SummaryData = {
          ...data,
          key_points: processKeyPoints(data.key_points)
        };
        setSummaryData(processedData);
      }
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  };

  const processKeyPoints = (keyPoints: Json): KeyPoint[] => {
    if (!keyPoints) return [];
    
    if (Array.isArray(keyPoints)) {
      return keyPoints.map(point => {
        if (typeof point === 'object' && point !== null) {
          return {
            point: point.point || 'Unknown point',
            explanation: point.explanation || ''
          };
        }
        return { point: String(point), explanation: '' };
      });
    }
    
    if (typeof keyPoints === 'string') {
      try {
        const parsed = JSON.parse(keyPoints);
        if (Array.isArray(parsed)) {
          return processKeyPoints(parsed);
        }
      } catch (e) {
        return [{ point: keyPoints, explanation: '' }];
      }
    }
    
    return [];
  };

  const generateSummary = async () => {
    if (!transcriptId || !userId) {
      showError("Missing Information", "Cannot generate summary without transcript ID and user ID.");
      return;
    }

    setLoading(true);
    setError(null);
    setGenerateDisabled(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-transcript-summary', {
        body: {
          transcriptId,
          userId
        }
      });

      if (error || data?.error) {
        throw new Error(error || data?.error || 'Unknown error occurred');
      }

      if (data?.summary) {
        const processedSummary: SummaryData = {
          ...data.summary,
          key_points: processKeyPoints(data.summary.key_points)
        };
        setSummaryData(processedSummary);
        showSuccess("Summary Generated", "The transcript summary was successfully generated.");
      } else {
        throw new Error('No summary data returned');
      }
    } catch (err: any) {
      console.error('Failed to generate summary:', err);
      setError(err.message || 'Failed to generate summary');
      showError("Summary Generation Failed", err.message || 'An error occurred while generating the summary');
      setGenerateDisabled(false);
    } finally {
      setLoading(false);
    }
  };

  const regenerateSummary = async () => {
    if (!summaryData?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      await supabase
        .from('transcript_summaries')
        .delete()
        .eq('id', summaryData.id);
        
      await supabase
        .from('transcripts')
        .update({ is_summarized: false })
        .eq('id', transcriptId);
      
      setSummaryData(null);
      
      await generateSummary();
    } catch (err: any) {
      console.error('Failed to regenerate summary:', err);
      setError(err.message || 'Failed to regenerate summary');
      showError("Regeneration Failed", "An error occurred while trying to regenerate the summary");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Transcript Summary</CardTitle>
            <CardDescription>AI-generated summary of the transcript content</CardDescription>
          </div>
          {summaryData && (
            <Badge variant="outline" className="ml-2">
              {summaryData.model_used || 'AI Generated'}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="flex items-center gap-2 p-4 mb-4 bg-red-50 text-red-800 rounded-md border border-red-200">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Generating summary...</p>
            <p className="text-xs text-muted-foreground mt-2">This may take a minute or two.</p>
          </div>
        ) : summaryData ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Summary</h3>
              <ScrollArea className="h-[200px] border rounded-md p-4 bg-muted/20">
                <div className="whitespace-pre-wrap">{summaryData.summary}</div>
              </ScrollArea>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Key Points</h3>
              <div className="space-y-3">
                {Array.isArray(summaryData.key_points) && summaryData.key_points.length > 0 ? (
                  summaryData.key_points.map((point, index) => (
                    <div key={index} className="border rounded-md p-3 bg-muted/10">
                      <h4 className="font-medium">{point.point}</h4>
                      {point.explanation && (
                        <p className="text-sm text-muted-foreground mt-1">{point.explanation}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground italic">No key points available</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t text-sm text-muted-foreground">
              <div>Generated: {formatDate(summaryData.created_at)}</div>
              {summaryData.token_count && (
                <div>Tokens processed: ~{summaryData.token_count.toLocaleString()}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No summary available for this transcript.</p>
            <p className="text-xs text-muted-foreground mt-2">Generate a summary to get key insights from the content.</p>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="justify-end pt-4 gap-3">
        {summaryData ? (
          <Button 
            variant="outline" 
            size="sm"
            onClick={regenerateSummary}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Regenerate
          </Button>
        ) : (
          <Button 
            variant="default" 
            onClick={generateSummary}
            disabled={loading || generateDisabled}
            className="flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Generate Summary
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default TranscriptSummary;
