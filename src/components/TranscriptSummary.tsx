
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { Sparkles, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface TranscriptSummaryProps {
  transcriptId: string;
  userId: string;
}

interface SummaryData {
  id: string;
  transcript_id: string;
  summary: string;
  key_points: string | string[] | { [key: string]: any }; // Flexible type to handle various API responses
  golden_nuggets?: string[] | { [key: string]: any }; // For storing extracted golden nuggets
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
        setSummary(data);
        
        // Process key points - handle different formats that might be returned
        try {
          let processedKeyPoints: string[] = [];
          if (typeof data.key_points === 'string') {
            try {
              // Try to parse as JSON
              const parsed = JSON.parse(data.key_points);
              if (Array.isArray(parsed)) {
                processedKeyPoints = parsed;
              } else if (typeof parsed === 'object') {
                // Handle object format (e.g., {"1": "point one", "2": "point two"})
                processedKeyPoints = Object.values(parsed).filter(p => typeof p === 'string') as string[];
              }
            } catch (e) {
              // If not valid JSON, split by newlines or treat as a single item
              processedKeyPoints = data.key_points.includes('\n') 
                ? data.key_points.split('\n').filter(p => p.trim().length > 0)
                : [data.key_points];
            }
          } else if (Array.isArray(data.key_points)) {
            processedKeyPoints = data.key_points;
          } else if (data.key_points && typeof data.key_points === 'object') {
            processedKeyPoints = Object.values(data.key_points).filter(p => typeof p === 'string') as string[];
          }
          
          setKeyPoints(processedKeyPoints);
        } catch (keyPointError) {
          console.error("Error processing key points:", keyPointError);
          setKeyPoints([]);
        }
        
        // Process golden nuggets if available
        try {
          let processedNuggets: string[] = [];
          if (data.golden_nuggets) {
            if (typeof data.golden_nuggets === 'string') {
              try {
                const parsed = JSON.parse(data.golden_nuggets);
                if (Array.isArray(parsed)) {
                  processedNuggets = parsed;
                } else if (typeof parsed === 'object') {
                  processedNuggets = Object.values(parsed).filter(n => typeof n === 'string') as string[];
                }
              } catch (e) {
                processedNuggets = data.golden_nuggets.includes('\n')
                  ? data.golden_nuggets.split('\n').filter(n => n.trim().length > 0)
                  : [data.golden_nuggets];
              }
            } else if (Array.isArray(data.golden_nuggets)) {
              processedNuggets = data.golden_nuggets;
            } else if (typeof data.golden_nuggets === 'object') {
              processedNuggets = Object.values(data.golden_nuggets).filter(n => typeof n === 'string') as string[];
            }
          }
          setGoldenNuggets(processedNuggets);
        } catch (nuggetError) {
          console.error("Error processing golden nuggets:", nuggetError);
          setGoldenNuggets([]);
        }
      }
    } finally {
      setLoading(false);
    }
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
      
      <div>
        <h3 className="text-lg font-semibold mb-2">Summary</h3>
        <div className="text-gray-700 whitespace-pre-wrap">
          {summary.summary}
        </div>
      </div>
      
      {goldenNuggets.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
            Golden Nuggets
          </h3>
          <ul className="space-y-2 list-none">
            {goldenNuggets.map((nugget, idx) => (
              <li key={idx} className="bg-amber-50 border border-amber-100 p-3 rounded-md">
                <div className="flex">
                  <div className="text-amber-700 font-medium">{nugget}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {keyPoints.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Key Points</h3>
          <ul className="space-y-2 list-none">
            {keyPoints.map((point, idx) => (
              <li key={idx} className="bg-gray-50 border border-gray-100 p-3 rounded-md">
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TranscriptSummary;
