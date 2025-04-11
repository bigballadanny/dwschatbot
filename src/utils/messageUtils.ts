
/**
 * Message type definitions and utility functions
 */

/**
 * Message source types - used throughout the application
 */
export type MessageSource = 'user' | 'system' | 'gemini';

/**
 * API message format for backend communication
 */
export interface ApiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

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
 * This function takes UI message format and converts to the API format expected by the backend
 */
export function convertMessagesToApi(
  messages: MessageData[],
  newUserContent: string
): ApiMessage[] {
  // Filter out loading messages first
  const validMessages = messages.filter(msg => !msg.isLoading);
  
  // Create API messages from valid messages
  const apiMessages = validMessages.map(message => {
    // Map the source to role
    let role: 'user' | 'assistant' | 'system';
    
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
    
    return {
      role,
      content: message.content
    };
  });
  
  // Add the new user message
  apiMessages.push({
    role: 'user',
    content: newUserContent
  });
  
  return apiMessages;
}
