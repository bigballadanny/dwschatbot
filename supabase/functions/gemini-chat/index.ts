
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const VERTEX_AI_SERVICE_ACCOUNT = Deno.env.get('VERTEX_AI_SERVICE_ACCOUNT');
const GEMINI_2_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const GEMINI_FALLBACK_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

// Vertex AI API endpoints
const VERTEX_PROJECT_ID = "ai-vertex-anyproject"; // Will be extracted from the service account
const VERTEX_LOCATION = "us-central1";
const VERTEX_MODEL_ID = "gemini-1.5-pro";
const VERTEX_API_VERSION = "v1";
const VERTEX_API_BASE_URL = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/${VERTEX_API_VERSION}`;

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

// Function to handle Vertex AI authentication
async function getVertexAccessToken() {
  try {
    if (!VERTEX_AI_SERVICE_ACCOUNT) {
      throw new Error("Vertex AI service account not configured");
    }
    
    // Parse the service account JSON
    const serviceAccount = JSON.parse(VERTEX_AI_SERVICE_ACCOUNT);
    
    // Use the client_email and private_key from the service account to get a token
    const jwtToken = await createJWT(serviceAccount);
    
    // Exchange JWT for Google OAuth token
    const tokenResponse = await fetch(
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
      }
    );
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error("Failed to get access token:", tokenData);
      throw new Error("Failed to authenticate with Vertex AI");
    }
    
    return tokenData.access_token;
  } catch (error) {
    console.error("Error getting Vertex AI access token:", error);
    throw error;
  }
}

// Helper function to create a JWT token
async function createJWT(serviceAccount) {
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
  
  // We need to implement RSA-SHA256 signing
  // For this example, we'll use a placeholder as implementing RSA-SHA256 in Deno
  // would require additional crypto libraries
  // In a real implementation, you would use the appropriate crypto library
  
  // This is a simplified approach and would need proper RSA-SHA256 implementation
  const privateKey = serviceAccount.private_key;
  // Convert PEM encoded key to binary
  const binaryKey = atob(privateKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, ''));
  
  // Create a crypto key from the binary
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
}

// Function to call Vertex AI Prediction API
async function callVertexAI(messages, temperature = 0.7) {
  try {
    const accessToken = await getVertexAccessToken();
    
    const serviceAccount = JSON.parse(VERTEX_AI_SERVICE_ACCOUNT);
    const projectId = serviceAccount.project_id || VERTEX_PROJECT_ID;
    
    const endpoint = `${VERTEX_API_BASE_URL}/projects/${projectId}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_MODEL_ID}:predict`;
    
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
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Vertex AI API error:", errorText);
      throw new Error(`Vertex AI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract the generated text from the response
    const generatedText = data.predictions[0]?.candidates[0]?.content || "";
    
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
    // Check if we have Gemini API key or Vertex AI credentials
    const useVertexAI = !!VERTEX_AI_SERVICE_ACCOUNT;
    const useGemini = !!GEMINI_API_KEY;
    
    if (!useVertexAI && !useGemini) {
      console.error("No AI API credentials configured (Gemini or Vertex AI)");
      return new Response(JSON.stringify({ 
        content: "The AI service is not properly configured. Please check your environment variables.",
        source: 'system',
        error: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log("Available AI services:", {
      "VertexAI": useVertexAI ? "Enabled" : "Disabled",
      "GeminiAPI": useGemini ? "Enabled" : "Disabled"
    });

    const { query, messages, context, instructions, sourceType, enableOnlineSearch } = await req.json();
    
    if (checkRateLimit()) {
      console.log("Rate limit exceeded, returning fallback response");
      return new Response(JSON.stringify({ 
        content: "We're receiving too many requests right now. Please try again in a minute.",
        source: 'system',
        error: true
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const formattedMessages = messages.map(msg => ({
      role: msg.source === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    let hasSystemPrompt = false;
    for (const msg of formattedMessages) {
      if (msg.role === 'model' && msg.parts[0].text.includes("You are an AI assistant")) {
        hasSystemPrompt = true;
        break;
      }
    }

    if (!hasSystemPrompt) {
      formattedMessages.unshift({
        role: 'model',
        parts: [{ text: SYSTEM_PROMPT }]
      });
    }

    if (context) {
      formattedMessages.unshift({
        role: 'model',
        parts: [{ text: `Context: ${context}` }]
      });
    }
    
    console.log("Query:", query);
    console.log("Source type:", sourceType || "None specified");
    console.log("Messages count:", formattedMessages.length);
    
    const cacheKey = generateCacheKey(formattedMessages);
    const cachedResponse = CACHE_ENABLED ? messageCache.get(cacheKey) : null;
    
    if (cachedResponse) {
      console.log("Cache hit! Returning cached response");
      return new Response(JSON.stringify(cachedResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    recordRequest();
    
    let response = null;
    let generatedText = "";
    let modelUsed = useVertexAI ? "vertex-ai" : "gemini-2.0-flash";
    
    // Try Vertex AI first if available
    if (useVertexAI) {
      try {
        console.log("Calling Vertex AI API");
        response = await callVertexAI(formattedMessages);
        generatedText = response?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (generatedText && generatedText.length > 20) {
          console.log("Vertex AI response successful, length:", generatedText.length);
        } else {
          console.log("Vertex AI returned empty response, trying Gemini API");
          throw new Error("Vertex AI returned empty response");
        }
      } catch (vertexError) {
        console.error("Vertex AI error:", vertexError);
        
        // If Vertex AI fails and we have Gemini API key, try Gemini
        if (useGemini) {
          modelUsed = "gemini-2.0-flash";
        } else {
          throw vertexError; // Re-throw if we don't have Gemini as fallback
        }
      }
    }
    
    // If we need to use Gemini (either as primary or fallback)
    if (useGemini && (!generatedText || generatedText.length < 20)) {
      const maxRetries = 1;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Gemini API attempt ${attempt + 1}/${maxRetries + 1}`);
          
          const useGemini2 = (attempt < 1);
          const apiUrl = useGemini2 ? GEMINI_2_API_URL : GEMINI_FALLBACK_API_URL;
          modelUsed = useGemini2 ? "gemini-2.0-flash" : "gemini-1.5-pro";
          
          const temperature = 0.7 + (attempt * 0.1);
          
          let messagesForRequest = formattedMessages;
          if (attempt > 0 && formattedMessages.length > 5) {
            const systemMessages = formattedMessages.filter(m => 
              m.role === 'model' && m.parts[0].text.includes("You are an AI assistant")
            );
            const recentMessages = formattedMessages.slice(-8);
            messagesForRequest = [...systemMessages, ...recentMessages];
            console.log("Using reduced message count for retry:", messagesForRequest.length);
          }
          
          const requestBody = {
            contents: messagesForRequest,
            generationConfig: {
              temperature: temperature,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 4096,
            },
          };
          
          console.log("Request structure:", JSON.stringify({
            model: `Using ${modelUsed}`,
            msgCount: messagesForRequest.length,
            temperature,
            maxTokens: 4096
          }));
          
          const apiResponse = await fetch(`${apiUrl}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          });
          
          console.log(`Attempt ${attempt + 1} status:`, apiResponse.status);
          
          if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error(`API error on attempt ${attempt + 1}:`, errorText);
            
            if (apiResponse.status === 429) {
              console.log("Rate limit hit, waiting before retry");
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
            
            continue;
          }
          
          response = await apiResponse.json();
          
          generatedText = response?.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (generatedText && generatedText.length > 20) {
            console.log("Successful response on attempt", attempt + 1, "using model:", modelUsed);
            console.log("Response length:", generatedText.length);
            break;
          } else {
            console.log("Empty response received, will retry");
          }
        } catch (error) {
          console.error(`Error on attempt ${attempt + 1}:`, error);
        }
      }
    }
    
    if (!generatedText || generatedText.length < 20) {
      console.log("All API attempts failed, using fallback");
      return new Response(JSON.stringify({ 
        content: FALLBACK_RESPONSE,
        source: 'fallback',
        model: "fallback"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const responseObj = { 
      content: generatedText,
      source: enableOnlineSearch && sourceType === 'web' ? 'web' : 'gemini',
      model: modelUsed
    };
    
    if (CACHE_ENABLED) {
      messageCache.set(cacheKey, responseObj);
      
      if (messageCache.size > 1000) {
        const keysToDelete = [...messageCache.keys()].slice(0, 300);
        keysToDelete.forEach(key => messageCache.delete(key));
      }
    }
    
    return new Response(JSON.stringify(responseObj), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in gemini-chat function:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      source: 'system',
      content: "I'm sorry, there was an error processing your request. Please try again later."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
