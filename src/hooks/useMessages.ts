
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MessageData, MessageSource, dbMessageToUiMessage, DbMessage } from '@/utils/messageUtils';

interface UseMessagesProps {
  userId: string | undefined;
  conversationId: string | null;
}

export function useMessages({ userId, conversationId }: UseMessagesProps) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const resetMessages = () => {
    setMessages([]);
    setHasInteracted(false);
  };

  const loadMessages = async (convId: string, userId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Convert database messages to UI format
        const loadedMessages = data.map((message) => dbMessageToUiMessage(message as unknown as DbMessage));
        setMessages(loadedMessages);
        setHasInteracted(true);
        return true;
      } else {
        // Check if the conversation exists but has no messages
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .select('user_id')
          .eq('id', convId)
          .single();
        
        if (convError || !convData) return false;
        
        // Verify user has access to this conversation
        return convData.user_id === userId;
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      return false;
    }
  };

  const addUserMessage = (content: string): MessageData => {
    const userMessage: MessageData = {
      content,
      source: 'user',
      timestamp: new Date()
    };
    
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    return userMessage;
  };

  const addSystemMessage = (
    content: string,
    source: MessageSource = 'gemini',
    citation?: string[]
  ): MessageData => {
    const systemMessage: MessageData = {
      content,
      source,
      timestamp: new Date(),
      citation
    };
    
    setMessages((prevMessages) => [
      ...prevMessages,
      systemMessage
    ]);
    
    return systemMessage;
  };

  const addErrorMessage = (error: string): MessageData => {
    const errorMessage = addSystemMessage(
      `Error: ${error}. Please try again or rephrase your question.`,
      'system'
    );
    return errorMessage;
  };
  
  const addLoadingMessage = (): MessageData => {
    const loadingMessage: MessageData = {
      content: 'Thinking...',
      source: 'system',
      isLoading: true
    };
    
    setMessages((prevMessages) => [...prevMessages, loadingMessage]);
    return loadingMessage;
  };
  
  const removeLoadingMessage = () => {
    setMessages((prevMessages) => 
      prevMessages.filter(msg => !msg.isLoading)
    );
  };

  const formatMessagesForApi = (newUserContent: string) => {
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
