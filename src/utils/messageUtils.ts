
/**
 * Message type definitions and utility functions
 */

/**
 * Simple message source type - used throughout the application
 */
export type MessageSource = 'user' | 'system' | 'gemini';

/**
 * Simplified API message format for backend communication
 * This aligns with what the backend expects
 */
export interface ApiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Message data format used in the UI components
 * This keeps only the essential properties needed by UI
 */
export interface MessageData {
  content: string;
  source: MessageSource;
  timestamp: Date;
  citation?: string[];
  isLoading?: boolean;
}

/**
 * Database message format (simplified for type reference)
 * This represents how messages are stored in Supabase
 */
export interface DbMessage {
  id: string;
  content: string;
  conversation_id: string;
  created_at: string;
  is_user: boolean;
  metadata?: {
    source?: MessageSource;
    citation?: string;
  };
  user_id?: string;
}

/**
 * Converts UI messages to API format for sending to backend
 * This function takes UI message format and converts to the API format expected by the backend
 */
export function convertMessagesToApi(
  messages: MessageData[],
  newUserContent: string
): ApiMessage[] {
  // Filter out loading messages
  const validMessages = messages.filter(msg => !msg.isLoading);
  
  // Map valid messages to API format
  const apiMessages: ApiMessage[] = validMessages.map(message => {
    // Map source to role using a simple mapping function
    let role: 'user' | 'assistant' | 'system';
    
    if (message.source === 'user') {
      role = 'user';
    } else if (message.source === 'system') {
      role = 'system';
    } else {
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

/**
 * Convert a database message to UI message format
 * This helps transform data from Supabase to the format used in the UI
 * Enhanced to handle cases where metadata might not exist
 */
export function dbMessageToUiMessage(dbMessage: DbMessage): MessageData {
  // Use explicit type for return value to ensure type safety
  const messageData: MessageData = {
    content: dbMessage.content,
    source: dbMessage.is_user ? 'user' : 
            (dbMessage.metadata?.source as MessageSource || 'gemini'),
    timestamp: new Date(dbMessage.created_at),
    citation: dbMessage.metadata?.citation ? 
              [dbMessage.metadata.citation] : undefined
  };
  
  return messageData;
}
