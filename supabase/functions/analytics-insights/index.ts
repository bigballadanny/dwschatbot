import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// --- Configuration ---
const VERTEX_AI_SERVICE_ACCOUNT = Deno.env.get('VERTEX_AI_SERVICE_ACCOUNT');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Use Service Role Key for direct DB access including cache table
const VERTEX_LOCATION = "us-central1";
const VERTEX_MODEL_ID = "gemini-2.0-flash-001";
const VERTEX_API_VERSION = "v1";
const REQUEST_TIMEOUT_MS = 45000;
const MAX_RETRIES = 1;
const CACHE_DURATION_HOURS = 24; // Cache insights for 24 hours
const CACHE_TABLE_NAME = 'ai_insights_cache'; // Name of the cache table
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// --- Authentication Functions (Keep as before) ---
function reformatPrivateKey(privateKey) {
  if (!privateKey || typeof privateKey !== 'string') return privateKey;
  try {
    let base64Content = privateKey.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
    base64Content = base64Content.replace(/[^A-Za-z0-9+/=]/g, '');
    const remainder = base64Content.length % 4;
    if (remainder > 0) base64Content += '='.repeat(4 - remainder);
    let formattedKey = "-----BEGIN PRIVATE KEY-----\n";
    for(let i = 0; i < base64Content.length; i += 64){
      formattedKey += base64Content.slice(i, i + 64) + "\n";
    }
    formattedKey += "-----END PRIVATE KEY-----";
    return formattedKey;
  } catch (error) {
    console.error("Error reformatting private key:", error);
    return privateKey;
  }
}
function validateServiceAccountJson(serviceAccountJson) {
  if (!serviceAccountJson) throw new Error("VERTEX_AI_SERVICE_ACCOUNT not set.");
  try {
    const parsed = JSON.parse(serviceAccountJson);
    const required = [
      "client_email",
      "private_key",
      "project_id",
      "type",
      "private_key_id"
    ];
    const missing = required.filter((f)=>!parsed[f]);
    if (missing.length > 0) throw new Error(`SA missing fields: ${missing.join(', ')}`);
    if (parsed.type !== 'service_account') throw new Error(`Invalid SA type: ${parsed.type}`);
    if (!parsed.private_key.includes("-----BEGIN PRIVATE KEY-----")) {
      console.warn("Private key missing BEGIN marker, attempting reformat.");
      parsed.private_key = reformatPrivateKey(parsed.private_key);
      if (!parsed.private_key.includes("-----BEGIN PRIVATE KEY-----")) {
        throw new Error("Private key format invalid even after reformat attempt.");
      }
    }
    return parsed;
  } catch (e) {
    throw new Error(`SA JSON validation failed: ${e.message}`);
  }
}
async function createJWT(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: serviceAccount.private_key_id
  };
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: expiry,
    scope: 'https://www.googleapis.com/auth/cloud-platform'
  };
  const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  let privateKeyPem = reformatPrivateKey(serviceAccount.private_key);
  const pemContents = privateKeyPem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const binaryDer = Uint8Array.from(atob(pemContents), (c)=>c.charCodeAt(0)).buffer;
  const cryptoKey = await crypto.subtle.importKey("pkcs8", binaryDer, {
    name: "RSASSA-PKCS1-v1_5",
    hash: "SHA-256"
  }, false, [
    "sign"
  ]);
  const signatureBuffer = await crypto.subtle.sign({
    name: "RSASSA-PKCS1-v1_5"
  }, cryptoKey, new TextEncoder().encode(signatureInput));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${signatureInput}.${encodedSignature}`;
}
async function getVertexAccessToken(serviceAccount) {
  try {
    const jwtToken = await createJWT(serviceAccount);
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwtToken
      })
    });
    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      throw new Error(`Token exchange failed (${tokenResponse.status}): ${errorBody}`);
    }
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) throw new Error("No access_token received.");
    console.log("Vertex AI Access Token obtained successfully.");
    return tokenData.access_token;
  } catch (error) {
    console.error("Error getting Vertex Access Token:", error);
    throw new Error(`Vertex Auth Error: ${error.message}`);
  }
}
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(()=>controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error(`Request timed out after ${timeoutMs}ms`);
    throw new Error(`Network or fetch error: ${error.message}`);
  } finally{
    clearTimeout(id);
  }
}
// --- Main Handler ---
serve(async (req)=>{
  console.log(`\n=== ${new Date().toISOString()} | Analytics Request: ${req.method} ${req.url} ===`);
  if (req.method === 'OPTIONS') return new Response(null, {
    headers: corsHeaders
  });
  if (req.method !== 'POST') return new Response(JSON.stringify({
    error: "Method Not Allowed"
  }), {
    status: 405,
    headers: {
      ...corsHeaders
    }
  });
  let serviceAccount;
  let supabaseAdminClient; // Use Admin client for direct DB access (cache table)
  try {
    // 1. Validate Env Vars and Service Account
    if (!VERTEX_AI_SERVICE_ACCOUNT || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables (Vertex SA, Supabase URL/Service Key)");
    }
    serviceAccount = validateServiceAccountJson(VERTEX_AI_SERVICE_ACCOUNT);
    console.log(`Using Vertex SA for project: ${serviceAccount.project_id}`);
    // Initialize Admin Supabase client for cache access
    supabaseAdminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false
      } // Important for server-side client
    });
    // 2. Parse request body (get dateRange, default type)
    const { dateRange: rawDateRange } = await req.json();
    const type = 'general'; // Default analysis type
    const dateRange = rawDateRange || 'last_30_days'; // Default date range if not provided
    // No longer checking for type/timeRange as type is defaulted and dateRange has a default
    const cacheKey = `${type}-${dateRange}`; // Create cache key using defaulted values
    console.log(`Request details: type=${type}, dateRange=${dateRange}, cacheKey=${cacheKey}`);
    // 3. Check Cache
    const cacheCutoff = new Date(Date.now() - CACHE_DURATION_HOURS * 60 * 60 * 1000).toISOString();
    console.log(`Checking cache for key '${cacheKey}' newer than ${cacheCutoff}`);
    const { data: cachedData, error: cacheError } = await supabaseAdminClient.from(CACHE_TABLE_NAME).select('insights_data, cached_at').eq('cache_key', cacheKey).gte('cached_at', cacheCutoff).maybeSingle();
    if (cacheError) {
      console.error("Error checking cache (continuing without cache):", cacheError.message);
    // Don't throw, just proceed without cache
    } else if (cachedData) {
      console.log(`Cache hit found! Returning cached insights from ${cachedData.cached_at}`);
      return new Response(JSON.stringify({
        insights: cachedData.insights_data.insights,
        timestamp: cachedData.insights_data.timestamp || cachedData.cached_at,
        source: 'cache' // Indicate response is from cache
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    } else {
      console.log("Cache miss or expired. Generating fresh insights.");
    }
    // --- If Cache Miss, Proceed ---
    // 4. User context block removed. Using admin client for data fetching.
    // 5. Get analytics data (using user client)
    console.log("Fetching analytics data from Supabase...");
    const { data: analyticsData, error: analyticsError } = await supabaseAdminClient.from('chat_analytics').select('*').order('created_at', {
      ascending: false
    }).limit(200); // Limit data processed
    if (analyticsError) throw new Error(`Error fetching analytics data: ${analyticsError.message}`);
    if (!analyticsData || analyticsData.length === 0) {
      console.log("No analytics data found for the user/period.");
      return new Response(JSON.stringify({
        insights: "Not enough data to generate insights.",
        timestamp: new Date().toISOString()
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`Fetched ${analyticsData.length} analytics records.`);
    // 6. Prepare Prompt
    const prompt = preparePromptData(analyticsData, type, dateRange);
    // 7. Get Vertex AI Access Token
    const accessToken = await getVertexAccessToken(serviceAccount);
    // 8. Call Vertex AI API
    console.log("Calling Vertex AI API...");
    const vertexEndpoint = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/${VERTEX_API_VERSION}/projects/${serviceAccount.project_id}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_MODEL_ID}:generateContent`;
    const vertexRequestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 1500,
        topP: 0.9,
        topK: 40
      }
    };
    const vertexResponse = await fetchWithTimeout(vertexEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(vertexRequestBody)
    }, REQUEST_TIMEOUT_MS);
    // 9. Process Vertex AI Response
    if (!vertexResponse.ok) {
      const errorBody = await vertexResponse.text();
      console.error(`Vertex AI API error (${vertexResponse.status}):`, errorBody);
      throw new Error(`Vertex AI API Error (${vertexResponse.status}): ${errorBody}`);
    }
    const vertexData = await vertexResponse.json();
    const insights = vertexData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!insights && vertexData.candidates?.[0]?.finishReason !== 'STOP') {
      const reason = vertexData.candidates?.[0]?.finishReason || 'Unknown';
      throw new Error(`Insight generation failed or was blocked (Reason: ${reason}).`);
    } else if (!insights) {
      throw new Error("Failed to generate insights (empty response received).");
    }
    console.log("Insights generated successfully from Vertex AI.");
    // 10. Store Result in Cache (use admin client)
    const insightResultToCache = {
      insights: insights,
      timestamp: new Date().toISOString()
    };
    const { error: cacheWriteError } = await supabaseAdminClient.from(CACHE_TABLE_NAME).upsert({
      cache_key: cacheKey,
      insights_data: insightResultToCache,
      cached_at: new Date().toISOString()
    }, {
      onConflict: 'cache_key'
    }); // Upsert based on the key
    if (cacheWriteError) {
      console.error("Failed to write insights to cache:", cacheWriteError.message);
    // Log error but don't fail the request
    } else {
      console.log(`Successfully cached insights for key: ${cacheKey}`);
    }
    // 11. Return Success Response
    return new Response(JSON.stringify({
      insights: insights,
      timestamp: insightResultToCache.timestamp,
      source: 'live' // Indicate fresh result
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    // --- Centralized Error Handling ---
    console.error('Error in analytics-insights function:', error);
    let statusCode = 500;
    let clientMessage = `An internal error occurred: ${error.message}`;
    // ... (keep previous error status code mapping) ...
    if (error.message.includes("Missing Authorization") || error.message.includes("Authentication failed")) statusCode = 401;
    else if (error.message.includes("body")) statusCode = 400; // Removed specific check for type/timeRange
    else if (error.message.includes("Permission denied") || error.message.includes("Vertex Auth Error")) clientMessage = "Permission/Auth error.";
    else if (error.message.includes("Vertex AI API Error")) statusCode = 502;
    else if (error.message.includes("Service account") || error.message.includes("environment variables")) clientMessage = "Config error.";
    return new Response(JSON.stringify({
      error: clientMessage,
      details: error.message,
      insights: null
    }), {
      status: statusCode,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
// --- Data Processing Helpers (Unchanged) ---
function preparePromptData(analyticsData, type = 'general', dateRange = 'last_30_days') {
  const currentDate = new Date();
  let fromDate = new Date();
  // Map dateRange values to actual dates
  if (dateRange === 'last_7_days') fromDate.setDate(currentDate.getDate() - 7);
  else if (dateRange === 'last_30_days') fromDate.setDate(currentDate.getDate() - 30);
  else if (dateRange === 'last_90_days') fromDate.setDate(currentDate.getDate() - 90);
  else if (dateRange === 'all_time') fromDate = new Date(0);
  else { // Default to last 30 days if range is unrecognized
      console.warn(`Unrecognized dateRange '${dateRange}', defaulting to last_30_days.`);
      fromDate.setDate(currentDate.getDate() - 30);
      dateRange = 'last_30_days'; // Correct the range variable for the prompt string
  }

  const filteredData = analyticsData.filter((item)=>new Date(item.created_at) >= fromDate);
  if (filteredData.length === 0) return "No data available for the selected period.";
  const topQueries = getTopQueries(filteredData, 15);
  const sourceCounts = getSourceCounts(filteredData);
  const successRate = calculateSuccessRate(filteredData);
  const userPatterns = analyzeUserPatterns(filteredData);
  const contentGaps = findContentGaps(filteredData);
  const failure = filteredData.length - successRate.success;
  let prompt = `You are an expert business acquisition analyst reviewing usage data for a chatbot designed to help users find and evaluate businesses for sale based on Carl Allen's teachings. Analyze the following data from the ${dateRange.replace(/_/g, ' ')} period:\n\n## Key Metrics:\n*   Total Queries: ${filteredData.length}\n*   Success Rate: ${successRate.rate}% (${successRate.success} success / ${failure} failure)\n*   Avg Queries/Conversation: ${userPatterns.avgQueriesPerConversation}\n*   User Return Rate: ${userPatterns.returnRate}%\n*   External Search Needed: ${contentGaps.percentage}% of queries\n\n## Top Query Sources:\n${formatSourceData(sourceCounts)}\n\n## Top 15 User Queries:\n${topQueries.map((q, i)=>`${i + 1}. "${q.query}" (${q.count})`).join('\n')}\n\n`;
  // Refined prompts based on admin needs
  switch(type){
    case 'content-gaps':
      prompt += `## Content Gap & User Confusion Analysis:\nBased on the queries, especially those requiring external search or resulting in low success rates, identify specific topics or questions related to Carl Allen's deal-making process where users seem confused or the available content is insufficient. What recurring themes indicate knowledge gaps? Suggest potential new content topics or clarifications needed.`;
      break;
    case 'user-behavior':
      prompt += `## User Strategy & Interaction Analysis:\nAnalyze the sequence and nature of user queries within conversations. What deal-making strategies or phases (e.g., sourcing, valuation, negotiation, due diligence) are users focusing on? Are there common patterns in how users interact with the bot? Identify any potentially inefficient or misguided user approaches based on Carl Allen's teachings.`;
      break;
    case 'performance':
      prompt += `## Chatbot Performance & Effectiveness Analysis:\nEvaluate the chatbot's overall effectiveness in answering user queries related to deal-making. Focus on the success rate, instances requiring external search, and query sources. Are there specific types of questions the bot struggles with? Provide actionable recommendations for improving the bot's knowledge base or response generation based on this data.`;
      break;
    default: // General
      prompt += `## General Strategic Insights for Admin:\nProvide a high-level overview for the app administrator. Summarize the most frequent user interests (top queries), identify potential areas of user confusion or content gaps (high external search rate queries), and highlight key user behavior patterns observed during the ${dateRange.replace(/_/g, ' ')} period. Offer 1-2 strategic recommendations for improving the user experience or content based on this data.`;
  }
  return prompt;
}
function getTopQueries(data, limit = 10) {
  const queryCounts = {};
  data.forEach((item)=>{
    if (item.query) queryCounts[item.query] = (queryCounts[item.query] || 0) + 1;
  });
  return Object.entries(queryCounts).map(([query, count])=>({
      query,
      count
    })).sort((a, b)=>b.count - a.count).slice(0, limit);
}
function getSourceCounts(data) {
  const sourceCounts = {};
  data.forEach((item)=>{
    const source = item.source_type || 'unknown';
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });
  return sourceCounts;
}
function formatSourceData(sourceCounts) {
  return Object.entries(sourceCounts).sort((a, b)=>b[1] - a[1]).map(([source, count])=>`- ${formatSourceName(source)}: ${count}`).join('\n');
}
function formatSourceName(source) {
  return (source.charAt(0).toUpperCase() + source.slice(1)).replace(/_/g, ' ').replace(/ call$/i, ' Call').replace(/^Sba$/i, 'SBA');
}
function calculateSuccessRate(data) {
  const total = data.length;
  if (total === 0) return {
    success: 0,
    failure: 0,
    rate: 0
  };
  const success = data.filter((item)=>item.successful === true).length;
  const failure = total - success;
  const rate = Math.round(success / total * 100);
  return {
    success,
    failure,
    rate
  };
}
function analyzeUserPatterns(data) {
  const conversationCounts = {};
  data.forEach((item)=>{
    if (item.conversation_id) conversationCounts[item.conversation_id] = (conversationCounts[item.conversation_id] || 0) + 1;
  });
  const conversations = Object.keys(conversationCounts).length;
  const totalQueries = data.length;
  const avgQueriesPerConversation = conversations > 0 ? +(totalQueries / conversations).toFixed(1) : 0;
  const returningConversations = Object.values(conversationCounts).filter((count)=>count > 1).length;
  const returnRate = conversations > 0 ? Math.round(returningConversations / conversations * 100) : 0;
  return {
    avgQueriesPerConversation,
    returnRate
  };
}
function findContentGaps(data) {
  const total = data.length;
  if (total === 0) return {
    count: 0,
    percentage: 0,
    topQueries: []
  };
  const externalSource = data.filter((item)=>item.used_online_search === true || item.source_type === 'fallback');
  const count = externalSource.length;
  const percentage = Math.round(count / total * 100);
  const topExternalQueries = {};
  externalSource.forEach((item)=>{
    if (item.query) topExternalQueries[item.query] = (topExternalQueries[item.query] || 0) + 1;
  });
  const topQueries = Object.entries(topExternalQueries).map(([query, count])=>({
      query,
      count
    })).sort((a, b)=>b.count - a.count).slice(0, 5);
  return {
    count,
    percentage,
    topQueries
  };
}
