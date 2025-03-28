
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, PieChart, BarChart } from '@/components/ui/charts';
import { getTranscriptCounts } from '@/utils/transcriptUtils';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw, AlertCircle, Info, BarChart3, FileText, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  fetchAnalyticsData, 
  getTopQueries, 
  generateSourceDistribution, 
  calculateSuccessRate, 
  generateResponseTimeData,
  getTranscriptSourceStats,
  generateKeywordFrequency,
  trackNonTranscriptSources,
  analyzeUserSegments
} from '@/utils/analyticsUtils';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const Analytics = () => {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  
  // Fetch analytics data
  const { data: analyticsData, isLoading: analyticsLoading, refetch: refetchAnalytics, isError } = useQuery({
    queryKey: ['chat-analytics', dateRange, searchQuery],
    queryFn: () => fetchAnalyticsData(dateRange, searchQuery),
    refetchInterval: 60000, // Refresh every minute
  });
  
  // Fetch transcript data
  const { data: transcripts, refetch: refetchTranscripts } = useQuery({
    queryKey: ['transcripts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transcripts')
        .select('id, title, content, created_at, file_path, source')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching transcripts:', error);
        return [];
      }
      
      return data || [];
    },
  });
  
  // Fetch popular queries
  const { data: topQueries } = useQuery({
    queryKey: ['top-queries', dateRange],
    queryFn: () => {
      const timePeriod = dateRange === '7d' 
        ? 'week' 
        : dateRange === '30d' 
          ? 'month'
          : 'all';
          
      return getTopQueries(timePeriod);
    },
  });
  
  // Calculate some analytics
  const transcriptCounts = React.useMemo(() => {
    return getTranscriptCounts(transcripts || []);
  }, [transcripts]);
  
  // Generate chart data
  const sourceDistribution = React.useMemo(() => {
    if (!analyticsData) return [];
    return generateSourceDistribution(analyticsData);
  }, [analyticsData]);
  
  // Success rate data
  const successRate = React.useMemo(() => {
    if (!analyticsData) return { success: 0, failure: 0, rate: 0 };
    return calculateSuccessRate(analyticsData);
  }, [analyticsData]);
  
  // Response time data
  const responseTimeData = React.useMemo(() => {
    if (!analyticsData) return [];
    return generateResponseTimeData(analyticsData);
  }, [analyticsData]);
  
  // Transcript source stats from analytics data
  const transcriptSourceStats = React.useMemo(() => {
    if (!analyticsData) return null;
    return getTranscriptSourceStats(analyticsData);
  }, [analyticsData]);
  
  // Recent queries
  const recentQueries = React.useMemo(() => {
    if (!analyticsData) return [];
    return analyticsData.slice(0, 10);
  }, [analyticsData]);
  
  // Recent summit transcripts
  const summitTranscripts = React.useMemo(() => {
    if (!transcripts) return [];
    return transcripts
      .filter(t => t.source === 'business_acquisitions_summit')
      .slice(0, 5);
  }, [transcripts]);
  
  // NEW: Keyword frequency
  const keywordFrequency = React.useMemo(() => {
    if (!analyticsData) return [];
    return generateKeywordFrequency(analyticsData, 20);
  }, [analyticsData]);
  
  // NEW: External source tracking
  const externalSourceStats = React.useMemo(() => {
    if (!analyticsData) return { count: 0, percentage: 0, topQueries: [] };
    return trackNonTranscriptSources(analyticsData);
  }, [analyticsData]);
  
  // NEW: User segments
  const userSegments = React.useMemo(() => {
    if (!analyticsData) return null;
    return analyzeUserSegments(analyticsData);
  }, [analyticsData]);
  
  // Handle manual refresh
  const handleRefresh = () => {
    refetchAnalytics();
    refetchTranscripts();
    toast({
      title: "Analytics refreshed",
      description: "The analytics data has been refreshed.",
    });
  };
  
  // Load data when component mounts
  useEffect(() => {
    handleRefresh();
  }, []);
  
  // Log summit transcript counts on load
  useEffect(() => {
    if (transcripts?.length > 0) {
      const summitTranscriptCount = transcripts.filter(t => 
        t.source === 'business_acquisitions_summit'
      ).length;
      
      console.log(`Found ${summitTranscriptCount} Business Acquisition Summit transcripts`);
    }
  }, [transcripts]);
  
  // Format keyword data for chart
  const keywordChartData = React.useMemo(() => {
    return keywordFrequency.slice(0, 10).map(item => ({
      keyword: item.word,
      count: item.count
    }));
  }, [keywordFrequency]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as any)} className="w-full sm:w-auto">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="7d" className="flex-1">Last 7 Days</TabsTrigger>
                <TabsTrigger value="30d" className="flex-1">Last 30 Days</TabsTrigger>
                <TabsTrigger value="all" className="flex-1">All Time</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1">
                <Input
                  placeholder="Search queries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-8 w-full"
                />
                <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
              <Button variant="outline" size="icon" onClick={handleRefresh} title="Refresh data" className="flex-shrink-0">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {analyticsData?.length === 0 && (
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>No analytics data found</AlertTitle>
            <AlertDescription>
              This may be due to a database connectivity issue or the chat_analytics table might be empty.
              Try using the AI assistant a few times to generate analytics data, or check your Supabase 
              implementation to ensure chat interactions are being logged properly.
            </AlertDescription>
          </Alert>
        )}
        
        {isError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error loading analytics data</AlertTitle>
            <AlertDescription>
              There was a problem fetching analytics data. Please check console logs for more details
              or verify your Supabase connection.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Total Queries</CardTitle>
              <CardDescription>
                {dateRange === '7d' ? 'Last 7 days' : 
                 dateRange === '30d' ? 'Last 30 days' : 'All time'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{analyticsData?.length || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Success Rate</CardTitle>
              <CardDescription>Successful AI responses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-500">{successRate.rate}%</div>
              <p className="text-sm text-muted-foreground mt-1">
                {successRate.success} successful / {successRate.failure} failed
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Knowledge Base</CardTitle>
              <CardDescription>Available transcripts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{transcriptCounts.total}</div>
              <div className="flex flex-wrap gap-4 mt-2 text-sm">
                <span>Protege: {transcriptCounts.protege_call}</span>
                <span>Foundations: {transcriptCounts.foundations_call}</span>
                <span>Mastermind: {transcriptCounts.mastermind_call}</span>
                <span className="font-medium">Summit: {transcriptCounts.business_acquisitions_summit}</span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Source Distribution</CardTitle>
              <CardDescription>Types of content sources used in responses</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="flex items-center justify-center h-64 lg:h-80">
                  <p>Loading data...</p>
                </div>
              ) : sourceDistribution.length > 0 ? (
                <PieChart
                  data={sourceDistribution}
                  index="name"
                  categories={['value']}
                  valueFormatter={(value) => `${value} queries`}
                  colors={['indigo', 'blue', 'violet', 'teal', 'rose', 'amber', 'lime']}
                  className="h-64 lg:h-80"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 lg:h-80">
                  <p>No data available</p>
                  {analyticsData?.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Try using the AI assistant a few times to generate analytics data
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Response Time Trend</CardTitle>
              <CardDescription>Average response time in milliseconds</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="flex items-center justify-center h-64 lg:h-80">
                  <p>Loading data...</p>
                </div>
              ) : responseTimeData.length > 0 ? (
                <LineChart
                  data={responseTimeData}
                  index="date"
                  categories={["Average Response Time (ms)"]}
                  colors={["green"]}
                  className="h-64 lg:h-80"
                  showLegend={false}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 lg:h-80">
                  <p>No response time data available</p>
                  {analyticsData?.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Try using the AI assistant a few times to generate analytics data
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* NEW SECTION: High-Value Analytics */}
        <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center">
          <Zap className="mr-2 h-5 w-5 text-yellow-500" />
          High-Value Insights
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* NEW: Keyword Frequency */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5 text-primary" />
                Top Keywords in Queries
              </CardTitle>
              <CardDescription>Most frequently used terms in user questions</CardDescription>
            </CardHeader>
            <CardContent>
              {keywordChartData.length > 0 ? (
                <BarChart
                  data={keywordChartData}
                  index="keyword"
                  categories={["count"]}
                  colors={["blue"]}
                  valueFormatter={(value) => `${value} occurrences`}
                  className="h-64 lg:h-80"
                  showLegend={false}
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-muted-foreground">No keyword data available</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* NEW: External Source Tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5 text-primary" />
                Knowledge Gaps
              </CardTitle>
              <CardDescription>Queries requiring external sources</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>External Source Usage:</span>
                <span className="font-medium">{externalSourceStats.percentage}%</span>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Top Queries Missing from Transcripts:</h4>
                {externalSourceStats.topQueries.length > 0 ? (
                  <ul className="space-y-2">
                    {externalSourceStats.topQueries.map((item, idx) => (
                      <li key={idx} className="text-sm">
                        <span className="text-muted-foreground">{idx + 1}.</span> {item.query}
                        <span className="text-xs text-muted-foreground ml-1">({item.count}x)</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No external source queries found</p>
                )}
              </div>
              
              <div className="bg-muted/50 p-3 rounded-md mt-2">
                <h4 className="text-sm font-medium mb-1">Recommendation:</h4>
                <p className="text-xs text-muted-foreground">
                  Consider adding more content related to the topics above to reduce reliance on external sources.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Popular Queries</CardTitle>
              <CardDescription>Most frequent user questions</CardDescription>
            </CardHeader>
            <CardContent>
              {topQueries?.length > 0 ? (
                <div className="space-y-4">
                  {topQueries.map((query, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="bg-muted w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{query.query}</p>
                        <p className="text-xs text-muted-foreground">{query.count} times</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground text-sm">No data available yet</p>
                  {analyticsData?.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Try using the AI assistant a few times to generate analytics data
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Summit Transcripts</CardTitle>
              <CardDescription>Latest Business Acquisitions Summit content</CardDescription>
            </CardHeader>
            <CardContent>
              {summitTranscripts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead className="hidden md:table-cell">Date Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summitTranscripts.map((transcript) => (
                      <TableRow key={transcript.id}>
                        <TableCell className="font-medium">{transcript.title}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {new Date(transcript.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground text-sm">No summit transcripts found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Make sure your summit transcripts are tagged with "business_acquisitions_summit"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Queries</CardTitle>
              <CardDescription>Latest user interactions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentQueries.length > 0 ? (
                <div className="space-y-4">
                  {recentQueries.map((query, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium break-words">{query.query}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(query.created_at).toLocaleString()} • 
                            {query.source_type && <span className="font-medium"> Source: {query.source_type}</span>}
                            {query.transcript_title && <span> • {query.transcript_title}</span>}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${query.successful ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                          {query.successful ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      <Separator className="my-1" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground text-sm">No recent queries</p>
                  {analyticsData?.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Try using the AI assistant a few times to generate analytics data
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Analytics;
