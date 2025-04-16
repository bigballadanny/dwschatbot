
// supabase/functions/gemini-chat/vertex.ts
/// <reference types="https://deno.land/x/deno/cli/types/dts/index.d.ts" />

import { ChatMessage, fetchWithTimeout, REQUEST_TIMEOUT_MS } from "./utils.ts";
import { getVertexAccessToken } from "./auth.ts";

// Retrieve service account from environment variables
const VERTEX_AI_SERVICE_ACCOUNT = Deno.env.get('VERTEX_AI_SERVICE_ACCOUNT');
const MAX_RETRIES = 3; // Increased retries for API calls

// Define the structure for the Vertex AI response
interface VertexAIResponse {
    candidates: Array<{
        content: {
            parts: Array<{ text: string }>;
        };
        finishReason?: string;
    }>;
    promptFeedback?: any;
    usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
    };
}

/**
 * Function to call Vertex AI Prediction API (Gemini model endpoint)
 * with improved error handling and retry logic.
 *
 * @param messages An array of ChatMessage objects, filtered to include only 'user' and 'model' roles.
 * @param temperature The sampling temperature (default 0.7).
 * @param retryCount The current retry attempt number (internal use).
 * @returns A Promise resolving to the VertexAIResponse structure.
 * @throws Error if the API call fails after retries or if configuration is invalid.
 */
export async function callVertexAI(
    messages: ChatMessage[],
    temperature = 0.7,
    retryCount = 0
): Promise<VertexAIResponse> {
    try {
        console.log(`Calling Vertex AI (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
        console.log("callVertexAI - Input messages:", JSON.stringify(messages.map(m => ({ role: m.role, textLength: m.parts[0]?.text?.length ?? 0 })), null, 2));

        // 1. Get Access Token
        const accessToken = await getVertexAccessToken(); // Assumes getVertexAccessToken handles its own errors

        // 2. Get Project ID
        let projectId = "";
        try {
            if (!VERTEX_AI_SERVICE_ACCOUNT) {
                throw new Error("VERTEX_AI_SERVICE_ACCOUNT is not set");
            }
            const serviceAccount = JSON.parse(VERTEX_AI_SERVICE_ACCOUNT);
            projectId = serviceAccount.project_id;
            if (!projectId) {
                throw new Error("No project_id found in service account");
            }
            console.log("Using project ID from service account:", projectId);
        } catch (error) {
            console.error("Error extracting project ID:", error);
            throw new Error(`Failed to extract project ID: ${error.message}`);
        }

        // 3. Construct API Endpoint URL
        const VERTEX_LOCATION = "us-central1"; 
        // Updated to gemini-2.0-flash
        const VERTEX_MODEL_ID = "gemini-2.0-flash";
        const VERTEX_API_VERSION = "v1"; 
        const endpoint = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/${VERTEX_API_VERSION}/projects/${projectId}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_MODEL_ID}:generateContent`;

        console.log(`Prepared Vertex AI request to endpoint using model ${VERTEX_MODEL_ID}:`, endpoint);

        // 4. Prepare Request Body
        const requestBody = {
            contents: messages,
            generationConfig: {
                temperature: temperature,
                maxOutputTokens: 8192, // Increased token limit for gemini-2.0 models
                topP: 0.95,
                topK: 40
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

        console.log("Sending request to Vertex AI with body:", JSON.stringify(requestBody, null, 2));

        // 5. Make API Call with Timeout and Retries
        const response = await fetchWithTimeout(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        }, REQUEST_TIMEOUT_MS);

        // 6. Handle API Response
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Vertex AI API error (${response.status}):`, errorText);

            // Retry logic for specific transient errors
            if (retryCount < MAX_RETRIES &&
                (response.status === 429 || response.status >= 500)) { // Retry on rate limits or server errors
                console.log(`Retrying due to error ${response.status} (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`);
                const delay = Math.pow(2, retryCount) * 1500 + Math.random() * 1000; // Increased backoff
                await new Promise(resolve => setTimeout(resolve, delay));
                return callVertexAI(messages, temperature, retryCount + 1); // Recursive call
            }
            // Throw specific error for non-retriable API issues
            throw new Error(`Vertex AI API error: ${response.status} ${response.statusText}. Response: ${errorText}`);
        }

        // 7. Parse Successful Response
        const data: VertexAIResponse = await response.json();
        console.log("Successfully received response from Vertex AI:", 
            JSON.stringify({
                candidatesCount: data.candidates?.length || 0,
                hasContent: !!data.candidates?.[0]?.content,
                tokenInfo: data.usageMetadata || "Not provided"
            }, null, 2));

        // Basic validation of the response structure
        if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0 ||
            !data.candidates[0].content?.parts?.[0]?.text) {
            console.warn("Received unexpected or empty response structure from Vertex AI:", data);
            if (data.candidates?.[0]?.finishReason === "SAFETY") {
                throw new Error("Content blocked due to safety filters. Please revise your query.");
            }
            // Return a default structure to avoid downstream errors
            return { 
                candidates: [{ content: { parts: [{ text: "I'm unable to provide a response to that query. Please try rephrasing or asking something different." }] } }]
            };
        }

        return data;

    } catch (error) {
        console.error(`Error during callVertexAI (attempt ${retryCount + 1}):`, error);

        // Retry logic for network errors or timeouts
        if (retryCount < MAX_RETRIES &&
            (error.message.includes("timed out") || error.message.includes("network") || error.message.includes("fetch"))) {
            console.log(`Retrying due to connection error "${error.message}" (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`);
            const delay = Math.pow(2, retryCount) * 1500 + Math.random() * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            return callVertexAI(messages, temperature, retryCount + 1); // Recursive call
        }

        // If we've exhausted retries or have a non-retriable error:
        // For authentication errors (which could be environmental), provide more guidance
        if (error.message.includes("authentication") || error.message.includes("Authorization") || error.message.includes("token")) {
            throw new Error(`Authentication failed with Vertex AI: ${error.message}. Please verify your service account configuration.`);
        }

        // For other errors, include retry information
        throw new Error(`Failed to call Vertex AI after ${retryCount + 1} attempts: ${error.message}`);
    }
}
