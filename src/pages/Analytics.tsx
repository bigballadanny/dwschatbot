import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer, Cell } from 'recharts';
import { Download, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchAnalyticsData, getTopQueries, generateSourceDistribution, calculateSuccessRate, generateResponseTimeData, getFrequentlyUsedTranscripts, generateKeywordFrequency, trackNonTranscriptSources, analyzeUserSegments } from '@/utils/analyticsUtils';
import { checkAnalyticsTable } from '@/utils/analyticsDbCheck';
import Header from '@/components/Header';
import ChatSidebar from '@/components/ChatSidebar';

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
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [topQueries, setTopQueries] = useState<{ query: string; count: number }[]>([]);
  const [sourceDistribution, setSourceDistribution] = useState<{ name: string; value: number }[]>([]);
  const [successRate, setSuccessRate] = useState<{ success: number; failure: number; rate: number }>({ success: 0, failure: 0, rate: 0 });
  const [responseTimeData, setResponseTimeData] = useState<{ date: string; "Average Response Time (ms)": number }[]>([]);
  const [frequentTranscripts, setFrequentTranscripts] = useState<{ title: string; count: number; source: string | null }[]>([]);
  const [keywordFrequency, setKeywordFrequency] = useState<{ word: string; count: number }[]>([]);
  const [nonTranscriptSources, setNonTranscriptSources] = useState<{ count: number; percentage: number; topQueries: { query: string; count: number }[] }>({ count: 0, percentage: 0, topQueries: [] });
  const [userSegments, setUserSegments] = useState<{ basic: number; engaged: number; power: number; technical: number; conceptual: number }>({ basic: 0, engaged: 0, power: 0, technical: 0, conceptual: 0 });
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    if (analyticsData.length > 0) {
      loadAnalyticsData();
    }
  }, [dateRange, searchQuery]);

  useEffect(() => {
    checkAnalyticsTable().then(success => {
      if (success) {
        console.log('Analytics table is ready');
        loadAnalyticsData();
      } else {
        console.error('Analytics table setup failed');
      }
    });
  }, []);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      console.log('Loading analytics data...');
      const data = await fetchAnalyticsData(dateRange, searchQuery);
      console.log(`Loaded ${data.length} analytics records`);
      setAnalyticsData(data);

      if (data.length > 0) {
        const topQueriesData = await getTopQueries(dateRange === 'all' ? 'all' : 'week');
        setTopQueries(topQueriesData);

        const sourceDist = generateSourceDistribution(data);
        setSourceDistribution(sourceDist);

        const success = calculateSuccessRate(data);
        setSuccessRate(success);

        const timeData = generateResponseTimeData(data);
        setResponseTimeData(timeData);

        const transcripts = getFrequentlyUsedTranscripts(data);
        setFrequentTranscripts(transcripts);

        const keywords = generateKeywordFrequency(data);
        setKeywordFrequency(keywords);

        const nonTranscript = trackNonTranscriptSources(data);
        setNonTranscriptSources(nonTranscript);

        const segments = analyzeUserSegments(data);
        setUserSegments(segments);
      } else {
        console.log('No analytics data found');
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadAnalyticsData();
  };

  const handleDownload = () => {
    if (analyticsData.length === 0) {
      return;
    }
    const csvData = convertToCSV(analyticsData);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analytics_data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const convertToCSV = (data: AnalyticsData[]) => {
    if (data.length === 0) return '';
    const header = Object.keys(data[0]).join(',');
    const rows = data.map(item => Object.values(item).join(','));
    return `${header}\n${rows.join('\n')}`;
  };

  return (
    <div className="flex h-screen">
      <ChatSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header />
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto py-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Analytics Dashboard</CardTitle>
                <CardDescription>Overview of chat analytics and usage patterns.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center justify-between">
                  <Tabs defaultValue={dateRange} className="w-[300px]">
                    <TabsList>
                      <TabsTrigger value="7d" onClick={() => setDateRange('7d')}>Last 7 Days</TabsTrigger>
                      <TabsTrigger value="30d" onClick={() => setDateRange('30d')}>Last 30 Days</TabsTrigger>
                      <TabsTrigger value="all" onClick={() => setDateRange('all')}>All Time</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="text"
                      placeholder="Search queries..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload} disabled={loading || analyticsData.length === 0}>
                      <Download className="h-4 w-4 mr-2" />
                      Download CSV
                    </Button>
                  </div>
                </div>

                {loading ? (
                  <Alert>
                    <AlertDescription>Loading analytics data...</AlertDescription>
                  </Alert>
                ) : analyticsData.length === 0 ? (
                  <Alert>
                    <AlertDescription>No analytics data available for the selected range.</AlertDescription>
                  </Alert>
                ) : (
                  <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList>
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="queries">Top Queries</TabsTrigger>
                      <TabsTrigger value="sources">Source Distribution</TabsTrigger>
                      <TabsTrigger value="transcripts">Frequent Transcripts</TabsTrigger>
                      <TabsTrigger value="keywords">Keyword Frequency</TabsTrigger>
                      <TabsTrigger value="external">External Sources</TabsTrigger>
                      <TabsTrigger value="user-segments">User Segments</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Success Rate</CardTitle>
                            <CardDescription>Percentage of successful queries.</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="text-4xl font-bold">{successRate.rate}%</div>
                            <div className="text-sm text-muted-foreground">
                              {successRate.success} successful / {analyticsData.length} total
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle>Total Queries</CardTitle>
                            <CardDescription>Number of queries in the selected range.</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="text-4xl font-bold">{analyticsData.length}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle>Average Response Time</CardTitle>
                            <CardDescription>Average time for a response (ms).</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="text-4xl font-bold">
                              {responseTimeData.length > 0
                                ? Math.round(responseTimeData.reduce((acc, curr) => acc + curr["Average Response Time (ms)"], 0) / responseTimeData.length)
                                : 0} ms
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      <Card>
                        <CardHeader>
                          <CardTitle>Response Time Trend</CardTitle>
                          <CardDescription>Average response time over time.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={responseTimeData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="Average Response Time (ms)" stroke="#82ca9d" />
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="queries" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Top Queries</CardTitle>
                          <CardDescription>Most frequent queries in the selected range.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ul>
                            {topQueries.map((item, index) => (
                              <li key={index} className="py-2">
                                {item.query} - {item.count} times
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="sources" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Source Distribution</CardTitle>
                          <CardDescription>Distribution of response sources.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                dataKey="value"
                                data={sourceDistribution}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                label
                              >
                                {sourceDistribution.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="transcripts" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Frequently Used Transcripts</CardTitle>
                          <CardDescription>Most frequently referenced transcripts.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ul>
                            {frequentTranscripts.map((item, index) => (
                              <li key={index} className="py-2">
                                {item.title} ({item.source}) - {item.count} times
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="keywords" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Keyword Frequency</CardTitle>
                          <CardDescription>Most frequent keywords in user queries.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ul>
                            {keywordFrequency.map((item, index) => (
                              <li key={index} className="py-2">
                                {item.word} - {item.count} times
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="external" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>External Source Usage</CardTitle>
                          <CardDescription>Usage of sources outside of transcripts.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p>
                            External sources were used {nonTranscriptSources.count} times (
                            {nonTranscriptSources.percentage}%)
                          </p>
                          <p>Top queries using external sources:</p>
                          <ul>
                            {nonTranscriptSources.topQueries.map((item, index) => (
                              <li key={index} className="py-2">
                                {item.query} - {item.count} times
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    {/* New User Segments tab */}
                    <TabsContent value="user-segments" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>User Segments Analysis</CardTitle>
                          <CardDescription>Understanding how users interact with the AI assistant.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-muted rounded-lg p-4">
                              <h3 className="text-lg font-medium mb-2">Engagement Level</h3>
                              <ul className="space-y-2">
                                <li className="flex justify-between">
                                  <span>Basic (1-2 queries):</span>
                                  <span className="font-medium">{userSegments.basic}</span>
                                </li>
                                <li className="flex justify-between">
                                  <span>Engaged (3-5 queries):</span>
                                  <span className="font-medium">{userSegments.engaged}</span>
                                </li>
                                <li className="flex justify-between">
                                  <span>Power (6+ queries):</span>
                                  <span className="font-medium">{userSegments.power}</span>
                                </li>
                              </ul>
                            </div>
                            
                            <div className="bg-muted rounded-lg p-4">
                              <h3 className="text-lg font-medium mb-2">Query Types</h3>
                              <ul className="space-y-2">
                                <li className="flex justify-between">
                                  <span>Technical Queries:</span>
                                  <span className="font-medium">{userSegments.technical}</span>
                                </li>
                                <li className="flex justify-between">
                                  <span>Conceptual Queries:</span>
                                  <span className="font-medium">{userSegments.conceptual}</span>
                                </li>
                              </ul>
                            </div>
                            
                            <div className="bg-muted rounded-lg p-4">
                              <h3 className="text-lg font-medium mb-2">Suggestion</h3>
                              <p className="text-sm">
                                {userSegments.technical > userSegments.conceptual ? 
                                  "Users are asking more technical questions. Consider enhancing technical content." : 
                                  "Users are asking more conceptual questions. Consider improving educational content."}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-6">
                            <h3 className="text-lg font-medium mb-2">Insights & Recommendations</h3>
                            <div className="bg-muted rounded-lg p-4">
                              <ul className="list-disc pl-5 space-y-2">
                                <li>
                                  {userSegments.power > (userSegments.basic + userSegments.engaged) / 4 ? 
                                    "High proportion of power users suggests strong engagement. Consider adding advanced features." : 
                                    "Low power user count. Consider simplifying the interface or adding more guided experiences."}
                                </li>
                                <li>
                                  {nonTranscriptSources.percentage > 30 ? 
                                    "High external source usage (>30%). Consider expanding your transcript database." : 
                                    "Low external source usage. Your transcript content appears to be comprehensive."}
                                </li>
                              </ul>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
