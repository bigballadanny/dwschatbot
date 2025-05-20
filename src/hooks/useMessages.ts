
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Import uuid
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { MessageData, MessageSource, DbMessage, convertMessagesToApi, dbMessageToUiMessage } from '@/utils/messageUtils';

interface UseMessagesProps {
  userId: string | undefined;
  conversationId: string | null;
}

export function useMessages({ userId, conversationId }: UseMessagesProps) {
  // Initialize messages state as an empty array
  const [messages, setMessages] = useState<MessageData[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  const { toast } = useToast();

  // Reset messages to initial state
  const resetMessages = () => {
    setMessages([]); // Reset to empty array
    setHasInteracted(false);
  };

  // Load messages for a conversation from the database
  const loadMessages = async (convId: string, uid: string) => {
    setIsLoading(true);
    
    try {
      console.log(`Fetching messages for conversation: ${convId}`);
      
      // Fetch messages from the database - IMPORTANT: removed user_id filter since this column doesn't exist
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });
        
      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        console.log(`Found ${data.length} messages for conversation ${convId}`);
        
        // Transform database messages to UI message format using the improved utility function
        // Cast data to DbMessage[] to avoid type instantiation issues
        const dbMessages = data as DbMessage[];
        const formattedMessages = dbMessages.map(msg => dbMessageToUiMessage(msg));
        
        console.log('Messages formatted for UI:', formattedMessages.length);
        
        setMessages(formattedMessages);
        setHasInteracted(true);
        return true;
      } else {
        console.log(`No messages found for conversation ${convId}, checking if conversation exists`);
        
        // Check if the conversation exists but has no messages
        const { data: convoData, error: convoError } = await supabase
          .from('conversations')
          .select('id')
          .eq('id', convId)
          .eq('user_id', uid)
          .maybeSingle();
          
        if (convoError) {
          console.error('Error checking conversation:', convoError);
        }
          
        if (convoData) {
          console.log(`Conversation ${convId} exists but has no messages`);
          // Conversation exists but is empty, set messages to empty array
          setMessages([]);
          setHasInteracted(false); // User hasn't interacted in *this* session yet
          return true; // Indicate conversation was found (even if empty)
        } else {
          console.log(`Conversation ${convId} not found or not owned by user ${uid}`);
          return false;
        }
      }
    } catch (error) {
      console.error('Error loading conversation messages:', error);
      toast({ title: "Error Loading Messages", variant: "destructive" });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Add a user message to the UI
  const addUserMessage = (content: string): MessageData => {
    const userMessage: MessageData = {
      id: `temp-${uuidv4()}`, // Add temporary ID
      content,
      source: 'user',
      timestamp: new Date()
    };
    const loadingMessage: MessageData = { // Define loading message with ID
      id: `temp-loading-${uuidv4()}`,
      content: '',
      source: 'system',
      isLoading: true,
      timestamp: new Date()
    };

    setMessages(prevMessages => [
      ...prevMessages,
      userMessage,
      loadingMessage // Add the defined loading message
    ]);
    
    return userMessage;
  };

  // Add a system/AI message to the UI
  const addSystemMessage = (content: string, source: MessageSource = 'gemini', citation?: string[]): MessageData => {
    const message: MessageData = {
      id: `temp-${uuidv4()}`, // Add temporary ID
      content,
      source,
      timestamp: new Date(),
      citation
    };
    
    // Remove any loading messages and add the new message
    setMessages(prev => [...prev.filter(msg => !msg.isLoading), message]);
    return message;
  };

  // Add an error message
  const addErrorMessage = (errorText: string): void => {
    setMessages(prev => [
      ...prev.filter(msg => !msg.isLoading),
      {
        id: `temp-error-${uuidv4()}`, // Add temporary ID
        content: `Error: ${errorText}`,
        source: 'system',
        timestamp: new Date()
      }
    ]);
  };

  // Format messages for API calls using the utility function
  const formatMessagesForApi = (newUserContent: string) => {
    return convertMessagesToApi(messages, newUserContent);
  };

  return {
    messages,
    isLoading,
    setIsLoading,
    hasInteracted,
    setHasInteracted,
    resetMessages,
    loadMessages,
    addUserMessage,
    addSystemMessage,
    addErrorMessage,
    formatMessagesForApi
  };
}
