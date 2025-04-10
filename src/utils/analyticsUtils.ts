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

// Define M&A Themes and associated keywords
const maThemes: Record<string, string[]> = {
  'Valuation & Pricing': ['valuation', 'ebitda', 'multiple', 'pricing', 'value', 'worth', 'appraisal'],
  'Due Diligence': ['due diligence', 'dd', 'investigation', 'audit', 'verification', 'red flags'],
  'Financing & Funding': ['financing', 'funding', 'loan', 'sba', 'debt', 'equity', 'investment', 'capital', 'leverage'],
  'Legal & Contracts': ['legal', 'contract', 'agreement', 'loi', 'letter of intent', 'term sheet', 'purchase agreement', 'nda', 'liability', 'compliance'],
  'Deal Structuring': ['deal structure', 'structuring', 'terms', 'earn-out', 'payment', 'rollover', 'asset purchase', 'stock purchase'],
  'Negotiation Tactics': ['negotiation', 'negotiate', 'deal points', 'concessions', 'offers', 'counter-offer'],
  'Integration Planning': ['integration', 'post-acquisition', 'synergies', 'merge', 'post-merger', 'onboarding'],
  'Market & Strategy': ['market', 'strategy', 'sourcing', 'industry', 'competitive', 'growth', 'target', 'pipeline'],
  'Taxes': ['tax', 'taxes', 'tax implications', 'depreciation', 'amortization'],
  'General M&A': ['m&a', 'acquisition', 'merger', 'buy', 'sell', 'exit', 'business'], // Catch-all for general terms
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

    let queryBuilder = supabase
      .from('chat_analytics')
      .select('*')
      .order('created_at', { ascending: false });

    if (dateRange === '7d') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      queryBuilder = queryBuilder.gte('created_at', sevenDaysAgo.toISOString());
    } else if (dateRange === '30d') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      queryBuilder = queryBuilder.gte('created_at', thirtyDaysAgo.toISOString());
    }

    if (searchQuery && searchQuery.trim() !== '') {
      queryBuilder = queryBuilder.ilike('query', `%${searchQuery}%`);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Error fetching analytics data:', error);
      throw error;
    }

    console.log(`Retrieved ${data?.length || 0} analytics records`);

    if (!data || data.length === 0) {
      console.log('No analytics data found, checking table info...');
      const { count, error: countError } = await supabase
        .from('chat_analytics')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Error checking chat_analytics table:', countError);
      } else {
        console.log(`Total records in chat_analytics table: ${count ?? 'N/A'}`);
      }
    }

    return data as AnalyticsData[] || []; // Ensure returning an array
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

    // Use RPC function if available (preferred)
    try {
      const { data, error } = await supabase.rpc('get_top_queries', {
        time_period: timePeriod,
        limit_count: limit,
      });

      if (error) {
        console.warn('RPC get_top_queries failed, falling back to client-side calculation:', error.message);
        throw error; // Trigger fallback
      }
      // Ensure data is an array, handle potential null
      const result = (data || []).map((item: any) => ({ query: item.query, count: item.query_count }));
      console.log(`Retrieved ${result.length} top queries using RPC`);
      return result;
    } catch (rpcErr) {
      console.log('Calculating top queries client-side due to RPC failure or unavailability.');

      // Fallback: Client-side calculation
      let queryBuilder = supabase
        .from('chat_analytics')
        .select('query')
        .eq('successful', true);

      if (timePeriod !== 'all') {
        const startDate = new Date();
        if (timePeriod === 'day') startDate.setDate(startDate.getDate() - 1);
        else if (timePeriod === 'week') startDate.setDate(startDate.getDate() - 7);
        else if (timePeriod === 'month') startDate.setDate(startDate.getDate() - 30);
        queryBuilder = queryBuilder.gte('created_at', startDate.toISOString());
      }

      const { data: queryData, error: queryError } = await queryBuilder;

      if (queryError) {
        console.error('Error fetching query data for client-side calculation:', queryError);
        return [];
      }

      if (!queryData || queryData.length === 0) {
          return [];
      }

      const queryCounts: Record<string, number> = {};
      queryData.forEach(item => {
        if (item.query) { // Ensure query is not null
          queryCounts[item.query] = (queryCounts[item.query] || 0) + 1;
        }
      });

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
  // Improved formatting for readability
  return (source.charAt(0).toUpperCase() + source.slice(1))
         .replace(/_/g, ' ')
         .replace(/ call$/i, ' Call') // Ensure proper casing for Call types
         .replace(/^Sba$/i, 'SBA'); // Correct acronym casing
}

/**
 * Calculates success rate stats
 */
export function calculateSuccessRate(analyticsData: AnalyticsData[]) {
  if (analyticsData.length === 0) return { success: 0, failure: 0, rate: 0 };
  const success = analyticsData.filter((item) => item.successful === true).length;
  const failure = analyticsData.length - success;
  const rate = Math.round((success / analyticsData.length) * 100);
  return { success, failure, rate };
}

/**
 * Generates response time trend data
 */
export function generateResponseTimeData(analyticsData: AnalyticsData[]) {
  const timeDataMap: Record<string, { total: number; count: number }> = {};
  const sortedData = [...analyticsData].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  sortedData.forEach((item) => {
    // Use combined time if available, otherwise estimate based on available data
    const responseTime = (item.api_time_ms ?? 0) + (item.search_time_ms ?? 0);
    if (responseTime > 0) { // Only include if we have some time data
      const date = new Date(item.created_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
      if (!timeDataMap[date]) {
        timeDataMap[date] = { total: 0, count: 0 };
      }
      timeDataMap[date].total += responseTime;
      timeDataMap[date].count += 1;
    }
  });

  return Object.entries(timeDataMap).map(([date, { total, count }]) => ({
    date,
    "Average Response Time (ms)": Math.round(total / count),
  }));
}

/**
 * Generates usage by time of day data
 */
export function generateUsageByTimeOfDay(analyticsData: AnalyticsData[]) {
  const hourCounts = Array(24).fill(0);
  analyticsData.forEach(item => {
    const hour = new Date(item.created_at).getHours();
    hourCounts[hour]++;
  });
  return hourCounts.map((count, hour) => ({
    hour: `${hour}:00`, // Format hour
    queries: count
  }));
}

/**
 * Generates daily query volume data
 */
export function generateDailyQueryVolume(analyticsData: AnalyticsData[]) {
  const dailyData: Record<string, number> = {};
  analyticsData.forEach(item => {
    const date = new Date(item.created_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    dailyData[date] = (dailyData[date] || 0) + 1;
  });
  return Object.entries(dailyData)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([date, count]) => ({ date, queries: count }));
}


/**
 * Analyzes conversation length distribution
 */
export function analyzeConversationLengths(analyticsData: AnalyticsData[]) {
  const conversationQueryCounts: Record<string, number> = {};
  analyticsData.forEach(item => {
    if (item.conversation_id) {
      conversationQueryCounts[item.conversation_id] =
        (conversationQueryCounts[item.conversation_id] || 0) + 1;
    }
  });
  const lengths = Object.values(conversationQueryCounts);
  if (lengths.length === 0) return { short: 0, medium: 0, long: 0, total: 0, averageLength: 0 };

  const shortConvs = lengths.filter(length => length <= 2).length;
  const mediumConvs = lengths.filter(length => length > 2 && length <= 5).length;
  const longConvs = lengths.filter(length => length > 5).length;
  const total = lengths.length;
  const averageLength = Math.round(lengths.reduce((sum, length) => sum + length, 0) / total);

  return { short: shortConvs, medium: mediumConvs, long: longConvs, total, averageLength };
}

/**
 * Tracks transcript sources by type
 */
export function getTranscriptSourceStats(analyticsData: AnalyticsData[]) {
  const stats: Record<string, number> = {};
  analyticsData.forEach(item => {
    const sourceType = item.source_type || 'other';
    stats[sourceType] = (stats[sourceType] || 0) + 1;
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
      const key = item.transcript_title; // Use title as the primary key
      if (!transcriptCounts[key]) {
        transcriptCounts[key] = { count: 0, source: item.source_type };
      }
      transcriptCounts[key].count += 1;
    }
  });
  return Object.entries(transcriptCounts)
    .map(([title, { count, source }]) => ({ title, count, source: source ? formatSourceName(source) : 'Unknown' }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Generates keyword frequency data from user queries
 */
export function generateKeywordFrequency(analyticsData: AnalyticsData[], limit: number = 20) { // Increased limit slightly
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'has', 'had', 'do', 'does',
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
    'he', 'him', 'his', 'she', 'her', 'hers', 'it', 'its', 'they', 'them', 'their', 'theirs',
    'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are',
    'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
    'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until',
    'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
    'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here',
    'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'll', 'm', 're', 've'
  ]);

  const wordFrequency: Record<string, number> = {};
  analyticsData.forEach(item => {
    if (!item.query) return;
    const words = item.query.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ') // Replace punctuation with space
      .split(/\s+/);
    words.forEach(word => {
      if (!word || word.length <= 2 || stopWords.has(word) || !isNaN(Number(word))) return;
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });
  });
  return Object.entries(wordFrequency)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Generates M&A query theme distribution data
 */
export function generateQueryThemes(
  analyticsData: AnalyticsData[]
): { theme: string; count: number }[] {
  const themeCounts: Record<string, number> = {};
  Object.keys(maThemes).forEach(theme => { themeCounts[theme] = 0; });
  themeCounts['Other'] = 0;

  analyticsData.forEach(item => {
    if (!item.query) return;
    const lowerCaseQuery = item.query.toLowerCase();
    let themeAssigned = false;

    for (const [theme, keywords] of Object.entries(maThemes)) {
      if (keywords.some(keyword => lowerCaseQuery.includes(keyword))) {
        themeCounts[theme]++;
        themeAssigned = true;
        break; // Assign only the first matched theme
      }
    }
    if (!themeAssigned) {
      themeCounts['Other']++;
    }
  });

  return Object.entries(themeCounts)
    .map(([theme, count]) => ({ theme, count }))
    .filter(item => item.count > 0) // Filter out themes with 0 count for cleaner charts
    .sort((a, b) => b.count - a.count);
}

/**
 * Tracks when sources outside of transcripts were used
 */
export function trackNonTranscriptSources(analyticsData: AnalyticsData[]) {
  const externalSourceData = analyticsData.filter(item =>
    item.used_online_search === true || item.source_type === 'fallback' // More explicit check
  );
  const externalSourceCount = externalSourceData.length;

  const topExternalQueries: Record<string, number> = {};
  externalSourceData.forEach(item => {
    if (item.query) {
      topExternalQueries[item.query] = (topExternalQueries[item.query] || 0) + 1;
    }
  });

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
 * Creates segments of users based on their query patterns
 */
export function analyzeUserSegments(analyticsData: AnalyticsData[]) {
  const conversationQueries: Record<string, string[]> = {};
  analyticsData.forEach(item => {
    if (item.conversation_id && item.query) {
      if (!conversationQueries[item.conversation_id]) {
        conversationQueries[item.conversation_id] = [];
      }
      conversationQueries[item.conversation_id].push(item.query);
    }
  });

  const segments = {
    basic: 0, engaged: 0, power: 0, // Engagement levels
    technical: 0, conceptual: 0, otherType: 0 // Query types
  };

  const technicalKeywords = new Set([
    ...maThemes['Valuation & Pricing'], ...maThemes['Financing & Funding'],
    ...maThemes['Legal & Contracts'], ...maThemes['Deal Structuring'],
    ...maThemes['Taxes'], 'ebitda', 'sba', 'loi' // Ensure key acronyms are included
  ]);

  const conceptualPhrases = ['how to', 'what is', 'why', 'explain', 'difference', 'compare', 'strategy', 'approach', 'methodology', 'consider', 'should i', 'benefit', 'risk'];

  Object.values(conversationQueries).forEach(queries => {
    if (!queries || queries.length === 0) return;

    // Engagement segmentation
    if (queries.length <= 2) segments.basic++;
    else if (queries.length <= 5) segments.engaged++;
    else segments.power++;

    // Query type segmentation (based on *dominant* type in conversation)
    let techScore = 0;
    let conceptualScore = 0;
    const allQueriesText = queries.join(' ').toLowerCase();

    queries.forEach(query => {
      const lowerQuery = query.toLowerCase();
      if (conceptualPhrases.some(phrase => lowerQuery.includes(phrase))) {
        conceptualScore++;
      }
      // Check against technical keywords set for efficiency
      if ([...technicalKeywords].some(term => lowerQuery.includes(term))) {
          techScore++;
      }
    });

    if (techScore > conceptualScore) {
      segments.technical++;
    } else if (conceptualScore > techScore) {
      segments.conceptual++;
    } else if (techScore > 0) { // If equal, but non-zero, classify as technical or mixed
        segments.technical++; // Or could add a mixed category
    } else {
        segments.otherType++;
    }
  });

  return segments;
}

/**
 * Identifies potentially insightful queries based on defined criteria.
 */
export function identifyInsightfulQueries(
  analyticsData: AnalyticsData[],
  limit: number = 15 // Increased limit slightly
): { query: string; reason: string; score: number; source?: string | null }[] {
  console.log("Identifying insightful queries...");
  const insightfulList: { query: string; reason: string; score: number; source?: string | null }[] = [];
  const queryScores: Record<string, { score: number; reasons: Set<string>; source?: string | null }> = {};

  // Calculate average query length
  const validQueries = analyticsData.filter(item => item.query);
  const avgLength = validQueries.length > 0
    ? validQueries.reduce((sum, item) => sum + (item.query?.length || 0), 0) / validQueries.length
    : 0;

  analyticsData.forEach(item => {
    if (!item.query) return;

    const query = item.query;
    const lowerCaseQuery = query.toLowerCase();
    let score = 0;
    const reasons = new Set<string>();

    // Reason 1: Used External Search (High weight)
    if (item.used_online_search === true || item.source_type === 'fallback') {
      score += 3;
      reasons.add('Used external search/fallback');
    }

    // Reason 2: Mentions Multiple Themes
    let themesMentionedCount = 0;
    for (const keywords of Object.values(maThemes)) {
      if (keywords.some(keyword => lowerCaseQuery.includes(keyword))) {
        themesMentionedCount++;
      }
    }
    if (themesMentionedCount >= 2) {
      score += 2;
      reasons.add(`Mentioned ${themesMentionedCount} M&A themes`);
    }

    // Reason 3: Longer than Average Query
    if (query.length > avgLength * 1.5) { // Significantly longer
      score += 1;
      reasons.add('Longer than average');
    }

    // Reason 4: Contains Question Keywords (Conceptual)
     const conceptualPhrases = ['how to', 'what is', 'why', 'explain', 'difference', 'compare', 'strategy', 'should i', 'risk', 'benefit'];
     if (conceptualPhrases.some(phrase => lowerCaseQuery.includes(phrase))) {
       score += 1;
       reasons.add('Conceptual question');
     }

    // Reason 5: Failed query (might indicate complex/unanswerable question)
    if (item.successful === false && item.error_message) {
        score += 1;
        reasons.add(`Failed (${item.error_message.substring(0, 30)}...)`);
    }

    // Aggregate scores for identical queries
    if (score > 0) {
      if (!queryScores[query]) {
        queryScores[query] = { score: 0, reasons: new Set<string>(), source: item.source_type };
      }
      queryScores[query].score += score;
      reasons.forEach(reason => queryScores[query].reasons.add(reason));
      // Keep the source type of the first occurrence (or potentially the highest scored one)
    }
  });

  // Convert scored queries into the final list format
  for (const [query, data] of Object.entries(queryScores)) {
    insightfulList.push({
      query,
      reason: Array.from(data.reasons).join(', '),
      score: data.score,
      source: data.source ? formatSourceName(data.source) : 'Unknown'
    });
  }

  // Sort by score (descending) and take the top N
  const sortedList = insightfulList.sort((a, b) => b.score - a.score).slice(0, limit);
  console.log(`Identified ${sortedList.length} insightful queries.`);
  return sortedList;
}
