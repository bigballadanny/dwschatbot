
import { supabase } from '@/integrations/supabase/client';

export type AnalyticsData = {
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
  used_online_search?: boolean | null;
};

/**
 * Fetches analytics data based on date range and optional search query
 */
export async function fetchAnalyticsData(
  dateRange: '7d' | '30d' | 'all',
  searchQuery?: string
): Promise<AnalyticsData[]> {
  try {
    console.log(`Fetching analytics data for range: ${dateRange}, search: ${searchQuery || 'none'}`);
    
    let query = supabase
      .from('chat_analytics')
      .select('*')
      .order('created_at', { ascending: false });

    if (dateRange === '7d') {
      query = query.gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    } else if (dateRange === '30d') {
      query = query.gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    }

    if (searchQuery && searchQuery.trim() !== '') {
      query = query.ilike('query', `%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching analytics data:', error);
      return [];
    }

    console.log(`Retrieved ${data?.length || 0} analytics records`);
    return data as AnalyticsData[];
  } catch (err) {
    console.error('Error in fetchAnalyticsData:', err);
    return [];
  }
}

/**
 * Fetches the top queries based on frequency
 */
export async function getTopQueries(
  timePeriod: 'day' | 'week' | 'month' | 'all',
  limit: number = 10
): Promise<{ query: string; count: number }[]> {
  try {
    console.log(`Fetching top queries for period: ${timePeriod}, limit: ${limit}`);
    
    const { data, error } = await supabase.rpc('get_top_queries', {
      time_period: timePeriod,
      limit_count: limit,
    });

    if (error) {
      console.error('Error fetching top queries:', error);
      return [];
    }

    console.log(`Retrieved ${data?.length || 0} top queries`);
    return data || [];
  } catch (err) {
    console.error('Error in getTopQueries:', err);
    return [];
  }
}

/**
 * Generates data for source distribution chart
 */
export function generateSourceDistribution(
  analyticsData: AnalyticsData[]
): { name: string; value: number }[] {
  const sourceCounts: Record<string, number> = {};

  analyticsData.forEach((item) => {
    const source = item.source_type || 'unknown';
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });

  return Object.entries(sourceCounts).map(([name, value]) => ({
    name: formatSourceName(name),
    value,
  }));
}

/**
 * Formats source name for display
 */
function formatSourceName(source: string): string {
  switch (source) {
    case 'protege_call':
      return 'Protege Call';
    case 'foundations_call':
      return 'Foundations Call';
    case 'mastermind_call':
      return 'Mastermind Call';
    case 'business_acquisitions_summit':
      return '2024 Summit';
    case 'fallback':
      return 'API Fallback';
    case 'web':
      return 'Web Search';
    case 'system':
      return 'System Message';
    case 'error':
      return 'Error';
    default:
      return source.charAt(0).toUpperCase() + source.slice(1).replace(/_/g, ' ');
  }
}

/**
 * Calculates success rate stats
 */
export function calculateSuccessRate(analyticsData: AnalyticsData[]) {
  const success = analyticsData.filter((item) => item.successful === true).length;
  const failure = analyticsData.length - success;
  const rate = analyticsData.length > 0 ? Math.round((success / analyticsData.length) * 100) : 0;

  return { success, failure, rate };
}

/**
 * Generates response time trend data
 */
export function generateResponseTimeData(analyticsData: AnalyticsData[]) {
  const timeDataMap: Record<string, { total: number; count: number }> = {};

  // Sort data by date first
  const sortedData = [...analyticsData].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  sortedData.forEach((item) => {
    if (item.api_time_ms !== null && item.search_time_ms !== null) {
      const date = new Date(item.created_at).toLocaleDateString();
      
      if (!timeDataMap[date]) {
        timeDataMap[date] = { total: 0, count: 0 };
      }
      
      const totalTime = item.api_time_ms + item.search_time_ms;
      timeDataMap[date].total += totalTime;
      timeDataMap[date].count += 1;
    }
  });

  return Object.entries(timeDataMap).map(([date, { total, count }]) => ({
    date,
    "Average Response Time (ms)": Math.round(total / count),
  }));
}
