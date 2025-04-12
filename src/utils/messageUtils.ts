
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
    // Determine message source with fallback logic
    source: dbMessage.is_user ? 'user' : 
            (dbMessage.metadata?.source as MessageSource || 'gemini'),
    timestamp: new Date(dbMessage.created_at),
    citation: dbMessage.metadata?.citation ? 
              [dbMessage.metadata.citation] : undefined
  };
  
  return messageData;
}

/**
 * Check if the database schema supports the metadata column
 * This allows for graceful fallback if the messages table schema doesn't have metadata
 */
export async function checkMetadataColumnExists(supabaseClient: any): Promise<boolean> {
  try {
    console.log('Checking if metadata column exists in the messages table...');
    
    // Try to select a record with explicit metadata field
    const { data, error } = await supabaseClient
      .from('messages')
      .select('metadata')
      .limit(1);
    
    // If there's an error specifically mentioning metadata column not existing
    if (error && error.message && error.message.includes('metadata')) {
      console.log('Metadata column does not exist in messages table:', error.message);
      return false;
    }
    
    // Check if the data returned has a metadata field defined
    // This helps catch cases where the column exists but might be empty
    if (data && data.length > 0) {
      const hasMetadataField = 'metadata' in data[0];
      console.log(`Metadata column ${hasMetadataField ? 'exists' : 'does not exist'} in messages table`);
      return hasMetadataField;
    }
    
    // Default to assuming metadata exists if we can query it without errors
    console.log('Assuming metadata column exists since no error occurred');
    return true;
  } catch (e) {
    console.error('Unexpected error checking metadata column:', e);
    return false;
  }
}

/**
 * Prepare message objects for database insertion with or without metadata
 * This is a helper function to create message objects based on schema support
 */
export function prepareMessagesForDb(
  conversationId: string, 
  userMessage: string,
  responseMessage: { content: string, source: 'gemini' | 'system', citation?: string[] },
  hasMetadataSupport: boolean
): any[] {
  // User message is always simple
  const userMessageObj = { 
    conversation_id: conversationId, 
    content: userMessage, 
    is_user: true 
  };
  
  // Response message depends on metadata support
  let responseMessageObj;
  
  if (hasMetadataSupport) {
    // Use metadata if the column exists
    responseMessageObj = {
      conversation_id: conversationId,
      content: responseMessage.content,
      is_user: false,
      metadata: { 
        source: responseMessage.source, 
        citation: responseMessage.citation?.[0] 
      }
    };
  } else {
    // Fallback: Just save the content without metadata
    responseMessageObj = {
      conversation_id: conversationId,
      content: responseMessage.content,
      is_user: false
    };
  }
  
  return [userMessageObj, responseMessageObj];
}
