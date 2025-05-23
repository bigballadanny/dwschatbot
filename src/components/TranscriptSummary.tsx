
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client'; // Import the global supabase client
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/ui/use-toast";
import { Sparkles, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { SummaryContent } from './summary/SummaryContent';
import { KeyPointsList } from './summary/KeyPointsList';
import { GoldenNuggetsList } from './summary/GoldenNuggetsList';

interface TranscriptSummaryProps {
  transcriptId: string;
  userId: string;
}

export interface SummaryData {
  id: string;
  transcript_id: string;
  summary: string;
  key_points: any; // Using 'any' to handle all possible JSON types from Supabase
  golden_nuggets?: any; // Using 'any' to handle all possible JSON types from Supabase
  created_at: string;
  updated_at: string;
}

const TranscriptSummary: React.FC<TranscriptSummaryProps> = ({ transcriptId, userId }) => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [goldenNuggets, setGoldenNuggets] = useState<string[]>([]);

  useEffect(() => {
    fetchSummary();
  }, [transcriptId]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('transcript_summaries')
        .select('*')
        .eq('transcript_id', transcriptId)
        .single();
      
      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No data found, just reset the state
          setSummary(null);
          setKeyPoints([]);
          setGoldenNuggets([]);
        } else {
          console.error("Error fetching summary:", fetchError);
          setError(`Failed to fetch summary: ${fetchError.message}`);
        }
        return;
      }
      
      if (data) {
        // Convert the data to match our SummaryData type
        const summaryData: SummaryData = {
          id: data.id,
          transcript_id: data.transcript_id,
          summary: data.summary,
          key_points: data.key_points || [], // Cast to our expected type
          created_at: data.created_at,
          updated_at: data.updated_at
        };
        
        // Add golden_nuggets if they exist in the database
        if ('golden_nuggets' in data) {
          summaryData.golden_nuggets = data.golden_nuggets || [];
        }
        
        setSummary(summaryData);
        
        // Process key points
        try {
          setKeyPoints(processKeyPoints(summaryData.key_points));
        } catch (keyPointError) {
          console.error("Error processing key points:", keyPointError);
          setKeyPoints([]);
        }
        
        // Process golden nuggets
        try {
          setGoldenNuggets(processGoldenNuggets(summaryData.golden_nuggets));
        } catch (nuggetError) {
          console.error("Error processing golden nuggets:", nuggetError);
          setGoldenNuggets([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const processKeyPoints = (rawKeyPoints: any): string[] => {
    if (!rawKeyPoints) return [];
    
    let processedKeyPoints: string[] = [];
    if (typeof rawKeyPoints === 'string') {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(rawKeyPoints);
        if (Array.isArray(parsed)) {
          processedKeyPoints = parsed;
        } else if (typeof parsed === 'object') {
          // Handle object format (e.g., {"1": "point one", "2": "point two"})
          processedKeyPoints = Object.values(parsed).filter(p => typeof p === 'string') as string[];
        }
      } catch (e) {
        // If not valid JSON, split by newlines or treat as a single item
        processedKeyPoints = rawKeyPoints.includes('\n') 
          ? rawKeyPoints.split('\n').filter((p: string) => p.trim().length > 0)
          : [rawKeyPoints];
      }
    } else if (Array.isArray(rawKeyPoints)) {
      processedKeyPoints = rawKeyPoints;
    } else if (rawKeyPoints && typeof rawKeyPoints === 'object') {
      processedKeyPoints = Object.values(rawKeyPoints).filter(p => typeof p === 'string') as string[];
    }
    
    return processedKeyPoints;
  };

  const processGoldenNuggets = (rawNuggets: any): string[] => {
    if (!rawNuggets) return [];
    
    let processedNuggets: string[] = [];
    if (typeof rawNuggets === 'string') {
      try {
        const parsed = JSON.parse(rawNuggets);
        if (Array.isArray(parsed)) {
          processedNuggets = parsed;
        } else if (typeof parsed === 'object') {
          processedNuggets = Object.values(parsed).filter(n => typeof n === 'string') as string[];
        }
      } catch (e) {
        processedNuggets = rawNuggets.includes('\n')
          ? rawNuggets.split('\n').filter((n: string) => n.trim().length > 0)
          : [rawNuggets];
      }
    } else if (Array.isArray(rawNuggets)) {
      processedNuggets = rawNuggets;
    } else if (typeof rawNuggets === 'object') {
      processedNuggets = Object.values(rawNuggets).filter(n => typeof n === 'string') as string[];
    }
    
    return processedNuggets;
  };

  const generateSummary = async () => {
    if (!transcriptId || !userId) {
      toast({
        title: "Missing Information",
        description: "Missing required information to generate summary.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setGenerating(true);
      setError(null);
      
      // Call the edge function to generate summary with Vertex AI Gemini 1.5 Pro
      const { data, error: genError } = await supabase.functions.invoke('generate-transcript-summary', {
        body: {
          transcriptId,
          userId,
          extractNuggets: true // Request golden nuggets extraction
        }
      });
      
      if (genError) {
        console.error("Error generating summary:", genError);
        setError(`Failed to generate summary: ${genError.message || 'Unknown error'}`);
        toast({
          title: "Summary Generation Failed", 
          description: genError.message || 'Unknown error',
          variant: "destructive"
        });
        return;
      }
      
      if (data?.success) {
        toast({
          title: "Summary Generated", 
          description: "The transcript has been successfully summarized.",
        });
        // Reload the summary from the database
        fetchSummary();
      } else {
        setError(data?.message || "Unknown error occurred during summary generation.");
        toast({ 
          title: "Summary Generation Issue", 
          description: data?.message || "Unknown error occurred during summary generation.",
          variant: "destructive"
        });
      }
    } catch (e: any) {
      console.error("Exception during summary generation:", e);
      setError(`Exception: ${e.message || 'Unknown error'}`);
      toast({ 
        title: "Error", 
        description: e.message || 'An unexpected error occurred',
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-md bg-red-50">
        <div className="flex items-center gap-2 text-red-700 mb-2">
          <AlertCircle size={16} />
          <p className="font-semibold">Error</p>
        </div>
        <p className="text-red-600 text-sm">{error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-4" 
          onClick={fetchSummary}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-4 border border-gray-200 rounded-md">
        <p className="text-gray-500 mb-4">No summary available for this transcript.</p>
        <Button
          onClick={generateSummary}
          disabled={generating}
          className="flex items-center"
        >
          {generating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate AI Summary
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            Summary Available
          </Badge>
          {summary.updated_at && (
            <span className="text-xs text-gray-400">
              Updated {new Date(summary.updated_at).toLocaleDateString()}
            </span>
          )}
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={generateSummary} 
          disabled={generating}
        >
          {generating ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-1">Regenerate</span>
        </Button>
      </div>
      
      <SummaryContent summary={summary.summary} />
      
      {goldenNuggets.length > 0 && (
        <GoldenNuggetsList nuggets={goldenNuggets} />
      )}
      
      {keyPoints.length > 0 && (
        <KeyPointsList points={keyPoints} />
      )}
    </div>
  );
};

export default TranscriptSummary;
