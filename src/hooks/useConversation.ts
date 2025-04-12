
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { checkMetadataColumnExists, prepareMessagesForDb } from '@/utils/messageUtils';

interface UseConversationProps {
  userId: string | undefined;
}

export function useConversation({ userId }: UseConversationProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const createNewConversation = async (initialMessage?: string): Promise<string | null> => {
    if (!userId) return null;
    
    try {
      const title = initialMessage ? initialMessage.substring(0, 40) : 'New Chat';
      
      const { data, error } = await supabase
        .from('conversations')
        .insert([{ 
          user_id: userId, 
          title 
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      if (data) {
        const newConversationId = data.id;
        setConversationId(newConversationId);
        console.log('Successfully created new conversation:', newConversationId);
        return newConversationId;
      } else {
        throw new Error("Conversation creation returned no data.");
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({ 
        title: "Error Creating Conversation", 
        variant: "destructive" 
      });
      return null;
    }
  };

  const saveMessages = async (
    conversationId: string,
    userId: string,
    userMessage: string,
    responseMessage: { content: string, source: 'gemini' | 'system', citation?: string[] }
  ): Promise<boolean> => {
    try {
      console.log(`Saving messages to conversation: ${conversationId}`);
      
      // Since we've now added the metadata column, we can safely prepare messages with metadata
      const messageObjects = prepareMessagesForDb(
        conversationId, 
        userMessage, 
        responseMessage
      );
      
      console.log('Message objects prepared for insertion:', messageObjects.length);
      
      // Insert both messages
      const { error } = await supabase
        .from('messages')
        .insert(messageObjects);
      
      if (error) {
        console.error('Error saving messages:', error);
        return false;
      }
      
      console.log('Successfully saved messages to conversation:', conversationId);
      return true;
    } catch (error) {
      console.error('Error in saveMessages:', error);
      return false;
    }
  };

  const updateConversationTitle = async (id: string, title: string) => {
    if (!title.trim() || !id) return false;
    
    try {
      await supabase
        .from('conversations')
        .update({ title: title.substring(0, 40) })
        .eq('id', id);
      return true;
    } catch (error) {
      console.error('Error updating conversation title:', error);
      return false;
    }
  };

  const setupConversationMonitor = (currentConversationId: string | null, onDelete: () => void) => {
    if (!userId || !currentConversationId) return null;
    
    const channel = supabase
      .channel('conversation-changes')
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'conversations', 
        filter: `user_id=eq.${userId}` 
      }, (payload) => {
        if (payload.old?.id === currentConversationId) {
          onDelete();
        }
      })
      .subscribe();
      
    return channel;
  };

  return {
    conversationId,
    setConversationId,
    createNewConversation,
    saveMessages,
    updateConversationTitle,
    setupConversationMonitor
  };
}
