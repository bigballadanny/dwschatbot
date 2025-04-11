import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  fetchAnalyticsData,
  getTopQueries,
  generateSourceDistribution,
  calculateSuccessRate,
  generateResponseTimeData,
  getFrequentlyUsedTranscripts,
  generateKeywordFrequency,
  trackNonTranscriptSources,
  analyzeUserSegments,
  generateQueryThemes,
  identifyInsightfulQueries
} from '@/utils/analyticsUtils';
import { checkAnalyticsTable } from '@/utils/analyticsDbCheck';
import { LineChart, BarChart, PieChart } from '@/components/ui/charts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/components/ui/use-toast";

interface AnalyticsData { 
  id: string;
  conversation_id: string | null;
  query: string;
  response_length: number | null;
  source_type: string | null;
  relevance_score: number | null;
  search_time_ms: number | null;
  api_time_ms: number | null;
  successful: boolean | null;
  created_at: string;
  transcript_title: string | null;
  error_message: string | null;
  used_online_search: boolean | null;
}

interface QueryThemeData { theme: string; count: number; }
interface InsightfulQuery { query: string; reason: string; score: number; source?: string | null; }
interface UserEngagement { 
  uniqueConversations: number; 
  totalQueries: number;
  avgQueriesPerConversation: number; 
  returnRate: number;
}

const Analytics = () => {
  const { toast } = useToast();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [topQueries, setTopQueries] = useState<{ query: string; count: number }[]>([]);
  const [sourceDistribution, setSourceDistribution] = useState<{ name: string; value: number }[]>([]);
  const [successRate, setSuccessRate] = useState<{ success: number; failure: number; rate: number }>({ success: 0, failure: 0, rate: 0 });
  const [responseTimeData, setResponseTimeData] = useState<{ date: string; "Average Response Time (ms)": number }[]>([]);
  const [frequentTranscripts, setFrequentTranscripts] = useState<{ title: string; count: number; source: string | null }[]>([]);
  const [keywordFrequency, setKeywordFrequency] = useState<{ word: string; count: number }[]>([]);
  const [queryThemesData, setQueryThemesData] = useState<QueryThemeData[]>([]);
  const [insightfulQueries, setInsightfulQueries] = useState<InsightfulQuery[]>([]);
  const [nonTranscriptSources, setNonTranscriptSources] = useState<{ count: number; percentage: number; topQueries: { query: string; count: number }[] }>({ count: 0, percentage: 0, topQueries: [] });
  const [userSegments, setUserSegments] = useState<{ basic: number; engaged: number; power: number; technical: number; conceptual: number; otherType: number; }>({ basic: 0, engaged: 0, power: 0, technical: 0, conceptual: 0, otherType: 0 });
  const [userEngagement, setUserEngagement] = useState<UserEngagement>({
    uniqueConversations: 0,
    totalQueries: 0,
    avgQueriesPerConversation: 0,
    returnRate: 0
  });
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const generateUserSegmentsPieData = (type: 'engagement' | 'queryTypes') => {
    if (type === 'engagement') {
      return [
        { name: 'Basic Users', value: userSegments.basic },
        { name: 'Engaged Users', value: userSegments.engaged },
        { name: 'Power Users', value: userSegments.power }
      ].filter(item => item.value > 0);
    } else {
      return [
        { name: 'Technical', value: userSegments.technical },
        { name: 'Conceptual', value: userSegments.conceptual },
        { name: 'Other', value: userSegments.otherType }
      ].filter(item => item.value > 0);
    }
  };

  useEffect(() => {
    checkAnalyticsTable().then(success => {
      if (success) {
        loadAnalyticsData(); 
      } else {
        console.error('Analytics table check failed. Cannot load data.');
        setLoading(false);
        toast({ title: "Analytics Setup Issue", description: "Could not verify analytics table.", variant: "destructive" });
      }
    });
  }, [dateRange, searchQuery]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const data = await fetchAnalyticsData(dateRange, searchQuery);
      setAnalyticsData(data);

      if (data.length > 0) {
        const topQueriesPeriod = dateRange === '7d' ? 'week' : dateRange === '30d' ? 'month' : 'all';
        setTopQueries(await getTopQueries(topQueriesPeriod));
        setSourceDistribution(generateSourceDistribution(data));
        setSuccessRate(calculateSuccessRate(data));
        setResponseTimeData(generateResponseTimeData(data));
        setFrequentTranscripts(getFrequentlyUsedTranscripts(data));
        setKeywordFrequency(generateKeywordFrequency(data));
        setQueryThemesData(generateQueryThemes(data));
        setInsightfulQueries(identifyInsightfulQueries(data));
        setNonTranscriptSources(trackNonTranscriptSources(data));
        
        const segments = analyzeUserSegments(data);
        setUserSegments(segments);
        
        calculateUserEngagement(data);
      } else {
        setTopQueries([]);
        setSourceDistribution([]);
        setSuccessRate({ success: 0, failure: 0, rate: 0 });
        setResponseTimeData([]);
        setFrequentTranscripts([]);
        setKeywordFrequency([]);
        setQueryThemesData([]);
        setInsightfulQueries([]);
        setNonTranscriptSources({ count: 0, percentage: 0, topQueries: [] });
        setUserSegments({ basic: 0, engaged: 0, power: 0, technical: 0, conceptual: 0, otherType: 0 });
        setUserEngagement({
          uniqueConversations: 0,
          totalQueries: 0,
          avgQueriesPerConversation: 0,
          returnRate: 0
        });
      }
    } catch (error) {
      console.error('Error loading or processing analytics data:', error);
      toast({ title: "Failed to load analytics", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const calculateUserEngagement = (data: AnalyticsData[]) => {
    const conversationCounts: Record<string, number> = {};
    
    data.forEach(item => {
      if (item.conversation_id) {
        conversationCounts[item.conversation_id] = (conversationCounts[item.conversation_id] || 0) + 1;
      }
    });
    
    const uniqueConversations = Object.keys(conversationCounts).length;
    const totalQueries = data.length;
    
    const avgQueriesPerConversation = uniqueConversations > 0 
      ? +(totalQueries / uniqueConversations).toFixed(1) 
      : 0;
    
    const returningConversations = Object.values(conversationCounts).filter(count => count > 1).length;
    const returnRate = uniqueConversations > 0 
      ? Math.round((returningConversations / uniqueConversations) * 100) 
      : 0;
    
    setUserEngagement({
      uniqueConversations,
      totalQueries,
      avgQueriesPerConversation,
      returnRate
    });
  };

  const handleRefresh = () => loadAnalyticsData();

  const generateUsageByHourData = () => {
    const hourCounts = Array(24).fill(0);
    analyticsData.forEach(item => { hourCounts[new Date(item.created_at).getHours()]++; });
    return hourCounts.map((count, hour) => ({ hour: `${hour}:00`, queries: count }));
  };
  
  const generateDailyQueryVolumeData = () => {
    const dailyData: Record<string, number> = {};
    analyticsData.forEach(item => {
      const date = new Date(item.created_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
      dailyData[date] = (dailyData[date] || 0) + 1;
    });
    return Object.entries(dailyData)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, count]) => ({ date, queries: count }));
  };
  
  const getPieData = (generatorFn: () => { name: string; value: number }[]) => {
    try {
      const data = generatorFn();
      return data && data.length > 0 ? data.filter(item => item.value > 0) : [];
    } catch (error) {
      console.error('Error generating pie chart data:', error);
      return []; // Return empty array on error
    }
  };

  const engagementPieData = getPieData(() => generateUserSegmentsPieData('engagement'));
  const queryTypesPieData = getPieData(() => generateUserSegmentsPieData('queryTypes'));
  const sourceDistPieData = getPieData(() => sourceDistribution);

  return (
    <div className="container mx-auto py-6 px-2 sm:px-4 md:px-6">
      <Card className="shadow-lg border">
        <CardHeader className="border-b bg-muted/30 px-4 py-3 sm:px-6">
          <CardTitle className="text-xl sm:text-2xl font-semibold">Analytics Dashboard</CardTitle>
          <CardDescription className="text-sm">AI assistant usage and query patterns.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 px-2 sm:px-4 md:px-6">
          <div className="mb-4 p-3 sm:p-4 bg-muted rounded-lg flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
            <Tabs defaultValue={dateRange} className="w-full md:w-auto">
              <TabsList className="grid grid-cols-3 w-full md:w-auto">
                <TabsTrigger value="7d" onClick={() => setDateRange('7d')}>7 Days</TabsTrigger>
                <TabsTrigger value="30d" onClick={() => setDateRange('30d')}>30 Days</TabsTrigger>
                <TabsTrigger value="all" onClick={() => setDateRange('all')}>All Time</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex w-full md:w-auto items-center space-x-2">
              <Input
                type="text"
                placeholder="Search queries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-grow md:flex-grow-0 md:min-w-[200px] h-9"
              />
              <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading} title="Refresh Data" className="h-9 w-9">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {loading ? (
            <Alert className="flex items-center justify-center min-h-[200px]">
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              <AlertDescription>Loading analytics data...</AlertDescription>
            </Alert>
          ) : !analyticsData || analyticsData.length === 0 ? (
             <Alert variant="destructive" className="flex items-center justify-center min-h-[200px]">
               <AlertDescription>No analytics data available for the selected period/query.</AlertDescription>
             </Alert>
          ) : (
            <Tabs defaultValue="overview" className="space-y-4">
              <ScrollArea className="w-full whitespace-nowrap border-b">
                  <TabsList className="inline-flex h-auto p-1 flex-wrap sm:flex-nowrap">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="engagement">User Engagement</TabsTrigger>
                      <TabsTrigger value="themes">Query Themes</TabsTrigger>
                      <TabsTrigger value="insights">Insightful Queries</TabsTrigger>
                      <TabsTrigger value="usage">Usage Patterns</TabsTrigger>
                      <TabsTrigger value="queries">Top Queries</TabsTrigger>
                      <TabsTrigger value="sources">Source Dist.</TabsTrigger>
                      <TabsTrigger value="transcripts">Top Transcripts</TabsTrigger>
                      <TabsTrigger value="keywords">Top Keywords</TabsTrigger>
                      <TabsTrigger value="external">External Usage</TabsTrigger>
                      <TabsTrigger value="user-segments">User Segments</TabsTrigger>
                  </TabsList>
                  <div className="h-px w-full bg-border" />
              </ScrollArea>

              <TabsContent value="overview" className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader><CardTitle>Total Queries</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold">{analyticsData.length}</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Unique Conversations</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-bold">{userEngagement.uniqueConversations}</div></CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Success Rate</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{successRate.rate}%</div>
                      <div className="text-xs text-muted-foreground">{successRate.success} / {analyticsData.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Avg Response</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {responseTimeData.length > 0
                          ? `${Math.round(responseTimeData.reduce((acc, curr) => acc + curr["Average Response Time (ms)"], 0) / responseTimeData.length)} ms`
                          : 'N/A'}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Query Volume</CardTitle>
                    <CardDescription className="text-sm">Queries per day.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px] sm:h-[350px]">
                    <LineChart data={generateDailyQueryVolumeData()} index="date" categories={["queries"]} colors={["#f59e0b"]} valueFormatter={(v) => `${v}`} showLegend={false} yAxisWidth={30} className="h-full" />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="engagement" className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 mb-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>User Engagement Summary</CardTitle>
                      <CardDescription className="text-sm">Key metrics about user interaction patterns</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted rounded-lg p-4">
                          <p className="text-sm font-medium mb-1">Unique Conversations</p>
                          <p className="text-2xl font-bold">{userEngagement.uniqueConversations}</p>
                        </div>
                        <div className="bg-muted rounded-lg p-4">
                          <p className="text-sm font-medium mb-1">Total Queries</p>
                          <p className="text-2xl font-bold">{userEngagement.totalQueries}</p>
                        </div>
                        <div className="bg-muted rounded-lg p-4">
                          <p className="text-sm font-medium mb-1">Avg Queries/Conv</p>
                          <p className="text-2xl font-bold">{userEngagement.avgQueriesPerConversation}</p>
                        </div>
                        <div className="bg-muted rounded-lg p-4">
                          <p className="text-sm font-medium mb-1">Return Rate</p>
                          <p className="text-2xl font-bold">{userEngagement.returnRate}%</p>
                          <p className="text-xs text-muted-foreground">Users with {'>'} 1 query</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>User Type Distribution</CardTitle>
                      <CardDescription className="text-sm">Based on engagement levels</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[280px] sm:h-[300px]">
                      {engagementPieData && engagementPieData.length > 0 ? (
                        <PieChart 
                          data={engagementPieData} 
                          index="name" 
                          categories={["value"]} 
                          colors={['#0088FE', '#00C49F', '#FFBB28']} 
                          className="h-full" 
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground italic">No data</div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Content Analysis</CardTitle>
                    <CardDescription>Identifying content gaps and opportunities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-muted/50 rounded-lg p-4 border border-muted">
                        <h3 className="font-semibold mb-2">Content Gap Analysis</h3>
                        {nonTranscriptSources.percentage > 0 ? (
                          <p className="text-sm">{nonTranscriptSources.percentage}% of queries ({nonTranscriptSources.count}) required external sources, indicating potential knowledge gaps in transcripts.</p>
                        ) : (
                          <p className="text-sm">No content gaps identified in the current data set.</p>
                        )}
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4 border border-muted">
                        <h3 className="font-semibold mb-2">Most Valuable Content</h3>
                        {frequentTranscripts.length > 0 ? (
                          <p className="text-sm">Most referenced transcript: <strong>{frequentTranscripts[0]?.title}</strong> (used {frequentTranscripts[0]?.count} times)</p>
                        ) : (
                          <p className="text-sm">No transcript usage data available for this period.</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="themes" className="space-y-4 md:space-y-6">
                 <Card>
                   <CardHeader>
                     <CardTitle>Query Theme Distribution</CardTitle>
                     <CardDescription className="text-sm">Frequency of M&A topics.</CardDescription>
                   </CardHeader>
                   <CardContent className="h-[350px] sm:h-[400px]">
                     <BarChart 
                       data={queryThemesData} 
                       index="theme" 
                       categories={["count"]} 
                       colors={["#1E88E5"]} 
                       layout="vertical" 
                       valueFormatter={(v) => `${v}`} 
                       showLegend={false} 
                       yAxisWidth={140} 
                       className="h-full" 
                     />
                   </CardContent>
                 </Card>
               </TabsContent>
               
              <TabsContent value="insights" className="space-y-4 md:space-y-6">
                 <Card>
                   <CardHeader>
                     <CardTitle>Insightful Queries</CardTitle>
                     <CardDescription className="text-sm">Queries flagged based on complexity, novelty, or errors.</CardDescription>
                   </CardHeader>
                   <CardContent>
                     {insightfulQueries.length > 0 ? (
                       <ScrollArea className="h-[400px]"> 
                         <ul className="space-y-3 divide-y">
                           {insightfulQueries.map((item, index) => (
                             <li key={index} className="pt-3 text-sm">
                               <p className="font-medium mb-1">{item.query}</p>
                               <p className="text-xs text-muted-foreground">
                                 Reason: {item.reason} (Score: {item.score}) {item.source ? `[Source: ${item.source}]` : ''}
                                </p>
                             </li>
                           ))}
                         </ul>
                       </ScrollArea>
                     ) : (
                       <p className="text-muted-foreground italic">No insightful queries identified in this period.</p>
                     )}
                   </CardContent>
                 </Card>
               </TabsContent>

              <TabsContent value="usage" className="space-y-4 md:space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Usage by Hour of Day</CardTitle>
                    <CardDescription className="text-sm">Activity pattern (user's local time).</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px] sm:h-[350px]">
                    <BarChart data={generateUsageByHourData()} index="hour" categories={["queries"]} colors={["#82ca9d"]} valueFormatter={(v) => `${v}`} showLegend={false} yAxisWidth={30} className="h-full" />
                  </CardContent>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Conversation Length</CardTitle>
                      <CardDescription className="text-sm">Queries per conversation.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[280px] sm:h-[300px]">
                      {engagementPieData && engagementPieData.length > 0 ? (
                        <PieChart 
                          data={engagementPieData} 
                          index="name" 
                          categories={["value"]} 
                          colors={['#0088FE', '#00C49F', '#FFBB28']} 
                          className="h-full" 
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground italic">No data</div>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Query Types</CardTitle>
                      <CardDescription className="text-sm">Breakdown by content focus.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[280px] sm:h-[300px]">
                      {queryTypesPieData && queryTypesPieData.length > 0 ? (
                         <PieChart 
                           data={queryTypesPieData} 
                           index="name" 
                           categories={["value"]} 
                           colors={['#FF8042', '#8884d8', '#A9A9A9']} 
                           className="h-full" 
                         />
                       ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground italic">No data</div>
                       )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="queries">
                <Card>
                  <CardHeader><CardTitle>Top {topQueries.length} Queries</CardTitle></CardHeader>
                  <CardContent><ScrollArea className="h-[400px]"><ul className="space-y-2 divide-y pr-3">{topQueries.map((item, index) => (<li key={index} className="pt-2 text-sm"><span className="font-medium">({item.count})</span> {item.query}</li>))}</ul></ScrollArea></CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sources">
                <Card>
                  <CardHeader><CardTitle>Source Distribution</CardTitle></CardHeader>
                  <CardContent className="h-[300px] sm:h-[350px]">
                     {sourceDistPieData && sourceDistPieData.length > 0 ? (
                         <PieChart 
                           data={sourceDistPieData} 
                           index="name" 
                           categories={["value"]} 
                           colors={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#A9A9A9']} 
                           className="h-full" 
                         />
                     ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground italic">No data</div>
                     )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transcripts">
                <Card>
                  <CardHeader><CardTitle>Top {frequentTranscripts.length} Transcripts</CardTitle></CardHeader>
                  <CardContent><ScrollArea className="h-[400px]"><ul className="space-y-2 divide-y pr-3">{frequentTranscripts.map((item, index) => (<li key={index} className="pt-2 text-sm"><span className="font-medium">({item.count})</span> {item.title} <span className="text-muted-foreground">({item.source || 'Unknown'})</span></li>))}</ul></ScrollArea></CardContent>
                </Card>
              </TabsContent>
               
              <TabsContent value="keywords">
                <Card>
                  <CardHeader><CardTitle>Top {keywordFrequency.length} Keywords</CardTitle></CardHeader>
                  <CardContent><ScrollArea className="h-[400px]"><ul className="space-y-2 divide-y pr-3">{keywordFrequency.map((item, index) => (<li key={index} className="pt-2 text-sm"><span className="font-medium">({item.count})</span> {item.word}</li>))}</ul></ScrollArea></CardContent>
                </Card>
              </TabsContent>
               
              <TabsContent value="external">
                <Card>
                  <CardHeader><CardTitle>External Source Usage</CardTitle></CardHeader>
                  <CardContent>
                    <p className="mb-2">Used <span className="font-bold">{nonTranscriptSources.count}</span> times ({nonTranscriptSources.percentage}% of total).</p>
                    <h4 className="font-semibold mb-1 text-sm">Top {nonTranscriptSources.topQueries.length} Queries Triggering External:</h4>
                    <ScrollArea className="h-[300px]"><ul className="space-y-2 divide-y pr-3">{nonTranscriptSources.topQueries.map((item, index) => (<li key={index} className="pt-2 text-xs"><span className="font-medium">({item.count})</span> {item.query}</li>))}</ul></ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
               
              <TabsContent value="user-segments" className="space-y-4 md:space-y-6">
                <Card>
                  <CardHeader><CardTitle>User Segments Analysis</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                      <div className="bg-muted rounded-lg p-3 border"><h3 className="font-semibold mb-1 text-sm">Engagement</h3><ul className="space-y-1 text-xs"><li className="flex justify-between"><span>Basic:</span><span className="font-medium">{userSegments.basic}</span></li><li className="flex justify-between"><span>Engaged:</span><span className="font-medium">{userSegments.engaged}</span></li><li className="flex justify-between"><span>Power:</span><span className="font-medium">{userSegments.power}</span></li></ul></div>
                      <div className="bg-muted rounded-lg p-3 border"><h3 className="font-semibold mb-1 text-sm">Query Type Focus</h3><ul className="space-y-1 text-xs"><li className="flex justify-between"><span>Technical:</span><span className="font-medium">{userSegments.technical}</span></li><li className="flex justify-between"><span>Conceptual:</span><span className="font-medium">{userSegments.conceptual}</span></li><li className="flex justify-between"><span>Other/Mixed:</span><span className="font-medium">{userSegments.otherType}</span></li></ul></div>
                      <div className="bg-muted rounded-lg p-3 border"><h3 className="font-semibold mb-1 text-sm">Suggestion</h3><p className="text-xs">{userSegments.technical > userSegments.conceptual ? "Focus seems more technical. Review coverage." : "Focus seems more conceptual. Ensure explanations clear."}</p></div>
                    </div>
                    <div>
                      <h3 className="text-md font-semibold mb-2 border-t pt-4">Insights & Recommendations</h3>
                      <div className="bg-muted rounded-lg p-4 border"><ul className="list-disc pl-4 space-y-1 text-sm">{/* Insights logic remains */}<li>{userSegments.power > (userSegments.basic + userSegments.engaged) / 5 && userSegments.power > 3 ? "Good power user ratio." : "Low power user ratio."}</li><li>{nonTranscriptSources.percentage > 25 ? `High external usage (${nonTranscriptSources.percentage}%). Expand knowledge base.` : "Low external usage."}</li></ul></div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
