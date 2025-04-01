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
  used_online_search: boolean | null;
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
      // Use longer time range for testing when table might be empty
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query = query.gte('created_at', sevenDaysAgo.toISOString());
    } else if (dateRange === '30d') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.gte('created_at', thirtyDaysAgo.toISOString());
    }

    if (searchQuery && searchQuery.trim() !== '') {
      query = query.ilike('query', `%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching analytics data:', error);
      throw error;
    }

    console.log(`Retrieved ${data?.length || 0} analytics records`);
    
    // If no data, let's add debug logging
    if (!data || data.length === 0) {
      console.log('No analytics data found, checking table exists...');
      const { count, error: countError } = await supabase
        .from('chat_analytics')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('Error checking chat_analytics table:', countError);
      } else {
        console.log(`Total records in chat_analytics table: ${count}`);
      }
    }
    
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
    
    // First check if we have the get_top_queries function available
    try {
      const { data, error } = await supabase.rpc('get_top_queries', {
        time_period: timePeriod,
        limit_count: limit,
      });

      if (error) {
        console.warn('RPC get_top_queries failed, falling back to client-side calculation:', error);
        throw error; // Fall through to the catch block
      }

      console.log(`Retrieved ${data?.length || 0} top queries using RPC`);
      return data || [];
    } catch (rpcErr) {
      // Fallback: calculate top queries client-side if the RPC fails
      console.log('Calculating top queries client-side');
      
      // Get all analytics data for the period
      let query = supabase
        .from('chat_analytics')
        .select('query')
        .eq('successful', true);
      
      if (timePeriod === 'day') {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        query = query.gte('created_at', oneDayAgo.toISOString());
      } else if (timePeriod === 'week') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        query = query.gte('created_at', sevenDaysAgo.toISOString());
      } else if (timePeriod === 'month') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte('created_at', thirtyDaysAgo.toISOString());
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching query data:', error);
        return [];
      }
      
      // Count occurrences of each query
      const queryCounts: Record<string, number> = {};
      data.forEach(item => {
        queryCounts[item.query] = (queryCounts[item.query] || 0) + 1;
      });
      
      // Sort by count and take the top N
      const result = Object.entries(queryCounts)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
      
      console.log(`Calculated ${result.length} top queries client-side`);
      return result;
    }
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

/**
 * Tracks transcript sources by type
 */
export function getTranscriptSourceStats(analyticsData: AnalyticsData[]) {
  const stats = {
    protege_call: 0,
    foundations_call: 0,
    mastermind_call: 0,
    business_acquisitions_summit: 0,
    other: 0
  };
  
  analyticsData.forEach(item => {
    const sourceType = item.source_type || 'other';
    
    if (sourceType in stats) {
      stats[sourceType as keyof typeof stats] += 1;
    } else {
      stats.other += 1;
    }
  });
  
  return stats;
}

/**
 * Gets the most frequently used transcripts
 */
export function getFrequentlyUsedTranscripts(
  analyticsData: AnalyticsData[], 
  limit: number = 5
): { title: string; count: number; source: string | null }[] {
  const transcriptCounts: Record<string, { count: number; source: string | null }> = {};
  
  analyticsData.forEach(item => {
    if (item.transcript_title) {
      if (!transcriptCounts[item.transcript_title]) {
        transcriptCounts[item.transcript_title] = { 
          count: 0, 
          source: item.source_type 
        };
      }
      transcriptCounts[item.transcript_title].count += 1;
    }
  });
  
  return Object.entries(transcriptCounts)
    .map(([title, { count, source }]) => ({ title, count, source }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Generates keyword frequency data from user queries
 */
export function generateKeywordFrequency(analyticsData: AnalyticsData[], limit: number = 10) {
  // Common words to exclude
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
    'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'to', 'from', 'in', 'out', 'on', 'off', 'over', 'under', 'again',
    'for', 'of', 'by', 'with', 'about', 'against', 'between', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'how',
    'why', 'what', 'when', 'where', 'who', 'which', 'if', 'then', 'that',
    'this', 'these', 'those', 'can', 'will', 'should', 'could', 'would',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us'
  ]);
  
  const wordFrequency: Record<string, number> = {};
  
  analyticsData.forEach(item => {
    if (!item.query) return;
    
    // Extract words, convert to lowercase and remove punctuation
    const words = item.query.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .split(/\s+/);
    
    words.forEach(word => {
      // Ignore short words and stop words
      if (word.length <= 2 || stopWords.has(word)) return;
      
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });
  });
  
  // Convert to array, sort by frequency and take top N
  return Object.entries(wordFrequency)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Tracks when sources outside of transcripts were used
 */
export function trackNonTranscriptSources(analyticsData: AnalyticsData[]) {
  const externalSourceCount = analyticsData.filter(item => 
    item.source_type === 'web' || item.source_type === 'fallback'
  ).length;
  
  const topExternalQueries = analyticsData
    .filter(item => item.source_type === 'web' || item.source_type === 'fallback')
    .map(item => item.query)
    .reduce((acc: Record<string, number>, query) => {
      acc[query] = (acc[query] || 0) + 1;
      return acc;
    }, {});
  
  const topExternalQueriesList = Object.entries(topExternalQueries)
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  return {
    count: externalSourceCount,
    percentage: analyticsData.length > 0 
      ? Math.round((externalSourceCount / analyticsData.length) * 100) 
      : 0,
    topQueries: topExternalQueriesList
  };
}

/**
 * Creates segments of users based on their query types
 */
export function analyzeUserSegments(analyticsData: AnalyticsData[]) {
  // Group queries by conversation
  const conversationQueries: Record<string, string[]> = {};
  
  analyticsData.forEach(item => {
    if (item.conversation_id) {
      if (!conversationQueries[item.conversation_id]) {
        conversationQueries[item.conversation_id] = [];
      }
      conversationQueries[item.conversation_id].push(item.query);
    }
  });
  
  // Analyze segments
  const segments = {
    basic: 0,      // 1-2 queries
    engaged: 0,    // 3-5 queries
    power: 0,      // 6+ queries
    technical: 0,  // Contains technical terms
    conceptual: 0  // Contains conceptual questions
  };
  
  const technicalTerms = ['sba', 'loan', 'financing', 'ebitda', 'valuation', 'due diligence', 
    'leverage', 'acquisition', 'balance sheet', 'cash flow', 'liability'];
  
  const conceptualPhrases = ['how to', 'what is', 'why would', 'explain', 'difference between',
    'compared to', 'strategy', 'approach', 'methodology'];
  
  Object.values(conversationQueries).forEach(queries => {
    // Segment by engagement level
    if (queries.length <= 2) segments.basic++;
    else if (queries.length <= 5) segments.engaged++;
    else segments.power++;
    
    // Segment by query type
    const allQueriesText = queries.join(' ').toLowerCase();
    
    if (technicalTerms.some(term => allQueriesText.includes(term))) {
      segments.technical++;
    }
    
    if (conceptualPhrases.some(phrase => allQueriesText.includes(phrase))) {
      segments.conceptual++;
    }
  });
  
  return segments;
}
