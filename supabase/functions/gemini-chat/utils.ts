// supabase/functions/gemini-chat/utils.ts
/// <reference types="https://deno.land/x/deno/cli/types/dts/index.d.ts" />

// Define the expected structure for chat messages (can be shared or refined later)
export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  parts: Array<{ text: string }>;
  content?: string; // Keep for compatibility during normalization
  source?: 'user' | 'gemini' | 'system'; // Keep for compatibility during normalization
}

// Define validation result structure
interface ValidationResult {
    isValid: boolean;
    error?: string;
    errorDetails?: Record<string, string>;
}

export const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Validates a chat API request object
 * @param request The request data to validate
 * @returns ValidationResult with validation status and any errors
 */
export function validateChatApiRequest(request: any): ValidationResult {
  // Check if request is null/undefined
  if (!request) {
    console.error("Request body is missing");
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
    const invalidMessages = request.messages.slice(0, 5).filter((msg: any) => {
      return !msg || typeof msg !== 'object' ||
        (!msg.content && !msg.parts) || // Must have content or parts
        ( // Role/Source validation
          (!msg.role || !['user', 'model', 'system'].includes(msg.role)) &&
          (!msg.source || !['user', 'gemini', 'system'].includes(msg.source))
        );
    });

    if (invalidMessages.length > 0) {
      errors.messageFormat = `One or more messages have invalid format (role/source or content/parts missing). Example invalid: ${JSON.stringify(invalidMessages[0])}`;
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
    console.error("Request validation errors:", errors);
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
 * Helper to normalize message format between different API formats into the target ChatMessage format.
 * Prioritizes `role` and `parts`. Falls back to `source` and `content`.
 * @param message The raw message object from the request.
 * @returns A normalized ChatMessage object.
 */
export function normalizeMessage(message: any): ChatMessage {
    let role: 'user' | 'model' | 'system' = 'user'; // Default role
    let textContent = '';

    if (!message || typeof message !== 'object') {
        console.warn("Normalizing invalid message structure:", message);
        return { role: 'user', parts: [{ text: '' }] }; // Return default structure
    }

    // 1. Determine Role (Prioritize 'role')
    if (message.role && ['user', 'model', 'system'].includes(message.role)) {
        role = message.role;
    } else if (message.source) {
        // Map 'source' to 'role'
        if (message.source === 'user') role = 'user';
        else if (message.source === 'gemini') role = 'model'; // Map 'gemini' to 'model'
        else if (message.source === 'system') role = 'system';
        else role = 'user'; // Default fallback for unknown source
    } else {
        role = 'user'; // Default if neither role nor source is valid
    }

    // 2. Determine Content (Prioritize 'parts')
    if (message.parts && Array.isArray(message.parts) && message.parts.length > 0) {
        if (message.parts[0] && typeof message.parts[0].text === 'string') {
            textContent = message.parts[0].text;
        } else if (typeof message.parts[0] === 'string') { // Handle case where parts is just an array of strings
            textContent = message.parts[0];
        }
    } else if (typeof message.content === 'string') {
        // Fallback to 'content' if 'parts' is not valid
        textContent = message.content;
    }

    // Return the standard ChatMessage structure
    return {
        role: role,
        parts: [{ text: textContent }]
        // We don't include source or content in the final normalized object
    };
}


/**
 * Helper function to fetch with a timeout.
 * @param url The URL to fetch.
 * @param options Fetch options (method, headers, body, etc.).
 * @param timeoutMs Timeout duration in milliseconds.
 * @returns The fetch Response object.
 * @throws Error if the request times out or another fetch error occurs.
 */
export async function fetchWithTimeout(url: string | URL, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal // Pass the abort signal to fetch
    });
    clearTimeout(id); // Clear timeout if fetch completes successfully
    return response;
  } catch (error) {
    clearTimeout(id); // Clear timeout if fetch fails
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error(`Request to ${url} timed out after ${timeoutMs}ms`);
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    console.error(`Fetch error for ${url}:`, error);
    throw error; // Re-throw other fetch errors
  }
}