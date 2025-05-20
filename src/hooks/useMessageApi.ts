import { supabase } from '@/integrations/supabase/client';
import { DbMessage, dbMessageToUiMessage } from '@/utils/messageUtils';
import { useCallback } from 'react';

interface UseMessageApiProps {
  userId?: string;
  conversationId: string | null;
}

/**
 * Hook for handling message API operations
 * Separated from useMessages for better code organization
 */
export function useMessageApi({ userId, conversationId }: UseMessageApiProps) {
  /**
   * Load messages for a conversation from the database
   */
  const loadMessages = useCallback(async (convId: string, userId: string) => {
    try {
      // First check if the conversation exists and belongs to the user
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('user_id')
        .eq('id', convId)
        .single();
      
      if (convError || !convData) return { success: false, messages: [] };
      
      // Verify user has access to this conversation
      if (convData.user_id !== userId) {
        return { success: false, messages: [] };
      }
      
      // Load messages
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Convert database messages to UI format
        const loadedMessages = data.map((message) => 
          dbMessageToUiMessage(message as unknown as DbMessage)
        );
        return { success: true, messages: loadedMessages };
      }
      
      // Conversation exists but has no messages
      return { success: true, messages: [] };
    } catch (error) {
      console.error('Error loading messages:', error);
      return { success: false, messages: [] };
    }
  }, []);

  /**
   * Save messages to the database
   */
  const saveMessages = useCallback(async (
    convId: string,
    userId: string,
    userMessage: string,
    aiMessage: { content: string, source: 'gemini' | 'system', citation?: string[] }
  ) => {
    try {
      // Check for required data
      if (!convId || !userId || !userMessage || !aiMessage.content) {
        throw new Error('Missing required data for saving messages');
      }
      
      // Create user message
      const { error: userMsgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          user_id: userId,
          content: userMessage,
          role: 'user',
        });
        
      if (userMsgError) throw userMsgError;
      
      // Create AI message
      const { error: aiMsgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          user_id: userId,
          content: aiMessage.content,
          role: 'assistant',
          source: aiMessage.source,
          citation: aiMessage.citation,
        });
        
      if (aiMsgError) throw aiMsgError;
      
      return { success: true };
    } catch (error) {
      console.error('Error saving messages:', error);
      return { success: false, error };
    }
  }, []);

  return {
    loadMessages,
    saveMessages
  };
}