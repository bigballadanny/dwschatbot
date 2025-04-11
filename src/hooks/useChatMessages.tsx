import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { useMessages } from './useMessages';
import { useConversation } from './useConversation';
import { useAudioPlayer } from './useAudioPlayer';
import { useSearchConfig } from './useSearchConfig';
import { MessageSource } from '@/utils/messageUtils';

interface UseChatMessagesProps {
  user: any;
  conversationId: string | null;
  audioEnabled: boolean;
}

export function useChatMessages({ 
  user, 
  conversationId, 
  audioEnabled 
}: UseChatMessagesProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const userId = user?.id;
  
  const {
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
  } = useMessages({ userId, conversationId });
  
  const {
    setConversationId,
    createNewConversation,
    saveMessages,
    updateConversationTitle,
    setupConversationMonitor
  } = useConversation({ userId });
  
  const {
    currentAudioSrc,
    setCurrentAudioSrc,
    playAudio,
    stopAudio
  } = useAudioPlayer();
  
  const {
    enableOnlineSearch,
    toggleOnlineSearch
  } = useSearchConfig();

  // Load conversation messages when conversationId changes
  useEffect(() => {
    const loadConversation = async () => {
      if (conversationId && user) {
        const success = await loadMessages(conversationId, user.id);
        if (!success) {
          navigate('/');
          toast({ title: "Conversation not found", variant: "destructive" });
        }
      } else if (!user) {
        resetMessages();
      }
      
      setCurrentAudioSrc(null);
    };
    
    loadConversation();
  }, [conversationId, user]);

  // Monitor conversation deletion
  useEffect(() => {
    if (!user || !conversationId) return;
    
    const channel = setupConversationMonitor(conversationId, () => {
      navigate('/', { replace: true });
      resetChat();
    });
    
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, conversationId, navigate]);

  const resetChat = () => {
    resetMessages();
    setCurrentAudioSrc(null);
  };

  const sendMessage = async (message: string, isVoiceInput: boolean = false): Promise<void> => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading) return;
    
    if (!user) {
      toast({ title: "Authentication Required", description: "Please sign in.", variant: "default" });
      return;
    }

    let currentConvId = conversationId;
    let isFirstUserInteraction = !hasInteracted;

    setCurrentAudioSrc(null);

    // Create new conversation if needed
    if (!currentConvId) {
      currentConvId = await createNewConversation(trimmedMessage);
      if (!currentConvId) return;
      isFirstUserInteraction = true;
    }

    // Add user message to UI
    addUserMessage(trimmedMessage);
    
    setIsLoading(true);

    try {
      // Format messages for the API
      const apiMessages = formatMessagesForApi(trimmedMessage);

      // Send request to Supabase function
      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: {
          query: trimmedMessage,
          messages: apiMessages,
          isVoiceInput: isVoiceInput,
          enableOnlineSearch: enableOnlineSearch,
          conversationId: currentConvId
        }
      });

      if (error || !data?.content) {
        throw new Error(error?.message || data?.error || 'Function returned empty response');
      }

      // Process the response
      const responseMessage = addSystemMessage(
        data.content, 
        (data.source || 'gemini') as 'gemini' | 'system', 
        data.citation
      );

      // Save messages to database
      await saveMessages(
        currentConvId, 
        user.id, 
        trimmedMessage, 
        {
          content: responseMessage.content,
          source: responseMessage.source as 'gemini' | 'system',
          citation: responseMessage.citation
        }
      );

      // Handle audio if enabled
      if (audioEnabled && data.audioContent) {
        playAudio(data.audioContent);
      }

      // Update conversation title if first interaction
      if (isFirstUserInteraction) {
        await updateConversationTitle(currentConvId, trimmedMessage);
        setHasInteracted(true);
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);
      addErrorMessage(error instanceof Error ? error.message : 'Request failed.');
      toast({ 
        title: "Error Processing Message", 
        description: error instanceof Error ? error.message : "Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    currentAudioSrc,
    enableOnlineSearch,
    hasInteracted,
    sendMessage,
    createNewConversation,
    resetChat,
    toggleOnlineSearch,
    handleAudioStop: stopAudio,
    setCurrentAudioSrc
  };
}
