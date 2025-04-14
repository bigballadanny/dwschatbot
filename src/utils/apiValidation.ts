
/**
 * API request validation utilities for consistent client/server validation
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  errorDetails?: Record<string, string>;
}

/**
 * Validates a chat API request object 
 * @param request The request data to validate
 * @returns ValidationResult with validation status and any errors
 */
export function validateChatApiRequest(request: any): ValidationResult {
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
export function normalizeMessage(message: any): { role: string, content: string } {
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
export function isValidUuid(value: any): boolean {
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
export function sanitizeUserInput(input: string): string {
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
