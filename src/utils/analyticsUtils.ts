
import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsData {
  id: string;
  query: string;
  created_at: string;
  source_type?: string;
  successful?: boolean;
  search_time_ms?: number;
  api_time_ms?: number;
  transcript_title?: string;
  response_length?: number;
  relevance_score?: number;
  conversation_id?: string;
}

export interface QueryStats {
  query: string;
  count: number;
}

export const fetchAnalyticsData = async (
  dateRange: '7d' | '30d' | 'all' = '7d',
  searchQuery: string = '',
  limit: number = 1000
): Promise<AnalyticsData[]> => {
  try {
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
      .order('created_at', { ascending: false })
      .limit(limit);
    
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
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchAnalyticsData:', error);
    return [];
  }
};

export const getTopQueries = async (
  timePeriod: 'day' | 'week' | 'month' | 'all' = 'all',
  limit: number = 10
): Promise<QueryStats[]> => {
  try {
    const { data, error } = await supabase.rpc('get_top_queries', { 
      time_period: timePeriod === 'all' ? null : timePeriod,
      limit_count: limit
    });
    
    if (error) {
      console.error('Error fetching top queries:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getTopQueries:', error);
    return [];
  }
};

export const generateSourceDistribution = (data: AnalyticsData[]): {name: string, value: number}[] => {
  const sources: {[key: string]: number} = {};
  
  data.forEach(item => {
    const source = item.source_type || 'unknown';
    sources[source] = (sources[source] || 0) + 1;
  });
  
  return Object.entries(sources).map(([name, value]) => ({ name, value }));
};

export const calculateSuccessRate = (data: AnalyticsData[]): {success: number, failure: number, rate: number} => {
  const success = data.filter(item => item.successful).length;
  const total = data.length;
  const rate = total > 0 ? Math.round((success / total) * 100) : 0;
  
  return {
    success,
    failure: total - success,
    rate
  };
};

export const generateResponseTimeData = (data: AnalyticsData[]): {date: string, "Average Response Time (ms)": number}[] => {
  const dailyData: {[key: string]: {count: number, total: number}} = {};
  
  data.forEach(item => {
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
};
