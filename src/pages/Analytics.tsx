
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Search, FilterIcon, FileDown } from 'lucide-react';
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
import { LineChart, BarChart, PieChart, DataPoint } from '@/components/ui/charts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/components/ui/use-toast";
import AiInsights from "@/components/analytics/AiInsights";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

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

const Analytics = () => {
  const { toast } = useToast();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [topQueries, setTopQueries] = useState<{ query: string; count: number }[]>([]);
  const [sourceDistribution, setSourceDistribution] = useState<{ name: string; value: number }[]>([]);
  const [successRate, setSuccessRate] = useState<{ success: number; failure: number; rate: number }>({ success: 0, failure: 0, rate: 0 });
  const [responseTimeData, setResponseTimeData] = useState<{ date: string; "Average Response Time (ms)": number }[]>([]);
  const [frequentTranscripts, setFrequentTranscripts] = useState<{ title: string; count: number; source: string | null }[]>([]);
  const [keywordFrequency, setKeywordFrequency] = useState<{ word: string; count: number }[]>([]);
  const [queryThemesData, setQueryThemesData] = useState<any[]>([]);
  const [insightfulQueries, setInsightfulQueries] = useState<any[]>([]);
  const [nonTranscriptSources, setNonTranscriptSources] = useState<{ count: number; percentage: number; topQueries: { query: string; count: number }[] }>({ count: 0, percentage: 0, topQueries: [] });
  const [userSegments, setUserSegments] = useState<{ basic: number; engaged: number; power: number; technical: number; conceptual: number; otherType: number; }>({ basic: 0, engaged: 0, power: 0, technical: 0, conceptual: 0, otherType: 0 });
  const [userEngagement, setUserEngagement] = useState<any>({
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

  const generateUsageByHourData = (): DataPoint[] => {
    const hourCounts = Array(24).fill(0);
    analyticsData.forEach(item => { 
      const hour = new Date(item.created_at).getHours();
      if (hour >= 0 && hour < 24) {
        hourCounts[hour]++;
      }
    });
    return hourCounts.map((count, hour) => ({ 
      hour: `${hour}:00`, 
      queries: count 
    }));
  };
  
  const generateDailyQueryVolumeData = (): DataPoint[] => {
    const dailyData: Record<string, number> = {};
    analyticsData.forEach(item => {
      const date = new Date(item.created_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
      dailyData[date] = (dailyData[date] || 0) + 1;
    });
    return Object.entries(dailyData)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, count]) => ({ date, queries: count }));
  };
  
  const getPieData = (generatorFn: () => { name: string; value: number }[]): DataPoint[] => {
    try {
      const data = generatorFn();
      return data && data.length > 0 ? data.filter(item => item.value > 0).map(item => ({
        name: item.name,
        value: item.value
      })) : [];
    } catch (error) {
      console.error('Error generating pie chart data:', error);
      return []; // Return empty array on error
    }
  };

  const engagementPieData = getPieData(() => generateUserSegmentsPieData('engagement'));
  const queryTypesPieData = getPieData(() => generateUserSegmentsPieData('queryTypes'));
  const sourceDistPieData = getPieData(() => sourceDistribution);
  
  const exportData = (type: string) => {
    let dataToExport: any[] = [];
    let filename = `analytics-${type}-${new Date().toISOString().split('T')[0]}.csv`;
    
    switch (type) {
      case 'queries':
        dataToExport = topQueries.map(q => ({
          Query: q.query,
          Count: q.count
        }));
        break;
      case 'keywords':
        dataToExport = keywordFrequency.map(k => ({
          Keyword: k.word,
          Count: k.count
        }));
        break;
      case 'full':
        dataToExport = analyticsData.map(item => ({
          Date: new Date(item.created_at).toLocaleString(),
          Query: item.query,
          Source: item.source_type || 'Unknown',
          Success: item.successful ? 'Yes' : 'No',
          ResponseLength: item.response_length || 0,
          ResponseTime: (item.api_time_ms || 0) + (item.search_time_ms || 0),
          Conversation: item.conversation_id || 'None',
          Transcript: item.transcript_title || 'None'
        }));
        break;
      default:
        return;
    }
    
    if (dataToExport.length === 0) {
      toast({ title: "No data to export", description: "The selected data is empty" });
      return;
    }
    
    // Convert to CSV
    const headers = Object.keys(dataToExport[0]);
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(row => 
        headers.map(header => {
          const cell = row[header]?.toString() || '';
          return `"${cell.replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Export successful", description: `Data exported to ${filename}` });
  };

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
      <Card className="shadow-lg border flex-1 flex flex-col overflow-hidden">
        <CardHeader className="border-b bg-muted/30 px-4 py-3 sm:px-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl sm:text-2xl font-semibold">Analytics Dashboard</CardTitle>
              <CardDescription className="text-sm">AI assistant usage and query patterns.</CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <FileDown className="h-4 w-4 mr-1" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportData('queries')}>Export Top Queries</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportData('keywords')}>Export Keywords</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportData('full')}>Export All Data</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-4 px-2 sm:px-4 md:px-6 flex-1 flex flex-col overflow-hidden">
          <div className="mb-4 p-3 sm:p-4 bg-muted rounded-lg flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 flex-shrink-0">
            <Tabs defaultValue={dateRange} className="w-full md:w-auto">
              <TabsList className="grid grid-cols-3 w-full md:w-auto">
                <TabsTrigger value="7d" onClick={() => setDateRange('7d')}>7 Days</TabsTrigger>
                <TabsTrigger value="30d" onClick={() => setDateRange('30d')}>30 Days</TabsTrigger>
                <TabsTrigger value="all" onClick={() => setDateRange('all')}>All Time</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex w-full md:w-auto items-center space-x-2">
              <div className="relative flex-grow md:flex-grow-0 md:w-[200px]">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search queries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading} title="Refresh Data" className="h-9 w-9">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {loading ? (
            <Alert className="flex items-center justify-center min-h-[200px] flex-shrink-0">
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              <AlertDescription>Loading analytics data...</AlertDescription>
            </Alert>
          ) : !analyticsData || analyticsData.length === 0 ? (
             <Alert variant="destructive" className="flex items-center justify-center min-h-[200px] flex-shrink-0">
               <AlertDescription>No analytics data available for the selected period/query.</AlertDescription>
             </Alert>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col">
              <Tabs defaultValue="overview" className="w-full h-full flex flex-col">
                <div className="flex-shrink-0 border-b pb-1 mb-4 overflow-x-auto">
                  <TabsList className="h-9 px-1">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="user-activity">User Activity</TabsTrigger>
                    <TabsTrigger value="content-analysis">Content Analysis</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 pb-4">
                  <TabsContent value="overview" className="mt-0 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="py-4"><CardTitle>Total Queries</CardTitle></CardHeader>
                        <CardContent className="pt-0"><div className="text-3xl font-bold">{analyticsData.length}</div></CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="py-4"><CardTitle>Unique Conversations</CardTitle></CardHeader>
                        <CardContent className="pt-0"><div className="text-3xl font-bold">{userEngagement.uniqueConversations}</div></CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="py-4"><CardTitle>Success Rate</CardTitle></CardHeader>
                        <CardContent className="pt-0">
                          <div className="text-3xl font-bold">{successRate.rate}%</div>
                          <div className="text-xs text-muted-foreground">{successRate.success} / {analyticsData.length}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="py-4"><CardTitle>Avg Response</CardTitle></CardHeader>
                        <CardContent className="pt-0">
                          <div className="text-3xl font-bold">
                            {responseTimeData.length > 0
                              ? `${Math.round(responseTimeData.reduce((acc, curr) => acc + curr["Average Response Time (ms)"], 0) / responseTimeData.length)} ms`
                              : 'N/A'}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <Card className="overflow-hidden">
                        <CardHeader className="py-4">
                          <CardTitle>Daily Query Volume</CardTitle>
                          <CardDescription className="text-sm">Queries per day</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px] pt-0">
                          <LineChart 
                            data={generateDailyQueryVolumeData()} 
                            index="date" 
                            categories={["queries"]} 
                            colors={["#f59e0b"]} 
                            valueFormatter={(v) => `${v}`} 
                            showLegend={false} 
                            className="h-full" 
                          />
                        </CardContent>
                      </Card>
                      <Card className="overflow-hidden">
                        <CardHeader className="py-4">
                          <CardTitle>Source Distribution</CardTitle>
                          <CardDescription className="text-sm">Information source by type</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px] pt-0">
                          {sourceDistPieData && sourceDistPieData.length > 0 ? (
                            <PieChart 
                              data={sourceDistPieData} 
                              index="name" 
                              categories={["value"]} 
                              colors={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']} 
                              className="h-full" 
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground italic">No data available</div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="py-4">
                          <CardTitle className="flex items-center justify-between">
                            <span>Top Queries</span>
                            <Badge variant="outline" className="ml-auto text-xs">{topQueries.length}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[200px] pt-0">
                          <ScrollArea className="h-full pr-4">
                            <ul className="space-y-1">
                              {topQueries.slice(0, 8).map((item, index) => (
                                <li key={index} className="text-sm">
                                  <span className="font-medium text-xs mr-1">({item.count})</span> {item.query}
                                </li>
                              ))}
                            </ul>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="py-4">
                          <CardTitle className="flex items-center justify-between">
                            <span>Top Transcripts</span>
                            <Badge variant="outline" className="ml-auto text-xs">{frequentTranscripts.length}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[200px] pt-0">
                          <ScrollArea className="h-full pr-4">
                            <ul className="space-y-1">
                              {frequentTranscripts.slice(0, 8).map((item, index) => (
                                <li key={index} className="text-sm">
                                  <span className="font-medium text-xs mr-1">({item.count})</span> {item.title}
                                </li>
                              ))}
                            </ul>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="py-4">
                          <CardTitle className="flex items-center justify-between">
                            <span>Top Keywords</span>
                            <Badge variant="outline" className="ml-auto text-xs">{keywordFrequency.length}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[200px] pt-0">
                          <ScrollArea className="h-full pr-4">
                            <ul className="space-y-1">
                              {keywordFrequency.slice(0, 8).map((item, index) => (
                                <li key={index} className="text-sm">
                                  <span className="font-medium text-xs mr-1">({item.count})</span> {item.word}
                                </li>
                              ))}
                            </ul>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="user-activity" className="mt-0 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="py-4">
                          <CardTitle>User Engagement Summary</CardTitle>
                          <CardDescription>How users interact with the platform</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-0">
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
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="py-4">
                          <CardTitle>User Type Distribution</CardTitle>
                          <CardDescription>Breakdown by user engagement level</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[260px] pt-0">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="py-4">
                          <CardTitle>Usage by Hour of Day</CardTitle>
                          <CardDescription>Activity pattern (user's local time)</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[280px] pt-0">
                          <BarChart 
                            data={generateUsageByHourData()} 
                            index="hour" 
                            categories={["queries"]} 
                            colors={["#82ca9d"]} 
                            valueFormatter={(v) => `${v}`} 
                            showLegend={false} 
                            className="h-full" 
                          />
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="py-4">
                          <CardTitle>Query Types</CardTitle>
                          <CardDescription>Breakdown by content focus</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[280px] pt-0">
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
                  
                  <TabsContent value="content-analysis" className="mt-0 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="py-4">
                          <CardTitle>Query Theme Distribution</CardTitle>
                          <CardDescription>Frequency of M&A topics</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[360px] pt-0">
                          <BarChart 
                            data={queryThemesData as DataPoint[]}
                            index="theme" 
                            categories={["count"]} 
                            colors={["#1E88E5"]} 
                            layout="vertical" 
                            valueFormatter={(v) => `${v}`} 
                            showLegend={false} 
                            className="h-full" 
                          />
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="py-4">
                          <CardTitle>Content Gap Analysis</CardTitle>
                          <CardDescription>External source usage and gaps</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="bg-muted rounded-lg p-4 mb-4">
                            <div className="flex justify-between mb-2">
                              <p className="text-sm font-medium">External Source Usage</p>
                              <p className="text-sm font-bold">{nonTranscriptSources.percentage}%</p>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {nonTranscriptSources.count} of {analyticsData.length} queries required external sources
                            </p>
                            <div className="w-full bg-muted-foreground/20 rounded-full h-2">
                              <div 
                                className="bg-primary rounded-full h-2" 
                                style={{ width: `${nonTranscriptSources.percentage}%` }} 
                              />
                            </div>
                          </div>
                          <h4 className="text-sm font-medium mb-2">Top Queries Needing External Sources:</h4>
                          <ScrollArea className="h-[216px] pr-4">
                            <ul className="space-y-2">
                              {nonTranscriptSources.topQueries.map((item, index) => (
                                <li key={index} className="text-xs border-l-2 border-primary pl-2">
                                  <span className="font-medium">({item.count})</span> {item.query}
                                </li>
                              ))}
                            </ul>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <Card>
                        <CardHeader className="py-4">
                          <CardTitle>Insightful Queries Analysis</CardTitle>
                          <CardDescription>Complex, novel or problematic queries</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <ScrollArea className="h-[200px]"> 
                            <ul className="space-y-3 pr-4">
                              {insightfulQueries.map((item, index) => (
                                <li key={index} className="text-sm">
                                  <div className="flex justify-between items-start">
                                    <p className="font-medium">{item.query}</p>
                                    <Badge variant="outline" className="ml-2">{item.score}</Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {item.reason} {item.source ? `[Source: ${item.source}]` : ''}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="performance" className="mt-0 space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <Card>
                        <CardHeader className="py-4">
                          <CardTitle>Response Time Trend</CardTitle>
                          <CardDescription>Average response time in milliseconds</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px] pt-0">
                          <LineChart 
                            data={responseTimeData} 
                            index="date" 
                            categories={["Average Response Time (ms)"]} 
                            colors={["#0088FE"]} 
                            valueFormatter={(v) => `${v} ms`} 
                            showLegend={false} 
                            className="h-full" 
                          />
                        </CardContent>
                      </Card>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="py-4">
                          <CardTitle>Success Rate Analysis</CardTitle>
                          <CardDescription>Query success vs failure breakdown</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-0">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Success Rate</p>
                              <p className="text-3xl font-bold">{successRate.rate}%</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center">
                                <div className="text-lg font-bold text-green-500">{successRate.success}</div>
                                <p className="text-xs text-muted-foreground">Successful</p>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold text-red-500">{successRate.failure}</div>
                                <p className="text-xs text-muted-foreground">Failed</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="w-full bg-muted-foreground/20 rounded-full h-3 mt-2">
                            <div 
                              className="bg-green-500 rounded-full h-3" 
                              style={{ width: `${successRate.rate}%` }} 
                            />
                          </div>
                          
                          <div className="bg-muted p-4 rounded-lg mt-4">
                            <h4 className="text-sm font-medium mb-2">Success Rate by Source Type</h4>
                            <ul className="space-y-2">
                              {Object.entries(getSourceSuccessRates(analyticsData)).map(([source, rate]) => (
                                <li key={source} className="flex justify-between text-xs">
                                  <span>{formatSourceName(source)}</span>
                                  <span className="font-medium">{rate}%</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="py-4">
                          <CardTitle>Source Distribution</CardTitle>
                          <CardDescription>Information sources by type</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px] pt-0">
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
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="ai-insights" className="mt-0">
                    <AiInsights dateRange={dateRange} />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Format source name for display
function formatSourceName(source: string): string {
  return (source.charAt(0).toUpperCase() + source.slice(1))
    .replace(/_/g, ' ')
    .replace(/ call$/i, ' Call')
    .replace(/^Sba$/i, 'SBA');
}

// Calculate success rates by source type
function getSourceSuccessRates(data: AnalyticsData[]) {
  const sourceCounts: Record<string, { success: number, total: number }> = {};
  
  data.forEach(item => {
    const source = item.source_type || 'unknown';
    if (!sourceCounts[source]) {
      sourceCounts[source] = { success: 0, total: 0 };
    }
    sourceCounts[source].total++;
    if (item.successful === true) {
      sourceCounts[source].success++;
    }
  });
  
  const rates: Record<string, number> = {};
  Object.entries(sourceCounts).forEach(([source, counts]) => {
    rates[source] = Math.round((counts.success / counts.total) * 100);
  });
  
  return rates;
}

export default Analytics;
