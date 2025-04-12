/**
 * Message type definitions and utility functions
 */

/**
 * Simple message source type - used throughout the application
 */
export type MessageSource = 'user' | 'system' | 'gemini' | 'transcript' | 'web' | 'fallback';

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
 * Enhanced to handle cases where metadata might not exist or be null
 */
export function dbMessageToUiMessage(dbMessage: DbMessage): MessageData {
  // Default source based on is_user flag
  let source: MessageSource = dbMessage.is_user ? 'user' : 'gemini';
  
  // Override source if metadata exists and has a source
  if (dbMessage.metadata && dbMessage.metadata.source) {
    source = dbMessage.metadata.source as MessageSource;
  }
  
  // Create the message data with all fields properly populated
  const messageData: MessageData = {
    content: dbMessage.content,
    source: source,
    timestamp: new Date(dbMessage.created_at),
    citation: dbMessage.metadata?.citation ? [dbMessage.metadata.citation] : undefined
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
    
    if (error) {
      console.error('Error checking for metadata column:', error);
      return false;
    }
    
    console.log('Metadata column check successful');
    return true;
  } catch (e) {
    console.error('Unexpected error checking metadata column:', e);
    return false;
  }
}

/**
 * Prepare message objects for database insertion with metadata
 * This creates properly formatted message objects for insertion into the database
 */
export function prepareMessagesForDb(
  conversationId: string, 
  userMessage: string,
  responseMessage: { content: string, source: 'gemini' | 'system', citation?: string[] }
): any[] {
  console.log('Preparing messages for database with metadata');
  
  // User message is always simple
  const userMessageObj = { 
    conversation_id: conversationId, 
    content: userMessage, 
    is_user: true 
  };
  
  // Response message with metadata
  const responseMessageObj = {
    conversation_id: conversationId,
    content: responseMessage.content,
    is_user: false,
    metadata: { 
      source: responseMessage.source, 
      citation: responseMessage.citation?.[0] 
    }
  };
  
  return [userMessageObj, responseMessageObj];
}
