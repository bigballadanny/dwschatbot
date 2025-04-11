
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

// Use gemini-pro instead of gemini-2.0-pro as the latter might not be accessible yet
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent";

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
    // Check required environment variables
    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("Missing required environment variables");
      throw new Error("Missing required environment variables");
    }

    console.log("Starting analytics-insights function with all required environment variables");

    // Initialize Supabase client with auth header from request
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    // Parse request body
    const { type = 'general', timeRange = 'all' } = await req.json();
    console.log(`Generating ${type} insights for time range: ${timeRange}`);

    // Fetch analytics data based on time range
    const timeFilter = timeRange === '7d' ? 'created_at > now() - interval \'7 days\'' : 
                       timeRange === '30d' ? 'created_at > now() - interval \'30 days\'' : '';
    
    let { data: analyticsData, error } = await supabase
      .from('chat_analytics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    
    if (error) {
      console.error("Error fetching analytics data:", error.message);
      throw new Error(`Error fetching analytics data: ${error.message}`);
    }

    if (!analyticsData || analyticsData.length === 0) {
      console.log("No analytics data available");
      return new Response(JSON.stringify({ 
        insights: "No analytics data available for the selected time period.", 
        timestamp: new Date().toISOString() 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Retrieved ${analyticsData.length} analytics records`);

    // Prepare data summary for Gemini
    const totalQueries = analyticsData.length;
    const successfulQueries = analyticsData.filter(item => item.successful).length;
    const successRate = totalQueries > 0 ? Math.round((successfulQueries / totalQueries) * 100) : 0;
    
    // Count sources
    const sources = {};
    analyticsData.forEach(item => {
      const source = item.source_type || 'unknown';
      sources[source] = (sources[source] || 0) + 1;
    });
    
    // Calculate average response time
    const avgResponseTime = analyticsData.reduce((sum, item) => sum + (item.api_time_ms || 0), 0) / totalQueries;
    
    // Get top queries (up to 10)
    const queries = {};
    analyticsData.forEach(item => {
      if (item.query) {
        const query = item.query.trim().toLowerCase();
        queries[query] = (queries[query] || 0) + 1;
      }
    });
    
    const topQueries = Object.entries(queries)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => `${query} (${count} times)`);

    // Prepare prompt based on insight type - using proper markdown formatting instead of hashtags
    let prompt = `You are an analytics insight generator for an AI assistant platform. Analyze the following data and provide professional, actionable insights in markdown format.\n\n`;
    
    prompt += `Data Summary:\n`;
    prompt += `- Time Period: ${timeRange === '7d' ? 'Past 7 days' : timeRange === '30d' ? 'Past 30 days' : 'All time'}\n`;
    prompt += `- Total Queries: ${totalQueries}\n`;
    prompt += `- Success Rate: ${successRate}%\n`;
    prompt += `- Average Response Time: ${Math.round(avgResponseTime)}ms\n`;
    prompt += `- Source Distribution: ${Object.entries(sources).map(([key, val]) => `${key}: ${val}`).join(', ')}\n`;
    
    if (topQueries.length > 0) {
      prompt += `- Top Queries: ${topQueries.slice(0, 5).join('; ')}\n`;
    }

    // Add specific analysis instructions based on type
    switch(type) {
      case 'general':
        prompt += `\nProvide general insights about user behavior, query patterns, and system performance. Highlight key metrics and trends. Suggest 2-3 actionable recommendations. Use proper markdown formatting with ## for headings - do NOT use hashtags (#) at the beginning of lines.`;
        break;
      case 'content-gaps':
        prompt += `\nAnalyze the data to identify content gaps in our knowledge base. What topics or questions are users asking about that might not be well covered? Focus on identifying patterns in queries that lead to lower success rates or require external sources. Use proper markdown formatting with ## for headings - do NOT use hashtags (#) at the beginning of lines.`;
        break;
      case 'user-behavior':
        prompt += `\nFocus on user behavior patterns. How are users interacting with the system? What types of questions are they asking, and at what times? Are there patterns in repeat queries? Provide insights on how users are utilizing the assistant and how their experience could be improved. Use proper markdown formatting with ## for headings - do NOT use hashtags (#) at the beginning of lines.`;
        break;
      case 'performance':
        prompt += `\nAnalyze system performance metrics. Focus on response times, success rates, and any error patterns. Identify factors affecting performance and suggest optimization opportunities. Use proper markdown formatting with ## for headings - do NOT use hashtags (#) at the beginning of lines.`;
        break;
    }

    console.log(`Sending request to Gemini API for ${type} insights`);
    console.log(`API URL: ${GEMINI_API_URL}`);
    
    // Call Gemini API for analysis - with extensive error handling and logging
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ 
            role: 'user', 
            parts: [{ text: prompt }] 
          }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.9,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API Error: Status ${response.status}`);
        console.error("Error details:", errorText);
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
      }

      const geminiData = await response.json();
      console.log("Received response from Gemini API");
      
      if (!geminiData?.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error("Unexpected response format from Gemini API:", JSON.stringify(geminiData));
        throw new Error("Unexpected response format from Gemini API");
      }
      
      const insights = geminiData.candidates[0].content.parts[0].text;
      console.log(`Generated insights: ${insights.length} characters`);

      return new Response(JSON.stringify({
        insights,
        timestamp: new Date().toISOString(),
        type
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (geminiError) {
      console.error("Error calling Gemini API:", geminiError);
      
      // Provide helpful fallback insights when the API fails
      const fallbackInsights = `
## Analytics Insights (Fallback Response)

**Note**: We're currently experiencing issues with our AI insights generator. Here's a basic summary of your data:

### Data Summary
- Time Period: ${timeRange === '7d' ? 'Past 7 days' : timeRange === '30d' ? 'Past 30 days' : 'All time'}
- Total Queries: ${totalQueries}
- Success Rate: ${successRate}%
- Average Response Time: ${Math.round(avgResponseTime)}ms

### Top Queries
${topQueries.slice(0, 5).map(q => `- ${q}`).join('\n')}

Please try again later for AI-generated insights.
      `;
      
      return new Response(JSON.stringify({
        insights: fallbackInsights,
        timestamp: new Date().toISOString(),
        type,
        fallback: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in analytics-insights function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Unknown error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
