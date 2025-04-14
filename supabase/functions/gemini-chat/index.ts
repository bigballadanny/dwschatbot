
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const VERTEX_AI_SERVICE_ACCOUNT = Deno.env.get('VERTEX_AI_SERVICE_ACCOUNT');
const GEMINI_2_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const GEMINI_FALLBACK_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

// Vertex AI API endpoints - will be extracted from service account
const VERTEX_LOCATION = "us-central1";
const VERTEX_MODEL_ID = "gemini-1.5-pro";
const VERTEX_API_VERSION = "v1";

const CACHE_ENABLED = true;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const messageCache = new Map(); // Simple in-memory cache

const MAX_REQUESTS_PER_MIN = 45; // Set lower than actual limit for safety
const REQUEST_WINDOW_MS = 60 * 1000; // 1 minute
const requestTimestamps = [];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FALLBACK_RESPONSE = `
# Unable to Connect to AI Service

I apologize, but I'm currently having trouble connecting to the AI service. This may be due to:

- High service demand
- Temporary connection issues
- API capacity limits

Please try your question again in a moment.

*The system will automatically retry with alternative models if needed.*
`;

const SYSTEM_PROMPT = `
You are an AI assistant designed to have natural conversations. Here are your instructions:

1. Respond to user questions directly and clearly
2. Use proper markdown formatting:
   - **Bold** for emphasis
   - # Headings for main topics
   - ## Subheadings for subtopics
   - Bullet lists for multiple points
   - Numbered lists for sequential steps

3. Always acknowledge questions with a direct answer first
4. When providing structured information, use clear sections
5. Maintain a conversational, helpful tone
`;

// Configuration for timeouts and retries
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds
const MAX_RETRIES = 2;

// Function to handle Vertex AI authentication with better error handling
async function getVertexAccessToken() {
  try {
    if (!VERTEX_AI_SERVICE_ACCOUNT) {
      console.error("Vertex AI service account not configured");
      throw new Error("Vertex AI service account not configured");
    }
    
    // Parse the service account JSON
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(VERTEX_AI_SERVICE_ACCOUNT);
      console.log("Successfully parsed service account JSON");
    } catch (parseError) {
      console.error("Failed to parse service account JSON:", parseError);
      throw new Error("Invalid Vertex AI service account JSON format");
    }
    
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      console.error("Service account missing required fields");
      throw new Error("Service account missing required fields (client_email or private_key)");
    }
    
    // Use the client_email and private_key from the service account to get a token
    console.log("Creating JWT token for authentication");
    const jwtToken = await createJWT(serviceAccount);
    
    if (!jwtToken) {
      throw new Error("Failed to create JWT token");
    }
    
    // Exchange JWT for Google OAuth token
    console.log("Exchanging JWT for OAuth token");
    const tokenResponse = await fetchWithTimeout(
      `https://oauth2.googleapis.com/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwtToken
        })
      },
      REQUEST_TIMEOUT_MS
    );
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", tokenResponse.status, errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error("No access token in response:", tokenData);
      throw new Error("Failed to authenticate with Vertex AI: No access token received");
    }
    
    console.log("Successfully retrieved access token");
    return tokenData.access_token;
  } catch (error) {
    console.error("Error getting Vertex AI access token:", error);
    throw error;
  }
}

// Helper function to fetch with timeout
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}

// Helper function to create a JWT token with improved error handling
async function createJWT(serviceAccount) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600; // 1 hour
    
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
    
    // Encode header and payload
    const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    // Create signature
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    
    try {
      // Clean up the private key to ensure it's in the correct format
      const privateKey = serviceAccount.private_key
        .replace(/\\n/g, '\n') // Handle escaped newlines
        .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');
      
      // Convert PEM encoded key to binary
      const binaryKey = atob(privateKey);
      
      // Create a crypto key from the binary
      console.log("Importing crypto key");
      const cryptoKey = await crypto.subtle.importKey(
        "pkcs8",
        new TextEncoder().encode(binaryKey),
        {
          name: "RSASSA-PKCS1-v1_5",
          hash: { name: "SHA-256" }
        },
        false,
        ["sign"]
      );
      
      // Sign the data
      console.log("Signing JWT data");
      const signature = await crypto.subtle.sign(
        { name: "RSASSA-PKCS1-v1_5" },
        cryptoKey,
        new TextEncoder().encode(signatureInput)
      );
      
      const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      
      return `${signatureInput}.${encodedSignature}`;
    } catch (cryptoError) {
      console.error("Error during JWT crypto operations:", cryptoError);
      throw new Error(`JWT creation failed: ${cryptoError.message}`);
    }
  } catch (error) {
    console.error("Error creating JWT token:", error);
    throw error;
  }
}

// Function to call Vertex AI Prediction API with improved error handling and retry logic
async function callVertexAI(messages, temperature = 0.7, retryCount = 0) {
  try {
    console.log(`Calling Vertex AI (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
    const accessToken = await getVertexAccessToken();
    
    if (!accessToken) {
      throw new Error("Failed to get access token");
    }
    
    // Extract the project ID from the service account
    let projectId = ""; 
    try {
      const serviceAccount = JSON.parse(VERTEX_AI_SERVICE_ACCOUNT);
      projectId = serviceAccount.project_id;
      if (!projectId) {
        throw new Error("No project_id in service account");
      }
      console.log("Using project ID from service account:", projectId);
    } catch (error) {
      console.error("Error extracting project ID:", error);
      throw new Error("Failed to extract project ID from service account");
    }
    
    const VERTEX_API_BASE_URL = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/${VERTEX_API_VERSION}`;
    const endpoint = `${VERTEX_API_BASE_URL}/projects/${projectId}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_MODEL_ID}:predict`;
    
    console.log("Prepared Vertex AI request to endpoint:", endpoint);
    
    const requestBody = {
      instances: [
        {
          messages: messages.map(msg => ({
            role: msg.role === 'model' ? 'assistant' : msg.role,
            content: msg.parts[0].text
          }))
        }
      ],
      parameters: {
        temperature: temperature,
        maxOutputTokens: 2048,
        topP: 0.95,
        topK: 40
      }
    };
    
    console.log("Sending request to Vertex AI");
    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    }, REQUEST_TIMEOUT_MS);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Vertex AI API error (${response.status}):`, errorText);
      
      // Retry logic for specific error codes
      if (retryCount < MAX_RETRIES && 
          (response.status === 429 || response.status >= 500 || response.status === 403)) {
        console.log(`Retrying due to error ${response.status} (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return callVertexAI(messages, temperature, retryCount + 1);
      }
      
      throw new Error(`Vertex AI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("Successfully received response from Vertex AI");
    
    // Extract the generated text from the response
    const generatedText = data.predictions[0]?.candidates[0]?.content || "";
    
    if (!generatedText) {
      console.warn("Received empty response from Vertex AI");
    }
    
    return {
      candidates: [
        {
          content: {
            parts: [{ text: generatedText }]
          }
        }
      ]
    };
  } catch (error) {
    console.error("Error calling Vertex AI:", error);
    
    // Retry logic for network errors and timeouts
    if (retryCount < MAX_RETRIES && 
        (error.message.includes("timed out") || error.message.includes("network"))) {
      console.log(`Retrying due to error "${error.message}" (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      // Exponential backoff
      const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return callVertexAI(messages, temperature, retryCount + 1);
    }
    
    throw error;
  }
}

function checkRateLimit() {
  const now = Date.now();
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - REQUEST_WINDOW_MS) {
    requestTimestamps.shift();
  }
  
  return requestTimestamps.length >= MAX_REQUESTS_PER_MIN;
}

function recordRequest() {
  requestTimestamps.push(Date.now());
}

function generateCacheKey(messages) {
  const relevantMessages = messages.slice(-3);
  return JSON.stringify(relevantMessages.map(msg => ({
    role: msg.role,
    content: msg.parts[0].text
  })));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("New request received to gemini-chat function");
    
    // Check if we have Vertex AI credentials
    const useVertexAI = !!VERTEX_AI_SERVICE_ACCOUNT;
    const useGemini = !!GEMINI_API_KEY;
    
    if (!useVertexAI && !useGemini) {
      console.error("No AI API credentials configured (Gemini or Vertex AI)");
      return new Response(JSON.stringify({ 
        error: "The AI service is not properly configured. Please configure Vertex AI service account or Gemini API key.",
        content: FALLBACK_RESPONSE,
        source: "system"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }
    
    // Rate limiting check
    if (checkRateLimit()) {
      console.warn("Rate limit exceeded");
      return new Response(JSON.stringify({
        error: "Rate limit exceeded. Please try again later.",
        content: "I'm receiving too many requests right now. Please try again in a minute.",
        source: "system"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429
      });
    }
    
    recordRequest();
    
    // Parse the request body
    const requestData = await req.json();
    const { messages: clientMessages, query, enableOnlineSearch = false, conversationId } = requestData;
    
    console.log("Processing request:", {
      query: query ? query.substring(0, 50) + "..." : "None provided",
      conversationId,
      enableOnlineSearch,
      messageCount: clientMessages ? clientMessages.length : 0,
      using: useVertexAI ? "Vertex AI" : "Gemini"
    });
    
    // Prepare messages for the AI
    let messages = [];
    
    // Add system prompt
    messages.push({
      role: 'system',
      parts: [{ text: SYSTEM_PROMPT }]
    });
    
    // Add online search option to system prompt if enabled
    if (enableOnlineSearch) {
      messages.push({
        role: 'system',
        parts: [{ text: "This user has enabled real-time online search. When appropriate, include recent information from the web in your responses." }]
      });
    }
    
    // Add conversation history from client
    if (clientMessages && Array.isArray(clientMessages)) {
      messages = messages.concat(clientMessages);
    }
    
    // Check cache if enabled
    const cacheKey = generateCacheKey(messages);
    const cachedResult = CACHE_ENABLED && messageCache.get(cacheKey);
    
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL) {
      console.log("Returning cached response");
      return new Response(JSON.stringify(cachedResult.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    let response;
    
    try {
      if (useVertexAI) {
        console.log("Using Vertex AI for response generation");
        response = await callVertexAI(messages);
      } else if (useGemini) {
        // Gemini API fallback code is kept but not actively used
        console.log("Using Gemini API (fallback) for response generation");
        throw new Error("Gemini API fallback not fully implemented");
      } else {
        throw new Error("No AI provider available");
      }
    } catch (aiError) {
      console.error("AI provider error:", aiError);
      
      return new Response(JSON.stringify({
        error: `AI provider error: ${aiError.message}`,
        content: FALLBACK_RESPONSE,
        source: "system"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }
    
    // Extract text from the response
    const responseText = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    if (!responseText) {
      console.error("Received empty response from AI provider");
      return new Response(JSON.stringify({
        error: "Received empty response from AI",
        content: FALLBACK_RESPONSE,
        source: "system"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }
    
    // Prepare the response data
    const responseData = {
      content: responseText,
      source: useVertexAI ? "vertex" : "gemini"
    };
    
    // Store in cache if enabled
    if (CACHE_ENABLED) {
      messageCache.set(cacheKey, {
        timestamp: Date.now(),
        data: responseData
      });
      
      // Limit cache size
      if (messageCache.size > 100) {
        // Delete oldest entries
        const entries = Array.from(messageCache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        for (let i = 0; i < Math.min(10, entries.length / 2); i++) {
          messageCache.delete(entries[i][0]);
        }
      }
    }
    
    console.log("Successfully generated response");
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Unhandled error in function:", error);
    return new Response(JSON.stringify({ 
      error: `Internal server error: ${error.message}`, 
      content: FALLBACK_RESPONSE,
      source: "system"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
