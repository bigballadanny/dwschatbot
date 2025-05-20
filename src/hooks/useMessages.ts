import { useState, useCallback, useEffect } from 'react';
import { MessageData } from '@/utils/messageUtils';
import { useMessageCreation } from './useMessageCreation';
import { useMessageApi } from './useMessageApi';

interface UseMessagesProps {
  userId: string | undefined;
  conversationId: string | null;
}

/**
 * Optimized useMessages hook that separates concerns and improves performance
 */
export function useMessages({ userId, conversationId }: UseMessagesProps) {
  // State
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Import separated functionality
  const messageCreation = useMessageCreation();
  const messageApi = useMessageApi({ userId, conversationId });
  
  // Load messages effect
  useEffect(() => {
    if (conversationId && userId) {
      loadMessages(conversationId, userId)
        .catch(err => console.error('Error in automatic message loading:', err));
    } else {
      // Reset messages if conversation ID or user ID is missing
      resetMessages();
    }
  }, [conversationId, userId]);
  
  /**
   * Reset messages state
   */
  const resetMessages = useCallback(() => {
    setMessages([]);
    setHasInteracted(false);
  }, []);

  /**
   * Load messages from the database
   */
  const loadMessages = useCallback(async (convId: string, userId: string) => {
    try {
      const result = await messageApi.loadMessages(convId, userId);
      
      if (result.success && result.messages.length > 0) {
        setMessages(result.messages);
        setHasInteracted(true);
        return true;
      }
      
      return result.success;
    } catch (error) {
      console.error('Error loading messages:', error);
      return false;
    }
  }, [messageApi]);

  /**
   * Add a user message to the UI
   */
  const addUserMessage = useCallback((content: string): MessageData => {
    const userMessage = messageCreation.createUserMessage(content);
    setMessages(prevMessages => [...prevMessages, userMessage]);
    return userMessage;
  }, [messageCreation]);

  /**
   * Add a system/AI message to the UI
   */
  const addSystemMessage = useCallback((
    content: string,
    source = 'gemini' as const,
    citation?: string[]
  ): MessageData => {
    const systemMessage = messageCreation.createSystemMessage(content, source, citation);
    setMessages(prevMessages => [...prevMessages, systemMessage]);
    return systemMessage;
  }, [messageCreation]);

  /**
   * Add an error message to the UI
   */
  const addErrorMessage = useCallback((error: string): MessageData => {
    const errorMessage = messageCreation.createErrorMessage(error);
    setMessages(prevMessages => [...prevMessages, errorMessage]);
    return errorMessage;
  }, [messageCreation]);
  
  /**
   * Add a loading message to the UI
   */
  const addLoadingMessage = useCallback((): MessageData => {
    const loadingMessage = messageCreation.createLoadingMessage();
    setMessages(prevMessages => [...prevMessages, loadingMessage]);
    return loadingMessage;
  }, [messageCreation]);
  
  /**
   * Remove loading messages from the UI
   */
  const removeLoadingMessage = useCallback(() => {
    setMessages(prevMessages => prevMessages.filter(msg => !msg.isLoading));
  }, []);

  /**
   * Format messages for the API
   */
  const formatMessagesForApi = useCallback((newUserContent: string) => {
    return messageCreation.formatMessagesForApi(messages, newUserContent);
  }, [messages, messageCreation]);

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
    addLoadingMessage,
    removeLoadingMessage,
    formatMessagesForApi
  };
}