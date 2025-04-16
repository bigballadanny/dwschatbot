
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

    if (!currentConvId) {
      currentConvId = await createNewConversation(trimmedMessage);
      if (!currentConvId) return;
      isFirstUserInteraction = true;
    }

    addUserMessage(trimmedMessage);
    
    setIsLoading(true);

    try {
      const apiMessages = formatMessagesForApi(trimmedMessage);

      console.log("Sending request to gemini-chat function with online search:", enableOnlineSearch);
      
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

      console.log("Response received:", {
        content: data.content?.substring(0, 50) + "...",
        source: data.source,
        hasCitation: !!data.citation,
        citationCount: data.citation?.length
      });

      // Determine the source type based on citation presence
      const sourceType = data.citation && data.citation.length > 0 ? 'transcript' : (data.source || 'gemini');
      
      // Pass the source type without type casting to avoid type errors
      const responseMessage = addSystemMessage(
        data.content, 
        sourceType, 
        data.citation
      );

      await saveMessages(
        currentConvId, 
        user.id, 
        trimmedMessage, 
        {
          content: responseMessage.content,
          source: responseMessage.source,
          citation: responseMessage.citation
        }
      );

      if (audioEnabled && data.audioContent) {
        playAudio(data.audioContent);
      }

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
