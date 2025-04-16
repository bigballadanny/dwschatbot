// supabase/functions/gemini-chat/vertex.ts
/// <reference types="https://deno.land/x/deno/cli/types/dts/index.d.ts" />

import { ChatMessage, fetchWithTimeout, REQUEST_TIMEOUT_MS } from "./utils.ts";
import { getVertexAccessToken } from "./auth.ts";

// Retrieve service account from environment variables
const VERTEX_AI_SERVICE_ACCOUNT = Deno.env.get('VERTEX_AI_SERVICE_ACCOUNT');
const MAX_RETRIES = 2; // Max retries for API calls

// Define the structure for the Vertex AI response (simplified)
interface VertexAIResponse {
    candidates: Array<{
        content: {
            parts: Array<{ text: string }>;
        };
    }>;
    // Add other potential fields if needed, e.g., usageMetadata
}


/**
 * Function to call Vertex AI Prediction API (Gemini generateContent endpoint)
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
        const VERTEX_LOCATION = "us-central1"; // Consider making configurable
        const VERTEX_MODEL_ID = "gemini-1.5-flash-001"; // Use a specific, potentially newer model
        const VERTEX_API_VERSION = "v1beta1"; // Use v1beta1 for potentially newer features/models like 1.5
        const endpoint = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/${VERTEX_API_VERSION}/projects/${projectId}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_MODEL_ID}:generateContent`;

        console.log("Prepared Vertex AI request to endpoint:", endpoint);

        // 4. Prepare Request Body (ensure messages are correctly formatted)
        // The input 'messages' should already be filtered and formatted by the caller
        const requestBody = {
            contents: messages, // Directly use the pre-filtered/formatted messages
            generationConfig: {
                temperature: temperature,
                maxOutputTokens: 4096, // Increased token limit
                topP: 0.95,
                topK: 40
                // Add responseMimeType if needed: responseMimeType: "text/plain"
            }
            // safetySettings: [...] // Add safety settings if necessary
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
                const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000; // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, delay));
                return callVertexAI(messages, temperature, retryCount + 1); // Recursive call
            }
            // Throw specific error for non-retriable API issues
            throw new Error(`Vertex AI API error: ${response.status} ${response.statusText}. Response: ${errorText}`);
        }

        // 7. Parse Successful Response
        const data: VertexAIResponse = await response.json();
        console.log("Successfully received response from Vertex AI:", JSON.stringify(data, null, 2));

        // Basic validation of the response structure
        if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0 ||
            !data.candidates[0].content?.parts?.[0]?.text) {
            console.warn("Received unexpected or empty response structure from Vertex AI:", data);
            // Consider throwing an error or returning a default structure if this is critical
             return { // Return a default structure to avoid downstream errors
                candidates: [{ content: { parts: [{ text: "" }] } }]
            };
        }

        return data; // Return the parsed data

    } catch (error) {
        console.error(`Error during callVertexAI (attempt ${retryCount + 1}):`, error);

        // Retry logic for network errors or timeouts from fetchWithTimeout/getAccessToken
        if (retryCount < MAX_RETRIES &&
            (error.message.includes("timed out") || error.message.includes("network") || error.message.includes("fetch"))) {
            console.log(`Retrying due to connection error "${error.message}" (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`);
            const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            return callVertexAI(messages, temperature, retryCount + 1); // Recursive call
        }

        // If error is from auth or project ID extraction, it might not be retriable here
        // Throw a consolidated error message
        throw new Error(`Failed to call Vertex AI after ${retryCount + 1} attempts: ${error.message}`);
    }
}