
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
  const [hasMetadataColumn, setHasMetadataColumn] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if the metadata column exists when the hook initializes
  useEffect(() => {
    const checkMetadata = async () => {
      if (userId) {
        try {
          const hasMetadata = await checkMetadataColumnExists(supabase);
          setHasMetadataColumn(hasMetadata);
          console.log(`Database ${hasMetadata ? 'supports' : 'does not support'} metadata column`);
        } catch (error) {
          console.error('Error checking metadata support:', error);
          // Default to false to be safe
          setHasMetadataColumn(false);
        }
      }
    };
    
    checkMetadata();
  }, [userId]);

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
      console.log(`Attempting to save messages to conversation: ${conversationId}`);
      
      // If we haven't checked for metadata column yet, do it now
      if (hasMetadataColumn === null) {
        try {
          const metadata = await checkMetadataColumnExists(supabase);
          setHasMetadataColumn(metadata);
          console.log(`Metadata check completed: ${metadata ? 'supported' : 'not supported'}`);
        } catch (err) {
          console.error('Error checking metadata on save:', err);
          setHasMetadataColumn(false);
        }
      }
      
      // Prepare message objects based on metadata support
      const messageObjects = prepareMessagesForDb(
        conversationId, 
        userMessage, 
        responseMessage, 
        !!hasMetadataColumn
      );
      
      console.log(`Saving messages with metadata support: ${!!hasMetadataColumn}`);
      
      // Insert both messages
      const { error } = await supabase
        .from('messages')
        .insert(messageObjects);
      
      if (error) {
        console.error('Error saving messages:', error);
        
        // If we get an error and thought metadata was supported, try again without metadata
        if (hasMetadataColumn && error.message && error.message.includes('metadata')) {
          console.log('Error suggests metadata is not supported, retrying without metadata');
          setHasMetadataColumn(false);
          
          // Prepare objects again without metadata
          const fallbackObjects = prepareMessagesForDb(
            conversationId,
            userMessage,
            responseMessage,
            false
          );
          
          // Try again without metadata
          const { error: fallbackError } = await supabase
            .from('messages')
            .insert(fallbackObjects);
            
          if (fallbackError) {
            console.error('Error in fallback save:', fallbackError);
            return false;
          }
          
          console.log('Successfully saved messages without metadata after fallback');
          return true;
        }
        
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
    hasMetadataColumn,
    createNewConversation,
    saveMessages,
    updateConversationTitle,
    setupConversationMonitor
  };
}
