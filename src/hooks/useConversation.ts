
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { prepareMessageForDb } from '@/utils/messageUtils';

interface UseConversationProps {
  userId: string | undefined;
}

export function useConversation({ userId }: UseConversationProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const createNewConversation = async (initialMessage?: string): Promise<string | null> => {
    if (!userId) {
      console.log("Cannot create conversation: No user ID provided");
      return null;
    }
    
    try {
      const title = initialMessage ? initialMessage.substring(0, 40) : 'New Chat';
      console.log(`Creating new conversation for user: ${userId} with title: ${title}`);
      
      const { data, error } = await supabase
        .from('conversations')
        .insert([{ 
          user_id: userId, 
          title,
          updated_at: new Date().toISOString() // Set the initial updated_at explicitly
        }])
        .select()
        .single();
        
      if (error) {
        console.error('Error creating conversation:', error);
        throw error;
      }
      
      if (data) {
        const newConversationId = data.id;
        console.log(`Created new conversation with ID: ${newConversationId}`);
        setConversationId(newConversationId);
        navigate(`/?conversation=${newConversationId}`, { replace: true });
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
    responseMessage: { content: string, source: 'gemini' | 'system' | 'web' | 'fallback' | 'transcript', citation?: string[] }
  ) => {
    try {
      if (!userId) {
        console.error('Cannot save messages: No user ID provided');
        return false;
      }
      
      console.log(`Saving messages for conversation: ${conversationId} for user: ${userId}`);
      
      // Use the utility function to prepare messages with proper metadata
      const messages = [
        {
          ...prepareMessageForDb(conversationId, userMessage, true),
          user_id: userId
        },
        {
          ...prepareMessageForDb(
            conversationId, 
            responseMessage.content, 
            false, 
            responseMessage.source, 
            responseMessage.citation
          ),
          user_id: userId
        }
      ];
      
      console.log('Inserting messages with data:', JSON.stringify(messages, null, 2));
      
      const { data, error } = await supabase
        .from('messages')
        .insert(messages)
        .select();
      
      if (error) {
        console.error('Error inserting messages:', error);
        throw error;
      }
      
      console.log('Messages inserted successfully:', data);
      
      // Update conversation last update timestamp to ensure proper ordering
      const updateResult = await updateConversationTimestamp(conversationId);
      
      if (!updateResult) {
        console.warn('Failed to update conversation timestamp');
      }
      
      console.log(`Successfully saved messages to conversation ${conversationId}`);
      return true;
    } catch (error) {
      console.error('Error saving messages:', error);
      toast({
        title: "Failed to save messages",
        description: "Your messages may not be saved to history.",
        variant: "destructive"
      });
      return false;
    }
  };

  const updateConversationTitle = async (id: string, title: string) => {
    if (!title.trim() || !id) return false;
    
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ 
          title: title.substring(0, 40),
          updated_at: new Date().toISOString() // Update the timestamp when title changes
        })
        .eq('id', id);
        
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating conversation title:', error);
      return false;
    }
  };

  // New helper method to update the conversation timestamp
  const updateConversationTimestamp = async (id: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id);
        
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating conversation timestamp:', error);
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
    updateConversationTimestamp,
    setupConversationMonitor
  };
}
