
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { MessageData, ApiMessage, MessageSource } from '@/utils/messageUtils';

interface UseMessagesProps {
  userId: string | undefined;
  conversationId: string | null;
}

export function useMessages({ userId, conversationId }: UseMessagesProps) {
  const [messages, setMessages] = useState<MessageData[]>([{
    content: "Hello! I'm Carl Allen's Expert Bot. Ask me anything about M&A based on Carl's teachings.",
    source: 'system',
    timestamp: new Date(),
  }]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  const { toast } = useToast();

  const resetMessages = () => {
    setMessages([{
      content: "Hello! I'm Carl Allen's Expert Bot. Ask me anything...",
      source: 'system', 
      timestamp: new Date(),
    }]);
    setHasInteracted(false);
  };

  const loadMessages = async (conversationId: string, userId: string) => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const formattedMessages = data.map((msg: any): MessageData => ({
          content: msg.content,
          source: msg.is_user ? 'user' : ((msg.metadata?.source as MessageSource) || 'gemini'),
          timestamp: new Date(msg.created_at),
          citation: msg.metadata?.citation ? [msg.metadata.citation] : undefined
        }));
        
        setMessages(formattedMessages);
        setHasInteracted(true);
        return true;
      } else {
        const { data: convoData } = await supabase
          .from('conversations')
          .select('id')
          .eq('id', conversationId)
          .eq('user_id', userId)
          .maybeSingle();
          
        if (convoData) {
          setMessages([{
            content: "Ask me anything...", 
            source: 'system', 
            timestamp: new Date(),
          }]);
          setHasInteracted(false);
          return true;
        } 
        return false;
      }
    } catch (error) {
      console.error('Error loading conversation messages:', error);
      toast({ title: "Error Loading Messages", variant: "destructive" });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const addUserMessage = (content: string): MessageData => {
    const userMessage: MessageData = { 
      content, 
      source: 'user', 
      timestamp: new Date() 
    };
    
    setMessages(prevMessages => [
      ...prevMessages,
      userMessage,
      { content: '', source: 'system', isLoading: true, timestamp: new Date() }
    ]);
    
    return userMessage;
  };

  const addSystemMessage = (content: string, source: MessageSource = 'gemini', citation?: string[]): MessageData => {
    const message: MessageData = {
      content,
      source,
      timestamp: new Date(),
      citation
    };
    
    setMessages(prev => [...prev.filter(msg => !msg.isLoading), message]);
    return message;
  };

  const addErrorMessage = (errorText: string): void => {
    setMessages(prev => [
      ...prev.filter(msg => !msg.isLoading),
      { 
        content: `Error: ${errorText}`, 
        source: 'system', 
        timestamp: new Date() 
      }
    ]);
  };

  const formatMessagesForApi = (newUserContent: string): ApiMessage[] => {
    const filteredMessages = messages.filter(msg => !msg.isLoading);
    
    const apiMessages: ApiMessage[] = filteredMessages.map(msg => {
      let role: 'user' | 'assistant' | 'system';
      
      switch (msg.source) {
        case 'user':
          role = 'user';
          break;
        case 'system':
          role = 'system';
          break;
        default:
          role = 'assistant';
      }
      
      return {
        role,
        content: msg.content
      };
    });
    
    // Add the new user message
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
    formatMessagesForApi
  };
}
