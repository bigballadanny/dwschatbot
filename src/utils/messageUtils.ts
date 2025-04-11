
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
 * Converts UI messages to API format for sending to backend
 * Extracted as a utility function to avoid circular dependencies
 */
export function convertMessagesToApi(
  messages: MessageData[],
  newUserContent: string
): ApiMessage[] {
  const apiMessages: ApiMessage[] = [];
  
  // Process existing messages (excluding loading messages)
  for (const message of messages.filter(msg => !msg.isLoading)) {
    let role: 'user' | 'assistant' | 'system';
    
    // Map the source to role
    switch (message.source) {
      case 'user':
        role = 'user';
        break;
      case 'system':
        role = 'system';
        break;
      default:
        role = 'assistant';
    }
    
    apiMessages.push({
      role,
      content: message.content
    });
  }
  
  // Add the new user message
  apiMessages.push({
    role: 'user',
    content: newUserContent
  });
  
  return apiMessages;
}
