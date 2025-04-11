
/**
 * Utility functions for handling message conversions
 */

/**
 * API message format used for communication with backend
 */
export interface ApiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * UI message format used in the application
 */
export interface MessageData {
  content: string;
  source: 'user' | 'system' | 'gemini';
  timestamp: Date;
  citation?: string[];
  isLoading?: boolean;
}

/**
 * Converts UI messages array to API format for backend communication
 * Using a separate utility function breaks circular type dependencies
 */
export function convertToApiMessages(messages: MessageData[], newUserContent: string): ApiMessage[] {
  const apiMessages: ApiMessage[] = [];
  
  // Process existing messages
  for (const message of messages) {
    // Skip loading messages
    if (message.isLoading) continue;
    
    // Map UI message source to API role
    let role: 'user' | 'assistant' | 'system';
    
    if (message.source === 'user') {
      role = 'user';
    } else if (message.source === 'system') {
      role = 'system';
    } else { // 'gemini' or any other source
      role = 'assistant';
    }
    
    apiMessages.push({
      role,
      content: message.content
    });
  }
  
  // Add new user message
  apiMessages.push({
    role: 'user',
    content: newUserContent
  });
  
  return apiMessages;
}
