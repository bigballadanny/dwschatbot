
// @ts-ignore Deno-style import, valid in Supabase Edge Functions
import { encode } from "https://esm.sh/gpt-tokenizer@2.1.1";

// Common type definitions
export interface ChatMessage {
    role: 'user' | 'model' | 'system';
    parts: {
        text?: string;
    }[];
}

export interface ChatApiRequest {
    messages?: ChatMessage[];
    query?: string;
    conversationId?: string;
    enableOnlineSearch?: boolean;
}

// Constants for timeouts and retries
export const REQUEST_TIMEOUT_MS = 30000; // 30 seconds timeout for API requests
export const MAX_RETRIES = 3; // Maximum number of retries for failed requests

// Helper function to fetch with timeout
export async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
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

/**
 * Validates the structure of a chat API request.
 * @param requestData The request data to validate.
 * @returns An object indicating if the request is valid and any error details.
 */
export function validateChatApiRequest(requestData: any): { isValid: boolean; error?: string; errorDetails?: any } {
    // Check for basic request structure
    if (!requestData) {
        return { isValid: false, error: "Request body is empty." };
    }

    // Either messages or query is required
    if (!requestData.messages && !requestData.query) {
        return { 
            isValid: false, 
            error: "Either 'messages' or 'query' must be provided.", 
            errorDetails: { messages: "Missing", query: "Missing" } 
        };
    }

    // If messages provided, validate their structure
    if (requestData.messages && !Array.isArray(requestData.messages)) {
        return { 
            isValid: false, 
            error: "'messages' must be an array.", 
            errorDetails: { messages: typeof requestData.messages } 
        };
    }

    // Check that messages have correct structure
    if (requestData.messages && Array.isArray(requestData.messages)) {
        for (let i = 0; i < requestData.messages.length; i++) {
            const msg = requestData.messages[i];
            if (!msg.role || !["user", "model", "system"].includes(msg.role)) {
                return { 
                    isValid: false, 
                    error: `Message at index ${i} has an invalid 'role'. Must be 'user', 'model', or 'system'.`,
                    errorDetails: { invalidMessage: i, role: msg.role }
                };
            }
            if (!msg.parts || !Array.isArray(msg.parts) || msg.parts.length === 0) {
                return { 
                    isValid: false, 
                    error: `Message at index ${i} has missing or invalid 'parts'.`,
                    errorDetails: { invalidMessage: i, parts: msg.parts }
                };
            }
        }
    }

    return { isValid: true };
}

/**
 * Normalizes a chat message to ensure it has the proper structure.
 * @param message The chat message to normalize.
 * @returns The normalized chat message.
 */
export function normalizeMessage(message: any): ChatMessage {
    // Default structure
    const normalizedMessage: ChatMessage = {
        role: 'user', // Default role
        parts: [
            { text: '' }
        ]
    };

    // Copy role if it exists and is valid
    if (message.role && ['user', 'model', 'system'].includes(message.role)) {
        normalizedMessage.role = message.role;
    }

    // Handle parts - ensure it's an array with at least one item with text
    if (Array.isArray(message.parts) && message.parts.length > 0) {
        // Use existing parts if they're valid
        normalizedMessage.parts = message.parts.map(part => ({
            text: typeof part.text === 'string' ? part.text : ''
        }));
    } else if (typeof message.content === 'string') {
        // Legacy format compatibility (content instead of parts)
        normalizedMessage.parts = [{ text: message.content }];
    } else if (typeof message.text === 'string') {
        // Ultra-legacy format compatibility (text instead of parts)
        normalizedMessage.parts = [{ text: message.text }];
    }

    return normalizedMessage;
}

/**
 * Generates a cache key for a given query or message array, optimized for stability.
 * @param requestData The request data to generate a cache key for.
 * @returns A cache key string.
 */
export function generateCacheKey(requestData: ChatApiRequest): string {
    try {
        // If there's a direct query, use it
        if (requestData.query) {
            return `query:${requestData.query.trim().toLowerCase()}`;
        }
        
        // If there are messages, find the latest user message
        if (requestData.messages && requestData.messages.length > 0) {
            // Extract only user messages
            const userMessages = requestData.messages
                .filter(msg => msg.role === 'user')
                .map(msg => msg.parts[0]?.text || '')
                .filter(text => text.trim().length > 0);
                
            if (userMessages.length > 0) {
                // Use the last user message as the key
                const lastUserMessage = userMessages[userMessages.length - 1];
                
                // Add a prefix to distinguish from direct queries
                return `msg:${lastUserMessage.trim().toLowerCase()}`;
            }
        }
        
        // Fallback if no suitable key could be generated
        throw new Error("No suitable content found for cache key generation");
    } catch (error) {
        console.error("Error generating cache key:", error);
        // Return a timestamp-based key as fallback to prevent caching issues
        return `fallback:${Date.now()}`;
    }
}

/**
 * Count tokens in a message using the tokenizer
 * @param text The text to count tokens for
 * @returns Token count
 */
export function countTokens(text: string): number {
    try {
        if (!text) return 0;
        return encode(text).length;
    } catch (e) {
        console.error("Error counting tokens:", e);
        // Fallback approximation: ~4 chars per token
        return Math.ceil(text.length / 4);
    }
}

/**
 * Process transcripts for a given query to find relevant content
 * @param query The user query to search for in transcripts
 * @returns Relevant transcript data or null if none found
 */
export async function searchTranscriptsForQuery(
    supabaseAdmin: any, 
    query: string
): Promise<{
    content: string;
    sources: string[];
    relevance: number;
} | null> {
    if (!supabaseAdmin || !query || query.trim().length === 0) {
        return null;
    }
    
    console.log(`Searching transcripts for query: "${query}"`);
    
    try {
        // First, get the most relevant transcripts
        const { data: transcripts, error } = await supabaseAdmin
            .from('transcripts')
            .select('id, title, content, source')
            .limit(5);  // Limit to 5 most relevant transcripts
            
        if (error) {
            console.error("Error fetching transcripts:", error);
            return null;
        }
        
        if (!transcripts || transcripts.length === 0) {
            console.log("No transcripts found in database");
            return null;
        }
        
        console.log(`Found ${transcripts.length} transcripts to search through`);
        
        // Simple relevance scoring
        const scoredTranscripts = transcripts.map(transcript => {
            const normalizedContent = transcript.content.toLowerCase();
            const normalizedQuery = query.toLowerCase();
            
            // Basic relevance score: occurrences of query terms
            const queryTerms = normalizedQuery.split(/\s+/).filter(term => term.length > 2);
            
            let score = 0;
            let exactMatch = false;
            
            // Check for exact phrase match
            if (normalizedContent.includes(normalizedQuery)) {
                score += 100;
                exactMatch = true;
            }
            
            // Check for individual term matches
            queryTerms.forEach(term => {
                const matches = normalizedContent.match(new RegExp(`\\b${term}\\b`, 'gi'));
                if (matches) {
                    score += matches.length * 10;
                }
            });
            
            // Boost score based on context matches
            if (!exactMatch && queryTerms.length > 1) {
                // Check for paragraphs containing multiple query terms
                const paragraphs = normalizedContent.split(/\n\n+/);
                paragraphs.forEach(paragraph => {
                    let termsFound = 0;
                    queryTerms.forEach(term => {
                        if (paragraph.includes(term)) {
                            termsFound++;
                        }
                    });
                    
                    if (termsFound > 1) {
                        score += termsFound * 15;
                    }
                });
            }
            
            return {
                ...transcript,
                score
            };
        });
        
        // Filter to relevant transcripts
        const relevantTranscripts = scoredTranscripts
            .filter(t => t.score > 30)  // Only include transcripts with meaningful relevance
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);  // Take top 3
            
        if (relevantTranscripts.length === 0) {
            console.log("No relevant transcripts found for query");
            return null;
        }
        
        console.log(`Found ${relevantTranscripts.length} relevant transcripts for query`);
        
        // Extract relevant content from the transcripts
        const extractedContent = relevantTranscripts.map(transcript => {
            // Extract the most relevant paragraphs
            const paragraphs = transcript.content.split(/\n\n+/);
            const normalizedQuery = query.toLowerCase();
            
            // Score each paragraph for relevance
            const scoredParagraphs = paragraphs.map(paragraph => {
                const normalizedParagraph = paragraph.toLowerCase();
                let score = 0;
                
                // Check for exact phrase match
                if (normalizedParagraph.includes(normalizedQuery)) {
                    score += 50;
                }
                
                // Check for term matches
                const queryTerms = normalizedQuery.split(/\s+/).filter(term => term.length > 2);
                queryTerms.forEach(term => {
                    if (normalizedParagraph.includes(term)) {
                        score += 10;
                    }
                });
                
                return { paragraph, score };
            });
            
            // Get the most relevant paragraphs
            const relevantParagraphs = scoredParagraphs
                .filter(p => p.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 3)
                .map(p => p.paragraph);
                
            return {
                content: relevantParagraphs.join("\n\n"),
                title: transcript.title,
                source: transcript.source,
                score: transcript.score
            };
        });
        
        // Combine extracted content
        const combinedContent = extractedContent.map(t => 
            `### From: ${t.title}\n\n${t.content}`
        ).join("\n\n---\n\n");
        
        const sources = extractedContent.map(t => t.title);
        const averageRelevance = extractedContent.reduce((sum, t) => sum + t.score, 0) / extractedContent.length;
        
        console.log(`Generated ${combinedContent.length} characters of relevant content from transcripts`);
        
        return {
            content: combinedContent,
            sources,
            relevance: Math.round(averageRelevance)
        };
        
    } catch (e) {
        console.error("Error searching transcripts:", e);
        return null;
    }
}
