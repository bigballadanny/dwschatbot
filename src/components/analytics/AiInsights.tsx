import React, { useState, useEffect } from 'react';
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
}

const AiInsights = ({ dateRange }: { dateRange: '7d' | '30d' | 'all' }) => {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insightType, setInsightType] = useState<InsightType>('general');
  const { toast } = useToast();

  const fetchInsights = async (type: InsightType = 'general') => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('analytics-insights', {
        body: { type, timeRange: dateRange },
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch insights');
      }
      // Add check for missing insights in successful response
      if (!data?.insights) {
        console.warn("Received success response but no insights content.", data);
        // Set a specific message or handle as appropriate
        setInsights({
             insights: "No insights could be generated based on the available data.",
             timestamp: new Date().toISOString(),
             type
        });
      } else {
          setInsights({
            insights: data.insights,
            timestamp: data.timestamp || new Date().toISOString(),
            type
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

  // Removed useEffect hook that fetched insights on component mount

  // Clear insights when date range changes
  useEffect(() => {
    setInsights(null);
    setError(null); // Also clear error when date range changes
  }, [dateRange]);

  const handleTabChange = (value: string) => {
    const newType = value as InsightType;
    setInsightType(newType);
    // Fetch insights when a new tab is selected
    fetchInsights(newType);
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
          <Button variant="outline" onClick={() => fetchInsights(insightType)}>
            Try Again
          </Button>
        </div>
      );
    }
    // Modified initial state: Now shows a button to generate insights explicitly
    if (!insights) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Brain className="h-10 w-10 mb-4 text-primary" />
          <p className="text-muted-foreground text-center mb-4">Click generate to get AI insights for the selected tab and date range.</p>
          <Button onClick={() => fetchInsights(insightType)}>
            Generate Insights
          </Button>
        </div>
      );
    }

    // Use the existing markdown formatting for valid insights
    return (
      <>
        {/* Added a check for placeholder message */}
        {insights.insights === "No insights could be generated based on the available data." ? (
            <p className="text-muted-foreground italic p-4 text-center">{insights.insights}</p>
        ) : (
             <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: formatMarkdown(insights.insights) }} />
        )}
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
             {/* Ensure min-height allows the Generate button to be visible initially */}
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
          onClick={() => fetchInsights(insightType)} // Changed to always allow refresh/generate
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
              {/* Change button text based on whether insights exist */}
              {insights ? 'Refresh Insights' : 'Generate Insights'}
            </>
          )}
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportInsights}
            disabled={!insights || loading || insights.insights === "No insights could be generated based on the available data."}
          >
            <FileDown className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

// Helper function to convert markdown to HTML (Corrected Version)
function formatMarkdown(markdown: string): string {
  if (!markdown) return '';

  // Perform other replacements first
  let html = markdown
    .replace(/^# (.+)/gm, '<h1 class=\"text-lg font-semibold my-2\">$1</h1>')
    .replace(/^## (.+)/gm, '<h2 class=\"text-base font-semibold my-1\">$1</h2>')
    .replace(/^### (.+)/gm, '<h3 class=\"text-sm font-semibold my-1\">$1</h3>')
    .replace(/`([^`]+)`/g, '<code class=\"bg-muted px-1 rounded text-sm\">$1</code>')
    .replace(/```([\s\S]*?)```/g, '<pre class=\"bg-muted p-2 my-2 rounded overflow-x-auto text-xs\">$1</pre>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^- (.*)/gm, '<ul><li>$1</li></ul>') // Basic list handling
    .replace(/^\* (.*)/gm, '<ul><li>$1</li></ul>')
    .replace(/^\d+\. (.*)/gm, '<ol><li>$1</li></ol>');

  // Replace newlines with <br /> - IMPORTANT: Do this *after* other block replacements
  html = html.replace(/\r?\n/g, '<br />');

  // Crude list grouping - Consider a dedicated library for robust conversion
  html = html.replace(/<\/li><br \/><li>/g, '</li><li>');
  html = html.replace(/<\/ul><br \/><ul>/g, '</ul><ul>');
  html = html.replace(/<\/ol><br \/><ol>/g, '</ol><ol>');
  // Add basic list styling if needed here or via CSS
  html = html.replace(/<ul>/g, '<ul class=\"list-disc list-outside pl-5 my-1\">');
  html = html.replace(/<ol>/g, '<ol class=\"list-decimal list-outside pl-5 my-1\">');


  return html;
}



export default AiInsights;
