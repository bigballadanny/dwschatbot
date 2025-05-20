
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMessages } from './useMessages';
import { useConversation } from './useConversation';
import { useAudioPlayback } from './useAudioPlayback';
import { useSearchConfig } from './useSearchConfig';
import { submitMessageFeedback } from '@/utils/feedbackUtils'; // Import feedback utility

interface UseChatControllerProps {
  user: any;
  conversationId: string | null;
  audioEnabled?: boolean;
}

export function useChatController({ 
  user, 
  conversationId, 
  audioEnabled = false 
}: UseChatControllerProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const userId = user?.id;
  
  const [isAudioEnabled, setIsAudioEnabled] = useState(audioEnabled);
  
  // Initialize child hooks
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
    conversationId: activeConversationId,
    setConversationId,
    createNewConversation,
    saveMessages,
    updateConversationTitle,
    setupConversationMonitor
  } = useConversation({ userId });
  
  const {
    audioSrc,
    isGenerating,
    generateSpeech,
    stopAudio,
    clearAudio
  } = useAudioPlayback(isAudioEnabled);
  
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
      
      clearAudio();
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
    clearAudio();
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

    clearAudio();

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

      // Generate speech if enabled
      if (isAudioEnabled && data.content) {
        generateSpeech(data.content);
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

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
    
    if (isAudioEnabled) {
      stopAudio();
    }
    
    toast({
      title: !isAudioEnabled ? "Audio Enabled" : "Audio Disabled",
      description: !isAudioEnabled ? "Voice responses will play." : "Voice responses muted."
    });
  };

  // AN-03: Handle message feedback submission
  const handleMessageFeedback = async (messageId: string, rating: 1 | -1) => {
    if (!userId) {
      toast({ title: "Error", description: "User not logged in.", variant: "destructive" });
      return;
    }
    if (!conversationId) {
       toast({ title: "Error", description: "Cannot submit feedback outside a conversation.", variant: "destructive" });
       return;
    }
    if (!messageId || messageId.startsWith('temp-')) {
       toast({ title: "Error", description: "Cannot submit feedback for temporary messages.", variant: "destructive" });
       return;
    }

    console.log(`Controller handling feedback for message ${messageId}, rating: ${rating}`);

    const { error } = await submitMessageFeedback(messageId, conversationId, userId, rating);

    if (error) {
      toast({
        title: "Feedback Error",
        description: `Failed to submit feedback: ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Feedback Submitted",
        description: `Thank you for your feedback! (${rating === 1 ? '👍' : '👎'})`,
      });
      // Note: Visual feedback (highlighting thumb) is handled in MessageItem.tsx
    }
  };


  return {
    messages,
    isLoading,
    audioSrc,
    isAudioEnabled,
    enableOnlineSearch,
    hasInteracted,
    sendMessage,
    createNewConversation,
    resetChat,
    toggleOnlineSearch,
    toggleAudio,
    stopAudio,
    handleMessageFeedback // Expose the feedback handler
  };
}
