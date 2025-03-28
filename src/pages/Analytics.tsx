
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, PieChart, BarChart } from '@/components/ui/charts';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw, AlertCircle, Info, BarChart3, Zap, Database, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  fetchAnalyticsData, 
  getTopQueries, 
  generateSourceDistribution, 
  calculateSuccessRate, 
  generateResponseTimeData,
  generateKeywordFrequency,
  trackNonTranscriptSources,
} from '@/utils/analyticsUtils';
import { 
  validateAnalyticsTable, 
  checkForExistingData, 
  insertSampleData,
  migrateConversationDataToAnalytics 
} from '@/utils/analyticsDbCheck';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const Analytics = () => {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTableValidated, setIsTableValidated] = useState(false);
  const [existingDataCount, setExistingDataCount] = useState(0);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [isMigratingData, setIsMigratingData] = useState(false);
  const { toast } = useToast();
  
  // Validate the analytics table on component mount
  useEffect(() => {
    const validateTable = async () => {
      const isValid = await validateAnalyticsTable();
      setIsTableValidated(isValid);
      
      if (isValid) {
        const count = await checkForExistingData();
        setExistingDataCount(count);
      }
    };
    
    validateTable();
  }, []);
  
  // Fetch analytics data
  const { data: analyticsData, isLoading: analyticsLoading, refetch: refetchAnalytics, isError } = useQuery({
    queryKey: ['chat-analytics', dateRange, searchQuery],
    queryFn: () => fetchAnalyticsData(dateRange, searchQuery),
    refetchInterval: 60000, // Refresh every minute
    enabled: isTableValidated, // Only run query if table is validated
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
    enabled: isTableValidated && existingDataCount > 0,
  });
  
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
  
  // Recent queries
  const recentQueries = React.useMemo(() => {
    if (!analyticsData) return [];
    return analyticsData.slice(0, 10);
  }, [analyticsData]);
  
  // Keyword frequency
  const keywordFrequency = React.useMemo(() => {
    if (!analyticsData) return [];
    return generateKeywordFrequency(analyticsData, 20);
  }, [analyticsData]);
  
  // External source tracking
  const externalSourceStats = React.useMemo(() => {
    if (!analyticsData) return { count: 0, percentage: 0, topQueries: [] };
    return trackNonTranscriptSources(analyticsData);
  }, [analyticsData]);
  
  // Handle manual refresh
  const handleRefresh = () => {
    refetchAnalytics();
    toast({
      title: "Analytics refreshed",
      description: "The analytics data has been refreshed.",
    });
  };
  
  // Handle adding sample data (for development/testing)
  const handleAddSampleData = async () => {
    setIsLoadingSample(true);
    
    try {
      const success = await insertSampleData(20);
      if (success) {
        toast({
          title: "Sample data added",
          description: "Sample analytics data has been added for testing purposes.",
        });
        refetchAnalytics();
        setExistingDataCount(prev => prev + 20);
      } else {
        toast({
          title: "Error adding sample data",
          description: "Could not add sample analytics data.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error adding sample data:", error);
      toast({
        title: "Error adding sample data",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingSample(false);
    }
  };

  // Handle migrating existing conversation data to analytics
  const handleMigrateData = async () => {
    setIsMigratingData(true);
    
    try {
      const migratedCount = await migrateConversationDataToAnalytics();
      if (migratedCount > 0) {
        toast({
          title: "Data migration successful",
          description: `Successfully created ${migratedCount} analytics records from conversation history.`,
        });
        refetchAnalytics();
        setExistingDataCount(prev => prev + migratedCount);
      } else {
        toast({
          title: "No data migrated",
          description: "Could not find or migrate any conversation data to analytics.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error migrating data:", error);
      toast({
        title: "Error migrating data",
        description: "An unexpected error occurred while migrating conversation data.",
        variant: "destructive"
      });
    } finally {
      setIsMigratingData(false);
    }
  };
  
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
        
        {!isTableValidated && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Database configuration issue</AlertTitle>
            <AlertDescription>
              The chat_analytics table doesn't exist or cannot be accessed. Please make sure your database is properly set up.
            </AlertDescription>
          </Alert>
        )}
        
        {isTableValidated && existingDataCount === 0 && (
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>No analytics data found</AlertTitle>
            <AlertDescription className="flex flex-col gap-4">
              <p>
                The analytics table exists but no data has been recorded yet. This may be because:
                <ul className="list-disc list-inside ml-4 mt-2">
                  <li>No user interactions have occurred with the AI assistant</li>
                  <li>Analytics logging is not properly configured</li>
                  <li>The database connection has issues</li>
                </ul>
              </p>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleMigrateData}
                  disabled={isMigratingData}
                  className="flex items-center"
                >
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  {isMigratingData ? "Migrating Conversation Data..." : "Migrate Conversation Data to Analytics"}
                </Button>
                
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleAddSampleData} 
                  disabled={isLoadingSample}
                  className="flex items-center"
                >
                  <Database className="mr-2 h-4 w-4" />
                  {isLoadingSample ? "Adding Sample Data..." : "Add Sample Data for Testing"}
                </Button>
              </div>
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
              <CardTitle>Query Sources</CardTitle>
              <CardDescription>Where answers are coming from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{sourceDistribution.length}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {externalSourceStats.percentage}% of queries used external sources
              </p>
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
                <div className="flex items-center justify-center h-64">
                  <p>Loading data...</p>
                </div>
              ) : sourceDistribution.length > 0 ? (
                <PieChart
                  data={sourceDistribution}
                  index="name"
                  categories={['value']}
                  valueFormatter={(value) => `${value} queries`}
                  colors={['indigo', 'blue', 'violet', 'teal', 'rose', 'amber', 'lime']}
                  className="h-64"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64">
                  <p>No data available</p>
                  {existingDataCount === 0 && (
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
                <div className="flex items-center justify-center h-64">
                  <p>Loading data...</p>
                </div>
              ) : responseTimeData.length > 0 ? (
                <LineChart
                  data={responseTimeData}
                  index="date"
                  categories={["Average Response Time (ms)"]}
                  colors={["green"]}
                  className="h-64"
                  showLegend={false}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64">
                  <p>No response time data available</p>
                  {existingDataCount === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Try using the AI assistant a few times to generate analytics data
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <h2 className="text-2xl font-bold mt-12 mb-6 flex items-center">
          <Zap className="mr-2 h-5 w-5 text-yellow-500" />
          High-Value Insights
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
                  className="h-64"
                  showLegend={false}
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-muted-foreground">No keyword data available</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Info className="mr-2 h-5 w-5 text-primary" />
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
        
        <div className="grid grid-cols-1 gap-6">
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
                  {existingDataCount === 0 && (
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
              <CardTitle>Recent Queries</CardTitle>
              <CardDescription>Latest user interactions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentQueries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Query</TableHead>
                      <TableHead className="hidden md:table-cell">Source</TableHead>
                      <TableHead className="hidden md:table-cell">Date</TableHead>
                      <TableHead className="w-[80px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentQueries.map((query, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium max-w-[300px] truncate">
                          {query.query}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {query.source_type || 'Unknown'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {new Date(query.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${query.successful ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                            {query.successful ? 'Success' : 'Failed'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground text-sm">No recent queries</p>
                  {existingDataCount === 0 && (
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
