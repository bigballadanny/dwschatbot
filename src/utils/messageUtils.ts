import { Json } from '@/integrations/supabase/types';

// Define valid message sources for type safety throughout the app
export type MessageSource = 'user' | 'system' | 'gemini' | 'vertex' | 'transcript' | 'cache' | 'web' | 'fallback';

// Database message format (matches Supabase schema)
export interface DbMessage {
  id: string;
  content: string;
  conversation_id: string;
  is_user: boolean;
  created_at: string;
  metadata: {
    source?: MessageSource;
    citation?: string[];
  };
}

// UI-facing message format
export interface MessageData {
  content: string;
  source: MessageSource;
  timestamp?: Date;
  citation?: string[];
  isLoading?: boolean;
}

/**
 * Converts a database message object to UI message format
 * @param dbMessage Message from database
 * @returns Formatted message for UI consumption
 */
export const dbMessageToUiMessage = (dbMessage: DbMessage): MessageData => {
  // Convert database timestamp to Date object
  const timestamp = dbMessage.created_at ? new Date(dbMessage.created_at) : undefined;
  
  // Determine message source based on is_user flag and metadata
  let source: MessageSource = dbMessage.is_user ? 'user' : 'gemini';
  
  // If metadata contains source information, use that instead
  if (dbMessage.metadata && typeof dbMessage.metadata === 'object' && 'source' in dbMessage.metadata) {
    const metadataSource = dbMessage.metadata.source;
    if (metadataSource && isValidMessageSource(metadataSource)) {
      source = metadataSource;
    }
  }
  
  // Extract citation if available
  let citation: string[] | undefined = undefined;
  if (dbMessage.metadata && typeof dbMessage.metadata === 'object' && 'citation' in dbMessage.metadata) {
    citation = Array.isArray(dbMessage.metadata.citation) ? dbMessage.metadata.citation : undefined;
  }
  
  return {
    content: dbMessage.content,
    source: source,
    timestamp: timestamp,
    citation: citation
  };
};

/**
 * Type guard to check if a string is a valid MessageSource
 * @param source The source string to validate
 * @returns boolean indicating if the source is valid
 */
export const isValidMessageSource = (source: string): source is MessageSource => {
  return ['user', 'system', 'gemini', 'vertex', 'transcript', 'cache', 'web', 'fallback'].includes(source);
};

/**
 * Creates message metadata for storage in database
 * @param source Message source type
 * @param citation Optional citation information
 * @returns Metadata object ready for database storage
 */
export const createMessageMetadata = (source: MessageSource = 'gemini', citation?: string[]) => {
  const metadata: Record<string, any> = { source };
  if (citation && citation.length > 0) {
    metadata.citation = citation;
  }
  return metadata;
};

/**
 * Converts API message format to UI message format
 * @param apiMessage Message from API response
 * @returns Formatted message for UI consumption
 */
export const apiMessageToUiMessage = (apiMessage: any): MessageData => {
  let source: MessageSource = apiMessage.source || 'gemini';
  
  // Ensure the source is valid, fallback to 'system' if not
  if (!isValidMessageSource(source)) {
    console.warn(`Invalid message source detected: ${source}. Falling back to 'system'.`);
    source = 'system';
  }
  
  return {
    content: apiMessage.content || '',
    source,
    timestamp: new Date(),
    citation: apiMessage.citation
  };
};

/**
 * Checks if the metadata column exists in the messages table
 * @param supabase - Supabase client
 * @returns Promise<boolean> - Whether the metadata column exists
 */
export const checkMetadataColumnExists = async (supabase: any): Promise<boolean> => {
  try {
    // Query a single row to inspect column names
    const { data, error } = await supabase
      .from('messages')
      .select('metadata')
      .limit(1);
    
    if (error) {
      console.error('Error checking metadata column:', error);
      return false;
    }
    
    // If we got here without error, the column exists
    return true;
  } catch (error) {
    console.error('Exception checking metadata column:', error);
    return false;
  }
};

/**
 * Prepares message objects for database insertion
 * @param conversationId - Conversation ID
 * @param userMessage - User message content
 * @param responseMessage - System response message
 * @returns Array of prepared message objects
 */
export const prepareMessagesForDb = (
  conversationId: string, 
  userMessage: string,
  responseMessage: { content: string, source: MessageSource, citation?: string[] }
) => {
  const messages = [];
  
  // User message
  messages.push({
    conversation_id: conversationId,
    content: userMessage,
    is_user: true,
    metadata: {}
  });
  
  // System response message
  messages.push({
    conversation_id: conversationId,
    content: responseMessage.content,
    is_user: false,
    metadata: {
      source: responseMessage.source,
      citation: responseMessage.citation || []
    }
  });
  
  return messages;
};
