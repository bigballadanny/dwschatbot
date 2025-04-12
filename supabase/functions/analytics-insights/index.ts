
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-pro:generateContent";
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify API key is configured
    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("Required environment variables are not configured");
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    const { type, timeRange } = await req.json();
    
    // Get analytics data
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('chat_analytics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200); // Limit to reasonable amount for analysis

    if (analyticsError) {
      throw new Error(`Error fetching analytics data: ${analyticsError.message}`);
    }

    if (!analyticsData || analyticsData.length === 0) {
      return new Response(JSON.stringify({
        insights: "Not enough data available to generate insights. Please continue using the platform to collect more data."
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process the data based on the type of insights requested
    const promptData = preparePromptData(analyticsData, type, timeRange);
    
    // Call Gemini API for insights
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: promptData }]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1000,
        },
      }),
    });

    const data = await response.json();
      
    if (!response.ok) {
      console.error('Gemini API error:', data);
      throw new Error(`Gemini API error: ${data.error?.message || 'Unknown error'}`);
    }
      
    // Extract the generated insights
    const insights = data.candidates?.[0]?.content?.parts?.[0]?.text || 
      "Unable to generate insights at this time. Please try again later.";
    
    return new Response(JSON.stringify({ 
      insights,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analytics-insights function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      insights: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Prepares prompt data for the AI based on the requested insight type
 */
function preparePromptData(analyticsData, type = 'general', timeRange = '30d') {
  const currentDate = new Date();
  let fromDate = new Date();
  
  // Calculate the date range
  if (timeRange === '7d') {
    fromDate.setDate(currentDate.getDate() - 7);
  } else if (timeRange === '30d') {
    fromDate.setDate(currentDate.getDate() - 30);
  } else {
    fromDate = new Date(0); // All time
  }

  // Filter data by time range
  const filteredData = analyticsData.filter(item => 
    new Date(item.created_at) >= fromDate
  );

  // Extract relevant statistics
  const topQueries = getTopQueries(filteredData, 15);
  const sourceCounts = getSourceCounts(filteredData);
  const successRate = calculateSuccessRate(filteredData);
  const userPatterns = analyzeUserPatterns(filteredData);
  const contentGaps = findContentGaps(filteredData);

  // Base prompt
  let prompt = `You are an analytics expert for a business acquisition chatbot platform. Analyze the following data and provide actionable insights.

Time period: ${timeRange === '7d' ? 'Past 7 days' : timeRange === '30d' ? 'Past 30 days' : 'All time'}
Total queries: ${filteredData.length}
Success rate: ${successRate.rate}% (${successRate.success} successful / ${successRate.failure} failed)

Top Source Types:
${formatSourceData(sourceCounts)}

Top Queries:
${topQueries.map((q, i) => `${i+1}. "${q.query}" (${q.count} times)`).join('\n')}

User Patterns:
- Average queries per conversation: ${userPatterns.avgQueriesPerConversation}
- Return rate: ${userPatterns.returnRate}%
- External search usage: ${contentGaps.percentage}% of queries required external sources

`;

  // Add specific prompt based on the requested insight type
  switch(type) {
    case 'content-gaps':
      prompt += `
Focus on identifying content gaps:
1. Analyze the top queries requiring external knowledge or returning no results
2. Suggest specific topics that should be added to the knowledge base
3. Identify patterns in the types of questions that are failing
4. Recommend 3-5 specific actions to improve the knowledge base
`;
      break;
    case 'user-behavior':
      prompt += `
Focus on user behavior insights:
1. Analyze patterns in how users interact with the system
2. Identify the most common user journeys and conversation flows
3. Highlight any unusual usage patterns or potential pain points
4. Recommend 3-5 specific ways to improve user engagement
`;
      break;
    case 'performance':
      prompt += `
Focus on performance insights:
1. Analyze response time patterns and success rates
2. Identify any correlations between query types and system performance
3. Highlight any potential system bottlenecks or inefficiencies
4. Recommend 3-5 specific actions to improve overall system performance
`;
      break;
    default: // general
      prompt += `
Provide general insights across all areas:
1. Summarize the most significant findings from this data
2. Identify 2-3 key trends worth monitoring
3. Highlight any potential issues or opportunities
4. Recommend 3-5 actionable steps to improve the platform

Format your response with clear sections, markdown formatting for emphasis, and bullet points for recommendations.
`;
  }

  return prompt;
}

/**
 * Get top queries by frequency
 */
function getTopQueries(data, limit = 10) {
  const queryCounts = {};
  data.forEach(item => {
    if (item.query) {
      queryCounts[item.query] = (queryCounts[item.query] || 0) + 1;
    }
  });
  
  return Object.entries(queryCounts)
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get source type distribution
 */
function getSourceCounts(data) {
  const sourceCounts = {};
  data.forEach(item => {
    const source = item.source_type || 'unknown';
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });
  return sourceCounts;
}

/**
 * Format source data for the prompt
 */
function formatSourceData(sourceCounts) {
  return Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => `- ${formatSourceName(source)}: ${count}`)
    .join('\n');
}

/**
 * Format source name for display
 */
function formatSourceName(source) {
  return (source.charAt(0).toUpperCase() + source.slice(1))
    .replace(/_/g, ' ')
    .replace(/ call$/i, ' Call')
    .replace(/^Sba$/i, 'SBA');
}

/**
 * Calculate success rates
 */
function calculateSuccessRate(data) {
  const success = data.filter(item => item.successful === true).length;
  const failure = data.length - success;
  const rate = Math.round((success / data.length) * 100) || 0;
  return { success, failure, rate };
}

/**
 * Analyze user patterns from the data
 */
function analyzeUserPatterns(data) {
  const conversationCounts = {};
  
  data.forEach(item => {
    if (item.conversation_id) {
      conversationCounts[item.conversation_id] = 
        (conversationCounts[item.conversation_id] || 0) + 1;
    }
  });
  
  const conversations = Object.keys(conversationCounts).length;
  const totalQueries = data.length;
  
  const avgQueriesPerConversation = conversations > 0
    ? +(totalQueries / conversations).toFixed(1)
    : 0;
  
  const returningConversations = Object.values(conversationCounts).filter(count => count > 1).length;
  const returnRate = conversations > 0
    ? Math.round((returningConversations / conversations) * 100)
    : 0;
  
  return { avgQueriesPerConversation, returnRate };
}

/**
 * Find content gaps in the knowledge base
 */
function findContentGaps(data) {
  const externalSource = data.filter(item => 
    item.used_online_search === true || item.source_type === 'fallback'
  );
  
  const count = externalSource.length;
  const percentage = data.length > 0
    ? Math.round((count / data.length) * 100)
    : 0;
  
  const topExternalQueries = {};
  externalSource.forEach(item => {
    if (item.query) {
      topExternalQueries[item.query] = (topExternalQueries[item.query] || 0) + 1;
    }
  });
  
  const topQueries = Object.entries(topExternalQueries)
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  return { count, percentage, topQueries };
}
