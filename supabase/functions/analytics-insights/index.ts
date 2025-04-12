
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Environment variables
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

// Gemini API configuration
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to prepare data summary for analysis
function prepareDataSummary(analyticsData, timeRange) {
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
  
  return {
    totalQueries,
    successRate,
    avgResponseTime: Math.round(avgResponseTime),
    sources,
    timeRangeText: timeRange === '7d' ? 'Past 7 days' : timeRange === '30d' ? 'Past 30 days' : 'All time'
  };
}

// Function to create a prompt for the Gemini model based on data summary and insight type
function createGeminiPrompt(dataSummary, insightType) {
  let prompt = `You are an analytics insight generator. Analyze the following data and provide professional, actionable insights in markdown format.\n\n`;
  
  prompt += `Data Summary:\n`;
  prompt += `- Time Period: ${dataSummary.timeRangeText}\n`;
  prompt += `- Total Queries: ${dataSummary.totalQueries}\n`;
  prompt += `- Success Rate: ${dataSummary.successRate}%\n`;
  prompt += `- Average Response Time: ${dataSummary.avgResponseTime}ms\n`;
  prompt += `- Source Distribution: ${Object.entries(dataSummary.sources).map(([key, val]) => `${key}: ${val}`).join(', ')}\n`;

  // Add specific analysis instructions based on type
  switch(insightType) {
    case 'general':
      prompt += `\nProvide general insights about user behavior, query patterns, and system performance. Highlight key metrics and trends. Suggest 2-3 actionable recommendations.`;
      break;
    case 'content-gaps':
      prompt += `\nAnalyze data to identify content gaps in our knowledge base. What topics or questions are users asking about that might not be well covered?`;
      break;
    case 'user-behavior':
      prompt += `\nFocus on user behavior patterns. How are users interacting with the system? What types of questions are they asking?`;
      break;
    case 'performance':
      prompt += `\nAnalyze system performance metrics. Focus on response times, success rates, and any error patterns.`;
      break;
  }
  
  return prompt;
}

// Function to call Gemini API
async function callGeminiAPI(prompt) {
  try {
    console.log('Calling Gemini API with prompt:', prompt.substring(0, 100) + '...');
    
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

    const data = await response.json();
    
    if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("Unexpected response format from Gemini API:", JSON.stringify(data));
      throw new Error("Unexpected response format from Gemini API");
    }
    
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
}

// Function to generate fallback insights when Gemini API fails
function generateFallbackInsights(dataSummary) {
  return `
## Analytics Insights (Fallback Response)

**Note**: We're currently experiencing issues with our AI insights generator. Here's a basic summary of your data:

- Time Period: ${dataSummary.timeRangeText}
- Total Queries: ${dataSummary.totalQueries}
- Success Rate: ${dataSummary.successRate}%
- Average Response Time: ${dataSummary.avgResponseTime}ms

Please try again later for AI-generated insights.
  `;
}

// Function to fetch analytics data from database
async function fetchAnalyticsData(supabase, timeRange) {
  const { data, error } = await supabase
    .from('chat_analytics')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  
  if (error) {
    console.error("Error fetching analytics data:", error.message);
    throw new Error(`Error fetching analytics data: ${error.message}`);
  }
  
  return data || [];
}

// Main request handler
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

    // Initialize Supabase client with auth header from request
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    // Parse request body
    const { type = 'general', timeRange = 'all' } = await req.json();
    console.log(`Generating ${type} insights for time range: ${timeRange}`);

    // Fetch analytics data
    const analyticsData = await fetchAnalyticsData(supabase, timeRange);
    
    if (!analyticsData || analyticsData.length === 0) {
      return new Response(JSON.stringify({ 
        insights: "No analytics data available for the selected time period.", 
        timestamp: new Date().toISOString() 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare data summary for Gemini
    const dataSummary = prepareDataSummary(analyticsData, timeRange);
    
    // Create prompt for Gemini
    const prompt = createGeminiPrompt(dataSummary, type);
    
    try {
      // Call Gemini API
      const insights = await callGeminiAPI(prompt);

      return new Response(JSON.stringify({
        insights,
        timestamp: new Date().toISOString(),
        type
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (geminiError) {
      console.error("Error calling Gemini API:", geminiError);
      
      // Provide fallback insights
      const fallbackInsights = generateFallbackInsights(dataSummary);
      
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
