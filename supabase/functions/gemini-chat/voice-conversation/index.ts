import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Configuration ---
const VERTEX_AI_SERVICE_ACCOUNT = Deno.env.get('VERTEX_AI_SERVICE_ACCOUNT');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

// Vertex AI Configuration
const VERTEX_LOCATION = "us-central1";
const VERTEX_MODEL_ID = "gemini-2.0-flash"; 
const VERTEX_API_VERSION = "v1"; // Standard v1 API
const REQUEST_TIMEOUT_MS = 30000; // Timeout for AI calls
const MAX_RETRIES = 3; // Increased retries for transient errors

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generic fallback response
const FALLBACK_RESPONSE = `I apologize, but I'm having trouble processing your voice request at the moment. Please try again shortly.`;

// System instructions (can be adjusted)
const DEFAULT_SYSTEM_PROMPT = `You are an AI assistant responding to voice input. Keep your answers concise and clear for voice output. Use markdown formatting sparingly.`;

// --- Authentication Functions (Ensure consistency with other functions) ---

function reformatPrivateKey(privateKey) {
    // (Same reformatPrivateKey function as used in other functions)
    if (!privateKey || typeof privateKey !== 'string') return privateKey;
    try {
        let base64Content = privateKey.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
        base64Content = base64Content.replace(/[^A-Za-z0-9+/=]/g, '');
        const remainder = base64Content.length % 4;
        if (remainder > 0) base64Content += '='.repeat(4 - remainder);
        let formattedKey = "-----BEGIN PRIVATE KEY-----\n";
        for (let i = 0; i < base64Content.length; i += 64) {
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
    // (Same validateServiceAccountJson function as used in other functions)
    if (!serviceAccountJson) throw new Error("VERTEX_AI_SERVICE_ACCOUNT not set.");
    try {
        const parsed = JSON.parse(serviceAccountJson);
        const required = ["client_email", "private_key", "project_id", "type", "private_key_id"];
        const missing = required.filter(f => !parsed[f]);
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
    // (Same createJWT function as used in other functions)
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600;
    const header = { alg: 'RS256', typ: 'JWT', kid: serviceAccount.private_key_id };
    const payload = { iss: serviceAccount.client_email, sub: serviceAccount.client_email, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: expiry, scope: 'https://www.googleapis.com/auth/cloud-platform' };
    const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    let privateKeyPem = reformatPrivateKey(serviceAccount.private_key);
    const pemContents = privateKeyPem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0)).buffer;
    const cryptoKey = await crypto.subtle.importKey("pkcs8", binaryDer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
    const signatureBuffer = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, cryptoKey, new TextEncoder().encode(signatureInput));
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `${signatureInput}.${encodedSignature}`;
}

async function getVertexAccessToken(serviceAccount) {
    // (Same getVertexAccessToken function as used in other functions)
    try {
        const jwtToken = await createJWT(serviceAccount);
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwtToken })
        });
        if (!tokenResponse.ok) {
            const errorBody = await tokenResponse.text();
            throw new Error(`Token exchange failed (${tokenResponse.status}): ${errorBody}`);
        }
        const tokenData = await tokenResponse.json();
        if (!tokenData.access_token) throw new Error("No access_token received.");
        console.log("Vertex AI Access Token obtained successfully for voice chat.");
        return tokenData.access_token;
    } catch (error) {
        console.error("Error getting Vertex Access Token for voice chat:", error);
        throw new Error(`Vertex Auth Error: ${error.message}`);
    }
}

// --- Helper function to fetch with timeout ---
async function fetchWithTimeout(url, options, timeoutMs) {
    // (Same fetchWithTimeout function)
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        return response;
    } catch (error) {
        if (error.name === 'AbortError') throw new Error(`Request timed out after ${timeoutMs}ms`);
        throw new Error(`Network or fetch error: ${error.message}`);
    } finally {
        clearTimeout(id);
    }
}

// --- Analytics Logging Function ---
async function logAnalytics(
    supabase: SupabaseClient,
    logData: { /* ... same structure as before ... */ }
) {
    // (Keep existing logAnalytics function)
     try {
        const { error } = await supabase.from('chat_analytics').insert([logData]);
        if (error) console.error("Analytics logging failed:", error.message);
        else console.log("Analytics logged successfully for model:", logData.model_used);
    } catch (err) { console.error("Exception during analytics logging:", err); }
}

// --- Main Handler ---
serve(async (req) => {
  console.log(`\n=== ${new Date().toISOString()} | Voice Request received: ${req.method} ${req.url} ===`);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
   if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: { ...corsHeaders }});
   }

  let serviceAccount;
  let supabase;
  let queryText = "";
  let conversationId: string | null = null;
  let apiStartTime = Date.now();
  let apiEndTime = Date.now();
  let modelUsed = `vertex-${VERTEX_MODEL_ID}`; // Track the model used

  try {
    // 1. Validate Env Vars and Service Account
    if (!VERTEX_AI_SERVICE_ACCOUNT || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Missing required environment variables (Vertex SA, Supabase URL/Key)");
    }
    serviceAccount = validateServiceAccountJson(VERTEX_AI_SERVICE_ACCOUNT);
    console.log(`Using Vertex SA for project: ${serviceAccount.project_id} with model: ${VERTEX_MODEL_ID}`);

    // 2. Initialize Supabase Client & Auth
     const authHeader = req.headers.get('Authorization');
     if (!authHeader) throw new Error("Missing Authorization header");
     supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
       global: { headers: { Authorization: authHeader } }
     });
     const { data: { user }, error: userError } = await supabase.auth.getUser();
     if (userError || !user) throw new Error(`Authentication failed: ${userError?.message || 'No user session'}`);
     console.log(`Voice request authenticated for user: ${user.id}`);

    // 3. Parse Request Body
    const { messages, conversationId: convId } = await req.json();
     // Voice requests usually contain the latest user utterance. The history is in `messages`.
     if (!Array.isArray(messages) || messages.length === 0) {
          throw new Error("Invalid request: 'messages' array is missing or empty.");
     }
     // Assume the last message is the current voice query for logging purposes
     queryText = messages[messages.length - 1]?.parts?.[0]?.text || "[No text found in last message]";
     conversationId = convId || null;
     console.log(`Processing voice query for conversation ${conversationId || 'N/A'}: "${queryText.substring(0, 50)}..."`);


    // 4. Format Messages for Vertex AI API
    const systemInstructionParts = [{ text: DEFAULT_SYSTEM_PROMPT }]; // Use default or allow override from request
    const conversationContents = messages
        .filter(msg => msg.role === 'user' || msg.role === 'model') // Exclude system role if present
        .map(msg => ({
            role: msg.role,
            parts: msg.parts?.map(part => ({ text: part.text || '' })) || [{text: ''}] // Ensure parts format
        }));

    // 5. Get Access Token
    const accessToken = await getVertexAccessToken(serviceAccount);

    // 6. Call Vertex AI (:generateContent) with Retry Logic
    let responseText = "";
    let attemptSuccessful = false;
    let retryCount = 0;

    apiStartTime = Date.now(); // Start timer just before API call loop

    while (retryCount <= MAX_RETRIES && !attemptSuccessful) {
        console.log(`Calling Vertex AI ${VERTEX_MODEL_ID} for voice (Attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
        try {
            const vertexEndpoint = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/${VERTEX_API_VERSION}/projects/${serviceAccount.project_id}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_MODEL_ID}:generateContent`;
            const vertexRequestBody = {
                 ...(systemInstructionParts.length > 0 && { systemInstruction: { parts: systemInstructionParts } }),
                 contents: conversationContents,
                generationConfig: {
                  temperature: 0.7, // Standard temperature
                  maxOutputTokens: 4096, // Appropriate token limit for voice responses
                  topP: 0.95,
                  topK: 40,
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            };

            const vertexResponse = await fetchWithTimeout(vertexEndpoint, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(vertexRequestBody),
            }, REQUEST_TIMEOUT_MS);

            if (!vertexResponse.ok) {
                const errorBody = await vertexResponse.text();
                console.error(`Vertex AI API error on attempt ${retryCount + 1} (${vertexResponse.status}):`, errorBody);
                 if (retryCount < MAX_RETRIES && (vertexResponse.status === 429 || vertexResponse.status >= 500)) {
                     const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
                     console.log(`Retrying after ${delay.toFixed(0)}ms...`);
                     await new Promise(resolve => setTimeout(resolve, delay));
                     retryCount++;
                     continue;
                 }
                throw new Error(`Vertex AI API Error (${vertexResponse.status}): ${errorBody}`);
            }

            const vertexData = await vertexResponse.json();
            const generatedText = vertexData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

             if (generatedText && generatedText.length > 10) {
                responseText = generatedText;
                attemptSuccessful = true;
                console.log(`Vertex AI voice response successful (length: ${responseText.length})`);
            } else {
                 const reason = vertexData.candidates?.[0]?.finishReason || 'Empty Response';
                 console.warn(`Vertex AI returned empty or short response (Reason: ${reason}) on attempt ${retryCount + 1}.`);
                 if (retryCount < MAX_RETRIES) {
                      const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
                      console.log(`Retrying after ${delay.toFixed(0)}ms...`);
                      await new Promise(resolve => setTimeout(resolve, delay));
                      retryCount++;
                 } else {
                     throw new Error(`Failed to get valid response after ${MAX_RETRIES + 1} attempts (Last Reason: ${reason}).`);
                 }
            }
        } catch (error) {
            console.error(`Error during Vertex AI call attempt ${retryCount + 1}:`, error);
             if (retryCount < MAX_RETRIES && (error.message.includes("timed out") || error.message.includes("Network error"))) {
                 const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
                 console.log(`Retrying after ${delay.toFixed(0)}ms due to connection error...`);
                 await new Promise(resolve => setTimeout(resolve, delay));
                 retryCount++;
             } else {
                 throw error;
             }
        }
    }

    apiEndTime = Date.now(); // End timer after successful call or exhausted retries

    if (!attemptSuccessful) {
         console.error("Failed to get successful response from Vertex AI after all retries.");
         responseText = FALLBACK_RESPONSE;
    }

    // 7. Log Analytics (Success or Failure state determined above)
    await logAnalytics(supabase, {
        conversation_id: conversationId,
        query: queryText,
        response_length: attemptSuccessful ? responseText.length : null,
        source_type: attemptSuccessful ? 'vertex-voice' : 'error',
        api_time_ms: apiEndTime - apiStartTime,
        successful: attemptSuccessful,
        used_online_search: false,
        error_message: attemptSuccessful ? null : "Failed after retries",
        model_used: attemptSuccessful ? modelUsed : "error",
       user_id: user.id
   });

    // 8. Return Response
     if (!attemptSuccessful) {
         return new Response(JSON.stringify({
               error: "Failed to process voice request after multiple attempts.",
               content: FALLBACK_RESPONSE,
               source: 'system-error'
          }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
     }

    return new Response(JSON.stringify({
      content: responseText,
      source: 'vertex-voice',
      model: modelUsed
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // --- Centralized Error Handling ---
    console.error('Critical error in voice-conversation function:', error);
    const totalTimeOnError = Date.now() - apiStartTime;
    if (supabase) {
         await logAnalytics(supabase, {
             conversation_id: conversationId, query: queryText, response_length: null,
             source_type: 'error', api_time_ms: totalTimeOnError, successful: false,
             used_online_search: false, error_message: error.message, model_used: "error",
             user_id: user?.id || null
         });
     }
    
    let statusCode = 500;
    if (error.message.includes("Authorization") || error.message.includes("Authentication")) statusCode = 401;
    else if (error.message.includes("Invalid request") || error.message.includes("Missing") || error.message.includes("body")) statusCode = 400;
    else if (error.message.includes("Vertex AI API Error")) statusCode = 502;
    else if (error.message.includes("Vertex Auth Error")) statusCode = 500;

    return new Response(JSON.stringify({
      error: `Failed to process voice request: ${error.message}`,
      content: FALLBACK_RESPONSE,
      source: 'system-error'
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
