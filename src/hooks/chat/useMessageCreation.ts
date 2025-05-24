import { MessageData, MessageSource } from '@/utils/messageUtils';

/**
 * Hook for creating different types of message objects
 * Separated from useMessages for better code organization and reusability
 */
export function useMessageCreation() {
  /**
   * Creates a user message object
   */
  const createUserMessage = (content: string): MessageData => {
    return {
      content,
      source: 'user',
      timestamp: new Date()
    };
  };

  /**
   * Creates a system/AI message object
   */
  const createSystemMessage = (
    content: string,
    source: MessageSource = 'gemini',
    citation?: string[],
    metadata?: MessageData['metadata'],
    id?: string
  ): MessageData => {
    return {
      id: id || crypto.randomUUID(),
      content,
      source,
      timestamp: new Date(),
      citation,
      metadata
    };
  };

  /**
   * Creates an error message object
   */
  const createErrorMessage = (error: string): MessageData => {
    return createSystemMessage(
      `Error: ${error}. Please try again or rephrase your question.`,
      'system'
    );
  };
  
  /**
   * Creates a loading message object
   */
  const createLoadingMessage = (): MessageData => {
    return {
      content: 'Thinking...',
      source: 'system',
      isLoading: true
    };
  };

  /**
   * Formats messages for the API
   */
  const formatMessagesForApi = (messages: MessageData[], newUserContent: string) => {
    // Filter out loading messages and keep only message content for API
    const apiMessages = messages
      .filter(msg => !msg.isLoading)
      .map(msg => ({
        role: msg.source === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
    
    // Add the new user message to the API messages
    apiMessages.push({
      role: 'user',
      content: newUserContent
    });
    
    return apiMessages;
  };

  return {
    createUserMessage,
    createSystemMessage,
    createErrorMessage,
    createLoadingMessage,
    formatMessagesForApi
  };
}