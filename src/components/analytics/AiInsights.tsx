
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, FileDown, CheckCircle, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type InsightType = 'general' | 'content-gaps' | 'user-behavior' | 'performance';

interface InsightsData {
  insights: string;
  timestamp: string;
  type: InsightType;
  fallback?: boolean;
  cached?: boolean;
}

const AiInsights = ({ dateRange }: { dateRange: '7d' | '30d' | 'all' }) => {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insightType, setInsightType] = useState<InsightType>('general');
  const { toast } = useToast();
  const insightsCache = useRef<Map<string, InsightsData>>(new Map());
  const initialFetchCompleted = useRef(false);

  // Create a cache key based on type and date range
  const getCacheKey = (type: InsightType, range: string) => `${type}-${range}`;

  const fetchInsights = async (type: InsightType = 'general', forceRefresh: boolean = false) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching ${type} insights for time range: ${dateRange}, forceRefresh: ${forceRefresh}`);
      
      const { data, error } = await supabase.functions.invoke('analytics-insights', {
        body: { type, timeRange: dateRange, forceRefresh },
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch insights');
      }

      if (!data) {
        throw new Error('No data returned from the analytics-insights function');
      }

      // Store insights in component state
      const newInsights = {
        insights: data.insights,
        timestamp: data.timestamp || new Date().toISOString(),
        type,
        fallback: data.fallback,
        cached: data.cached
      };

      setInsights(newInsights);
      
      // Also store in local cache
      const cacheKey = getCacheKey(type, dateRange);
      insightsCache.current.set(cacheKey, newInsights);
      
      if (data.fallback) {
        toast({
          variant: "warning",
          title: "Using fallback insights",
          description: "The AI insights generator is currently unavailable. Showing basic analytics instead.",
        });
      }
      
      if (data.cached) {
        toast({
          variant: "default",
          title: "Using cached insights",
          description: "Showing insights from cache. Use refresh to generate new insights.",
        });
      }
    } catch (err) {
      console.error('Error fetching insights:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      toast({
        variant: "destructive",
        title: "Error fetching insights",
        description: err instanceof Error ? err.message : "Failed to generate insights",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch insights when component mounts or date range changes
  useEffect(() => {
    // Don't fetch on initial render if insights already exist
    if (!initialFetchCompleted.current) {
      fetchInsights('general', false);
      initialFetchCompleted.current = true;
      return;
    }
    
    // On date range change, check cache first
    const cacheKey = getCacheKey(insightType, dateRange);
    const cachedInsight = insightsCache.current.get(cacheKey);
    
    if (cachedInsight) {
      // Use cached data if available
      setInsights(cachedInsight);
    } else {
      // Fetch new data if not in cache
      fetchInsights(insightType, false);
    }
  }, [dateRange]);

  const handleTabChange = (value: string) => {
    const newType = value as InsightType;
    setInsightType(newType);
    
    // Check if we have this insight type cached for current date range
    const cacheKey = getCacheKey(newType, dateRange);
    const cachedInsight = insightsCache.current.get(cacheKey);
    
    if (cachedInsight) {
      // Use cached data
      setInsights(cachedInsight);
    } else {
      // Fetch new data
      fetchInsights(newType, false);
    }
  };
  
  const handleRefresh = () => {
    fetchInsights(insightType, true);
  };

  const exportInsights = () => {
    if (!insights) return;

    // Format date for filename
    const date = new Date().toISOString().split('T')[0];
    const title = `ai-insights-${insightType}-${date}`;
    
    // Create markdown content
    const content = `# AI-Generated Analytics Insights: ${insightType.replace('-', ' ')}
Generated on: ${new Date(insights.timestamp).toLocaleString()}
Time range: ${dateRange === '7d' ? 'Past 7 days' : dateRange === '30d' ? 'Past 30 days' : 'All time'}

${insights.insights}
`;

    // Create and download the file
    const element = document.createElement('a');
    const file = new Blob([content], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `${title}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast({
      title: "Insights exported",
      description: `Saved as ${title}.md`,
    });
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <RefreshCw className="h-10 w-10 mb-4 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Generating insights...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-10 w-10 mb-4 text-destructive" />
          <p className="text-muted-foreground text-center mb-3">Failed to generate insights</p>
          <p className="text-xs text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" onClick={handleRefresh}>
            Try Again
          </Button>
        </div>
      );
    }

    if (!insights) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Brain className="h-10 w-10 mb-4 text-primary" />
          <p className="text-muted-foreground text-center mb-4">Click generate to get AI insights</p>
          <Button onClick={handleRefresh}>
            Generate Insights
          </Button>
        </div>
      );
    }

    return (
      <>
        {insights.fallback && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md text-amber-800 dark:text-amber-200">
            <p className="text-sm flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              AI insights generator is currently unavailable. Showing basic analytics instead.
            </p>
          </div>
        )}
        
        {insights.cached && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md text-blue-800 dark:text-blue-200">
            <p className="text-sm flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Showing cached insights. Click refresh to generate new ones.
            </p>
          </div>
        )}
        
        <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: formatMarkdown(insights.insights) }} />
        
        <div className="mt-2 text-xs text-muted-foreground text-right">
          Generated on {new Date(insights.timestamp).toLocaleString()}
        </div>
      </>
    );
  };

  return (
    <Card className="h-full w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5" /> AI Insights
            </CardTitle>
            <CardDescription>AI-generated analytics observations and recommendations</CardDescription>
          </div>
          <Badge variant="outline" className="ml-auto">
            {dateRange === '7d' ? 'Past week' : dateRange === '30d' ? 'Past month' : 'All time'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <Tabs value={insightType} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="content-gaps">Content Gaps</TabsTrigger>
            <TabsTrigger value="user-behavior">User Behavior</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>
          
          <TabsContent value={insightType} className="mt-0">
            <div className="min-h-[300px] max-h-[60vh] overflow-y-auto pr-1">
              {renderContent()}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="pt-2 flex justify-between flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </>
          )}
        </Button>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportInsights}
            disabled={!insights || loading}
          >
            <FileDown className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

// Helper function to convert markdown to HTML
function formatMarkdown(markdown: string): string {
  // Simple markdown formatting
  return markdown
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold my-3">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold my-2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-md font-bold my-2">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4"><span class="font-medium">$1.</span> $2</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/```(.+?)```/gs, '<pre class="bg-muted p-2 my-2 rounded overflow-x-auto text-xs">$1</pre>');
}

export default AiInsights;
