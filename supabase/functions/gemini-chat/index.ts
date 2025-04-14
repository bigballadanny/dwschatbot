
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

// Add the validation utility directly in the edge function
// This replaces the external import with an inline implementation
interface ValidationResult {
  isValid: boolean;
  error?: string;
  errorDetails?: Record<string, string>;
}

/**
 * Validates a chat API request object 
 * @param request The request data to validate
 * @returns ValidationResult with validation status and any errors
 */
function validateChatApiRequest(request: any): ValidationResult {
  // Check if request is null/undefined
  if (!request) {
    return {
      isValid: false,
      error: "Request body is missing"
    };
  }

  const errors: Record<string, string> = {};
  
  // Validate messages array
  if (!Array.isArray(request.messages)) {
    errors.messages = "Messages must be an array";
  } else if (request.messages.length === 0) {
    errors.messages = "Messages array cannot be empty";
  } else {
    // Validate message format (sample of first 5 messages)
    const invalidMessages = request.messages.slice(0, 5).filter(msg => {
      return !msg || typeof msg !== 'object' || 
        (!msg.content && !msg.parts) ||
        (msg.source !== 'user' && msg.source !== 'gemini' && 
         msg.source !== 'system' && msg.role !== 'user' && 
         msg.role !== 'model' && msg.role !== 'system');
    });
    
    if (invalidMessages.length > 0) {
      errors.messageFormat = "One or more messages have invalid format";
    }
  }
  
  // Validate query (optional but should be string if provided)
  if (request.query !== undefined && (typeof request.query !== 'string' || request.query.trim().length === 0)) {
    errors.query = "Query must be a non-empty string";
  }
  
  // Validate conversationId (optional but should be string/UUID if provided)
  if (request.conversationId !== undefined && 
      request.conversationId !== null && 
      (typeof request.conversationId !== 'string' || request.conversationId.trim().length === 0)) {
    errors.conversationId = "Conversation ID must be a non-empty string";
  }
  
  // Validate enableOnlineSearch (optional but should be boolean if provided)
  if (request.enableOnlineSearch !== undefined && typeof request.enableOnlineSearch !== 'boolean') {
    errors.enableOnlineSearch = "enableOnlineSearch must be a boolean";
  }
  
  // Return validation result
  if (Object.keys(errors).length > 0) {
    return {
      isValid: false,
      error: "Invalid request format",
      errorDetails: errors
    };
  }
  
  return {
    isValid: true
  };
}

/**
 * Helper to normalize message format between different API formats
 * Handles both Vertex AI and OpenAI/Gemini formats
 */
function normalizeMessage(message: any): { role: string, content: string } {
  if (!message) {
    return { role: 'user', content: '' };
  }
  
  // Extract role - handle different formats
  let role = 'user';
  if (message.role) {
    role = message.role;
  } else if (message.source) {
    role = message.source === 'user' ? 'user' : 
           message.source === 'system' ? 'system' : 'assistant';
  }
  
  // Extract content - handle different formats
  let content = '';
  if (typeof message.content === 'string') {
    content = message.content;
  } else if (message.parts && Array.isArray(message.parts) && message.parts.length > 0) {
    if (typeof message.parts[0] === 'string') {
      content = message.parts[0];
    } else if (message.parts[0] && message.parts[0].text) {
      content = message.parts[0].text;
    }
  }
  
  return { role, content };
}

/**
 * Tests if a value appears to be a valid UUID
 */
function isValidUuid(value: any): boolean {
  if (typeof value !== 'string') return false;
  
  // Simple UUID format validation
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(value);
}

/**
 * Sanitizes user input to prevent common security issues
 * @param input The user input to sanitize
 * @returns Sanitized string
 */
function sanitizeUserInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Basic sanitization for display contexts
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Function to handle Vertex AI authentication with better error handling
async function getVertexAccessToken() {
  console.log("Starting Vertex AI authentication");
  try {
    if (!VERTEX_AI_SERVICE_ACCOUNT) {
      console.error("Vertex AI service account not configured");
      throw new Error("Vertex AI service account not configured");
    }
    
    // Log that we're about to parse the service account (without revealing it)
    console.log("Attempting to parse service account JSON");
    
    // Parse the service account JSON
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(VERTEX_AI_SERVICE_ACCOUNT);
      console.log("Successfully parsed service account JSON with keys:", Object.keys(serviceAccount).join(", "));
      
      // Check for required fields without logging sensitive data
      const requiredFields = ["client_email", "private_key", "project_id"];
      const missingFields = requiredFields.filter(field => !serviceAccount[field]);
      
      if (missingFields.length > 0) {
        console.error("Service account missing required fields:", missingFields);
        throw new Error(`Service account missing required fields: ${missingFields.join(", ")}`);
      }

      // Apply special fix for primitive key format errors
      if (serviceAccount.private_key) {
        serviceAccount.private_key = fixPrivateKeyFormat(serviceAccount.private_key);
        console.log("Applied private key formatting fixes");
      }
    } catch (parseError) {
      console.error("Failed to parse service account JSON:", parseError);
      throw new Error("Invalid Vertex AI service account JSON format");
    }
    
    // Create JWT token for authentication
    console.log("Creating JWT token using service account");
    try {
      const jwtToken = await createJWT(serviceAccount);
      if (!jwtToken) {
        throw new Error("JWT token creation failed");
      }
      console.log("JWT token created successfully");
    
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
    } catch (jwtError) {
      console.error("Error in JWT or token exchange process:", jwtError);
      throw jwtError;
    }
  } catch (error) {
    console.error("Error getting Vertex AI access token:", error);
    throw error;
  }
}

// Special function to fix primitive key format issues
function fixPrivateKeyFormat(privateKey) {
  if (!privateKey) return privateKey;
  
  try {
    // First, handle escaped newlines by replacing them with actual newlines
    let processedKey = privateKey.replace(/\\n/g, '\n');
    
    // Check if the key already has proper PEM markers
    const hasBeginMarker = processedKey.includes('-----BEGIN PRIVATE KEY-----');
    const hasEndMarker = processedKey.includes('-----END PRIVATE KEY-----');
    
    // If the key already has proper markers, extract just the base64 content
    if (hasBeginMarker && hasEndMarker) {
      // Extract just the base64 content between markers
      let base64Content = processedKey
        .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, '')
        .replace(/\s/g, '');
      
      // Format with proper structure - EXACTLY 64 characters per line
      return formatPEMKey(base64Content);
    } 
    // If the key doesn't have proper markers, treat the whole thing as base64 content
    else {
      // Clean the input to get just the base64 content
      let base64Content = processedKey.replace(/\s/g, '');
      
      // Format into proper PEM structure
      return formatPEMKey(base64Content);
    }
  } catch (error) {
    console.error("Error fixing private key format:", error);
    return privateKey; // Return original if we can't fix it
  }
}

// Helper function to create properly formatted PEM key
function formatPEMKey(base64Content) {
  // Clean the base64 content first
  let cleanBase64 = base64Content.replace(/\s/g, '');
  
  // Remove any non-base64 characters
  cleanBase64 = cleanBase64.replace(/[^A-Za-z0-9+/=]/g, '');
  
  // Ensure the base64 string length is valid (must be a multiple of 4)
  const remainder = cleanBase64.length % 4;
  if (remainder > 0) {
    cleanBase64 += '='.repeat(4 - remainder);
  }
  
  // Format with EXACTLY 64 characters per line - THIS IS CRITICAL for ASN.1 SEQUENCE parsing
  let formattedContent = `-----BEGIN PRIVATE KEY-----\n`;
  for (let i = 0; i < cleanBase64.length; i += 64) {
    formattedContent += cleanBase64.slice(i, i + 64) + '\n';
  }
  formattedContent += `-----END PRIVATE KEY-----`;
  
  return formattedContent;
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
    
    console.log("JWT header and payload prepared");
    
    // Encode header and payload
    const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    // Create signature
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    
    try {
      // Clean up the private key to ensure it's in the correct format
      console.log("Processing private key");
      let privateKey = serviceAccount.private_key;
      
      // Check if the private key is properly formatted
      if (!privateKey.includes("BEGIN PRIVATE KEY") || !privateKey.includes("END PRIVATE KEY")) {
        console.error("Private key is not properly formatted");
        throw new Error("Invalid private key format in service account");
      }
      
      // Clean up the key
      privateKey = privateKey
        .replace(/\\n/g, '\n') // Handle escaped newlines
        .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');
      
      console.log("Private key cleaned, attempting to create crypto key");
      
      try {
        // Convert PEM encoded key to binary
        const binaryKey = atob(privateKey);
        
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
        
        console.log("Crypto key created successfully, signing data");
        
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
        
        console.log("JWT token signed successfully");
        return `${signatureInput}.${encodedSignature}`;
      } catch (cryptoError) {
        console.error("Error during crypto operations:", cryptoError);
        throw new Error(`JWT crypto error: ${cryptoError.message}`);
      }
    } catch (privateKeyError) {
      console.error("Error processing private key:", privateKeyError);
      throw new Error(`Private key processing error: ${privateKeyError.message}`);
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
    console.log("Message structure received:", messages.map(m => ({role: m.role, textLength: m.parts?.[0]?.text?.length || 0})));
    
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
    
    // Ensure messages are properly formatted before sending to API
    const formattedMessages = messages.map(msg => {
      // Check for required properties and format
      if (!msg || typeof msg !== 'object') {
        console.error("Invalid message format:", msg);
        return { role: 'user', content: 'Invalid message' };
      }
      
      // Convert from Gemini format to Vertex AI format
      const role = msg.role === 'model' ? 'assistant' : msg.role;
      let content = '';
      
      // Extract content from parts array if available
      if (Array.isArray(msg.parts) && msg.parts.length > 0 && msg.parts[0] && 'text' in msg.parts[0]) {
        content = msg.parts[0].text || '';
      } else if (typeof msg.content === 'string') {
        // Direct content property (alternative format)
        content = msg.content;
      }
      
      if (!content) {
        console.warn("Empty content in message:", msg);
      }
      
      return { role, content };
    });
    
    const requestBody = {
      instances: [
        {
          messages: formattedMessages
        }
      ],
      parameters: {
        temperature: temperature,
        maxOutputTokens: 2048,
        topP: 0.95,
        topK: 40
      }
    };
    
    console.log("Sending request to Vertex AI with formatted messages");
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
    const generatedText = data.predictions?.[0]?.candidates?.[0]?.content || "";
    
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

// Safe function to generate cache key
function generateCacheKey(messages) {
  try {
    if (!Array.isArray(messages) || messages.length === 0) {
      return "empty-cache-key";
    }
    
    // Use only the last 3 messages (if available) to generate the key
    const relevantMessages = messages.slice(-3);
    
    // Safely extract content - handling potential undefined values
    return JSON.stringify(relevantMessages.map(msg => {
      // Ensure message is an object and has the required properties
      if (!msg || typeof msg !== 'object') {
        return { role: 'unknown', content: 'invalid-message' };
      }
      
      const role = msg.role || 'unknown';
      let content = 'empty-content';
      
      // First try extracting from parts array (Gemini format)
      if (Array.isArray(msg.parts) && msg.parts.length > 0 && msg.parts[0]) {
        content = msg.parts[0].text || 'empty-text';
      } 
      // Also try direct content property (alternative format)
      else if (typeof msg.content === 'string') {
        content = msg.content;
      }
      
      return { role, content };
    }));
  } catch (error) {
    console.error("Error generating cache key:", error);
    return "error-cache-key-" + Date.now();
  }
}

serve(async (req) => {
  // Log the start of each request to help with debugging
  console.log("=== New request received to gemini-chat function ===");
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if we have Vertex AI credentials
    const useVertexAI = !!VERTEX_AI_SERVICE_ACCOUNT;
    const useGemini = !!GEMINI_API_KEY;
    
    console.log("AI providers available:", {
      vertexAI: useVertexAI, 
      gemini: useGemini
    });
    
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
    let requestData;
    try {
      requestData = await req.json();
      console.log("Request received:", {
        hasMessages: !!requestData.messages,
        messageCount: requestData.messages ? requestData.messages.length : 0,
        query: requestData.query ? requestData.query.substring(0, 50) + "..." : "None provided",
        conversationId: requestData.conversationId || "None",
        enableOnlineSearch: !!requestData.enableOnlineSearch
      });
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(JSON.stringify({
        error: "Invalid request format: " + parseError.message,
        content: FALLBACK_RESPONSE,
        source: "system"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }
    
    // Validate request using our validation utility
    const validation = validateChatApiRequest(requestData);
    if (!validation.isValid) {
      console.error("Request validation failed:", validation.error, validation.errorDetails);
      return new Response(JSON.stringify({
        error: validation.error,
        errorDetails: validation.errorDetails,
        content: "I couldn't process your request due to validation errors. Please try again.",
        source: "system"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }
    
    const { messages: clientMessages, query, enableOnlineSearch = false, conversationId } = requestData;
    
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
      // Validate and cleanup messages before adding
      const validatedMessages = clientMessages.filter(msg => {
        if (!msg || typeof msg !== 'object') {
          console.warn("Skipping invalid message:", msg);
          return false;
        }
        return true;
      }).map(msg => {
        // Normalize message format
        const role = msg.role || (msg.source === 'user' ? 'user' : 'model');
        let content = '';
        
        // Extract content based on available properties
        if (typeof msg.content === 'string') {
          content = msg.content;
        } else if (msg.parts && Array.isArray(msg.parts) && msg.parts[0] && msg.parts[0].text) {
          content = msg.parts[0].text;
        } else {
          content = '';
        }
        
        return {
          role: role,
          parts: [{ text: content }]
        };
      });
      
      messages = messages.concat(validatedMessages);
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
        
        // Simple first message test for debugging
        if (messages.length === 2 && messages[1] && messages[1].parts && messages[1].parts[0] && messages[1].parts[0].text === "Hello, AI") {
          console.log("Detected test message, returning simple response");
          response = {
            candidates: [
              {
                content: {
                  parts: [{ text: "Hello! This is a simple test response to verify Vertex AI connectivity." }]
                }
              }
            ]
          };
        } else {
          response = await callVertexAI(messages);
        }
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
