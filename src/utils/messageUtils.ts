/**
 * Message type definitions and utility functions
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Simple message source type - used throughout the application
 */
export type MessageSource = 'user' | 'system' | 'gemini' | 'web' | 'fallback' | 'transcript';

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
    citation?: string[];
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
 */
export function dbMessageToUiMessage(dbMessage: DbMessage): MessageData {
  // Map source from metadata or default based on is_user flag
  const source: MessageSource = dbMessage.is_user ? 'user' : 
                                (dbMessage.metadata?.source as MessageSource || 'gemini');
  
  // Use explicit type for return value to ensure type safety
  const messageData: MessageData = {
    content: dbMessage.content,
    source: source,
    timestamp: new Date(dbMessage.created_at),
    citation: dbMessage.metadata?.citation || undefined
  };
  
  return messageData;
}

/**
 * Format database messages for sending to UI
 * This is a helper function to map database messages to UI format
 * @param messages Array of database messages
 * @returns Array of UI formatted messages
 */
export function formatDbMessagesForUi(dbMessages: DbMessage[]): MessageData[] {
  if (!dbMessages || dbMessages.length === 0) {
    return [];
  }
  
  console.log(`Formatting ${dbMessages.length} database messages to UI format`);
  return dbMessages.map(msg => dbMessageToUiMessage(msg));
}

/**
 * Prepares a message object with metadata for saving to the database
 * This ensures consistent message structure when saving to Supabase
 */
export function prepareMessageForDb(
  conversationId: string, 
  content: string, 
  isUser: boolean,
  source?: MessageSource,
  citation?: string[]
) {
  // Ensure there's always a source provided in metadata
  const sourceValue = isUser ? 'user' : (source || 'gemini');
  
  return {
    conversation_id: conversationId,
    content: content,
    is_user: isUser,
    metadata: {
      source: sourceValue,
      citation: citation || undefined
    }
  };
}

/**
 * Generate a title from a conversation based on the first message
 * @param userMessage The first user message in a conversation
 * @returns A suitable title for the conversation
 */
export function generateConversationTitle(userMessage: string): string {
  if (!userMessage || typeof userMessage !== 'string') {
    return 'New Conversation';
  }

  // Extract the first sentence or phrase
  const firstSentence = userMessage.split(/[.!?]/).filter(s => s.trim().length > 0)[0] || '';
  
  // Limit to 40 characters and trim whitespace
  let title = firstSentence.trim().substring(0, 40);
  
  // Add ellipsis if truncated
  if (firstSentence.length > 40) {
    title += '...';
  }
  
  return title || 'New Conversation';
}

/**
 * Updates conversation title based on the user's first message
 * @param conversationId ID of the conversation to update
 * @param userMessage First user message in the conversation
 */
export async function updateConversationTitle(conversationId: string, userMessage: string) {
  if (!conversationId || !userMessage) {
    console.log('Missing conversation ID or user message for title update');
    return;
  }

  try {
    const title = generateConversationTitle(userMessage);
    const { error } = await supabase
      .from('conversations')
      .update({ title })
      .eq('id', conversationId);
    
    if (error) {
      console.error('Error updating conversation title:', error);
    } else {
      console.log(`Updated conversation ${conversationId} title to: ${title}`);
    }
  } catch (err) {
    console.error('Failed to update conversation title:', err);
  }
}
