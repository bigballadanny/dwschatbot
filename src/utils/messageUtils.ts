/**
 * Message type definitions and utility functions
 */

/**
 * Simple message source type - used throughout the application
 */
export type MessageSource = 'user' | 'system' | 'gemini' | 'transcript' | 'web' | 'fallback';

/**
 * API message format expected by our backend function's validation
 */
export interface ApiMessageWithParts {
  role: 'user' | 'model' | 'system'; // Use 'model' for assistant role
  parts: { text: string }[];
}

/**
 * Message data format used in the UI components
 * This keeps only the essential properties needed by UI
 */
export interface MessageData {
  id: string; // Added message ID
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
 * Converts UI messages to the API format with 'parts' structure
 * This function takes UI message format and converts to the API format expected by the backend
 */
export function convertMessagesToApi(
  messages: MessageData[],
  newUserContent: string
): ApiMessageWithParts[] { // Updated return type
  // Filter out loading messages and the initial system prompt if needed (depends on backend handling)
  const validMessages = messages.filter(msg => !msg.isLoading); // Keep system messages for now

  // Map valid messages to API format with 'parts'
  const apiMessages: ApiMessageWithParts[] = validMessages.map(message => {
    // Map source to role (user, model, system)
    let role: 'user' | 'model' | 'system';

    if (message.source === 'user') {
      role = 'user';
    } else if (message.source === 'system') {
      role = 'system';
    } else {
      // Treat 'gemini', 'transcript', 'web', 'fallback' as 'model' role for the API
      role = 'model';
    }

    // Ensure content is a string, default to empty string if not
    const textContent = typeof message.content === 'string' ? message.content : '';

    return {
      role,
      parts: [{ text: textContent }] // Use the parts structure
    };
  });

  // Add the new user message in the correct format
  apiMessages.push({
    role: 'user',
    parts: [{ text: newUserContent }] // Use the parts structure
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
  let source: MessageSource = dbMessage.is_user ? 'user' : 'gemini'; // Default AI source to gemini

  // Override source if metadata exists and has a source
  if (dbMessage.metadata && dbMessage.metadata.source) {
    // Ensure the source from metadata is one of the allowed MessageSource types
    const validSources: MessageSource[] = ['user', 'system', 'gemini', 'vertex', 'transcript', 'web', 'fallback'];
    if (validSources.includes(dbMessage.metadata.source as MessageSource)) {
       source = dbMessage.metadata.source as MessageSource;
    } else {
        console.warn(`Invalid source found in metadata: ${dbMessage.metadata.source}. Defaulting based on is_user.`);
    }
  }

  // Create the message data with all fields properly populated
  const messageData: MessageData = {
    id: dbMessage.id, // Include the ID
    content: dbMessage.content ?? '', // Ensure content is always a string
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
      .select('metadata', { count: 'exact', head: true }) // More efficient check
      .limit(1);

    // Error doesn't necessarily mean column doesn't exist (e.g., RLS issues),
    // but if the error message indicates the column is missing, return false.
    if (error && error.message.includes('column "metadata" does not exist')) {
       console.warn('Metadata column does not exist on messages table.');
      return false;
    } else if (error) {
        // Log other errors but assume column might exist or access is denied
        console.error('Error checking for metadata column (may be RLS or other issue):', error.message);
         // Cautiously return true or handle based on specific error codes if needed
         return true; // Assume exists unless specific "does not exist" error
    }

    console.log('Metadata column check successful (column likely exists).');
    return true; // Column exists or query didn't error specifically on its absence
  } catch (e) {
    console.error('Unexpected error checking metadata column:', e);
    return false; // Assume non-existent on unexpected errors
  }
}


/**
 * Prepare message objects for database insertion with metadata
 * This creates properly formatted message objects for insertion into the database
 */
export function prepareMessagesForDb(
  conversationId: string,
  userMessageContent: string, // Expecting just the content string
  responseMessage: { content: string, source: MessageSource, citation?: string[] } // Using MessageSource type
): any[] { // Return type could be more specific e.g., Partial<DbMessage>[]
  console.log('Preparing messages for database insertion with metadata');

  // User message object
  const userMessageObj = {
    conversation_id: conversationId,
    content: userMessageContent,
    is_user: true,
    metadata: { source: 'user' } // Add source to user message metadata
  };

  // Response message object with metadata
  const responseMessageObj = {
    conversation_id: conversationId,
    content: responseMessage.content,
    is_user: false,
    metadata: {
      source: responseMessage.source, // Store the actual source (gemini, system, etc.)
      // Store citation array directly if your DB supports JSONB, otherwise handle single string/null
      citation: responseMessage.citation // Assuming metadata column is JSONB
      // citation: responseMessage.citation?.[0] // Use this if metadata.citation is text
    }
  };

  return [userMessageObj, responseMessageObj];
}
