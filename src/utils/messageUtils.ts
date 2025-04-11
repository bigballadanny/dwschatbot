
/**
 * Message type definitions and utility functions
 */

/**
 * API message format for backend communication
 */
export interface ApiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Message source types
 */
export type MessageSource = 'user' | 'system' | 'gemini';

/**
 * Message data format used in the UI components
 */
export interface MessageData {
  content: string;
  source: MessageSource;
  timestamp: Date;
  citation?: string[];
  isLoading?: boolean;
}

/**
 * Converts UI messages array to API format
 * @param messages Array of UI messages
 * @param newUserContent Content of the new user message
 * @returns Array of API-formatted messages
 */
export function convertToApiMessages(messages: MessageData[], newUserContent: string): ApiMessage[] {
  // Create a new array for API messages
  const apiMessages: ApiMessage[] = [];
  
  // Process existing messages
  for (const message of messages) {
    // Skip loading messages
    if (message.isLoading) continue;
    
    // Map UI source to API role
    let role: 'user' | 'assistant' | 'system';
    
    if (message.source === 'user') {
      role = 'user';
    } else if (message.source === 'system') {
      role = 'system';
    } else {
      role = 'assistant';
    }
    
    apiMessages.push({
      role,
      content: message.content
    });
  }
  
  // Add the new user message at the end
  apiMessages.push({
    role: 'user',
    content: newUserContent
  });
  
  return apiMessages;
}
