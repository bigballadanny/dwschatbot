import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, PieChart } from '@/components/ui/charts';
import { getTranscriptCounts } from '@/utils/transcriptUtils';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

const Analytics = () => {
  const [dateRange, setDateRange] = useState('7d'); // '7d', '30d', 'all'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['chat-analytics', dateRange, searchQuery],
    queryFn: async () => {
      // Calculate date range
      let dateFilter = '';
      if (dateRange === '7d') {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        dateFilter = date.toISOString();
      } else if (dateRange === '30d') {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        dateFilter = date.toISOString();
      }
      
      let query = supabase
        .from('chat_analytics')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Apply date filter if needed
      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }
      
      // Apply search filter if needed
      if (searchQuery) {
        query = query.ilike('query', `%${searchQuery}%`);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching analytics:', error);
        return [];
      }
      
      return data;
    },
    enabled: true,
    refetchInterval: 60000, // Refresh every minute
  });
  
  // Fetch transcript data
  const { data: transcripts } = useQuery({
    queryKey: ['transcripts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transcripts')
        .select('id, title, source, created_at, content');
        
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
    queryFn: async () => {
      const timePeriod = dateRange === '7d' 
        ? 'week' 
        : dateRange === '30d' 
          ? 'month'
          : 'all';
          
      const { data, error } = await supabase.rpc('get_top_queries', { 
        time_period: timePeriod === 'all' ? null : timePeriod,
        limit_count: 10
      });
      
      if (error) {
        console.error('Error fetching top queries:', error);
        return [];
      }
      
      return data || [];
    },
  });
  
  // Calculate some analytics
  const transcriptCounts = React.useMemo(() => {
    return getTranscriptCounts(transcripts || []);
  }, [transcripts]);
  
  // Generate chart data
  const sourceDistribution = React.useMemo(() => {
    if (!analyticsData) return [];
    
    const sources: {[key: string]: number} = {};
    analyticsData.forEach(item => {
      const source = item.source_type || 'unknown';
      if (sources[source]) {
        sources[source]++;
      } else {
        sources[source] = 1;
      }
    });
    
    return Object.entries(sources).map(([name, value]) => ({ name, value }));
  }, [analyticsData]);
  
  // Success rate data
  const successRate = React.useMemo(() => {
    if (!analyticsData) return { success: 0, failure: 0, rate: 0 };
    
    const success = analyticsData.filter(item => item.successful).length;
    const total = analyticsData.length;
    const rate = total > 0 ? Math.round((success / total) * 100) : 0;
    
    return {
      success,
      failure: total - success,
      rate
    };
  }, [analyticsData]);
  
  // Response time data
  const responseTimeData = React.useMemo(() => {
    if (!analyticsData) return [];
    
    const dailyData: {[key: string]: {count: number, total: number}} = {};
    
    analyticsData.forEach(item => {
      if (item.search_time_ms && item.api_time_ms) {
        const date = new Date(item.created_at).toLocaleDateString();
        if (!dailyData[date]) {
          dailyData[date] = { count: 0, total: 0 };
        }
        dailyData[date].count++;
        dailyData[date].total += (item.search_time_ms + item.api_time_ms);
      }
    });
    
    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        "Average Response Time (ms)": Math.round(data.total / data.count)
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [analyticsData]);
  
  // Recent queries
  const recentQueries = React.useMemo(() => {
    if (!analyticsData) return [];
    return analyticsData.slice(0, 10);
  }, [analyticsData]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          
          <div className="flex gap-4">
            <Tabs value={dateRange} onValueChange={setDateRange}>
              <TabsList>
                <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
                <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
                <TabsTrigger value="all">All Time</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="relative">
              <Input
                placeholder="Search queries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-8"
              />
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
              <div className="flex gap-4 mt-2 text-sm">
                <span>Protege: {transcriptCounts.protege_call}</span>
                <span>Foundations: {transcriptCounts.foundations_call}</span>
                <span>Mastermind: {transcriptCounts.mastermind_call}</span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Source Distribution</CardTitle>
              <CardDescription>Types of content sources used in responses</CardDescription>
            </CardHeader>
            <CardContent>
              <PieChart
                data={sourceDistribution}
                index="name"
                categories={['value']}
                valueFormatter={(value) => `${value} queries`}
                colors={['indigo', 'blue', 'violet', 'teal', 'rose', 'amber', 'lime']}
                className="h-80"
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Response Time Trend</CardTitle>
              <CardDescription>Average response time in milliseconds</CardDescription>
            </CardHeader>
            <CardContent>
              <LineChart
                data={responseTimeData}
                index="date"
                categories={["Average Response Time (ms)"]}
                colors={["green"]}
                className="h-80"
                showLegend={false}
              />
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <div className="flex-1">
                        <p className="text-sm font-medium">{query.query}</p>
                        <p className="text-xs text-muted-foreground">{query.count} times</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No data available yet</p>
              )}
            </CardContent>
          </Card>
          
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
                      <div className="flex justify-between">
                        <p className="text-sm font-medium">{query.query}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${query.successful ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                          {query.successful ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(query.created_at).toLocaleString()} • 
                        {query.source_type && ` Source: ${query.source_type}`}
                      </p>
                      <Separator className="my-1" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No recent queries</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Analytics;
