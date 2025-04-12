import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMessages } from './useMessages';
import { useConversation } from './useConversation';
import { useAudio } from './useAudio';
import { useSearchConfig } from './useSearchConfig';
import { MessageSource, generateConversationTitle } from '@/utils/messageUtils';

interface UseChatProps {
  user: any;
  conversationId: string | null;
  audioEnabled?: boolean;
}

export function useChat({ 
  user, 
  conversationId, 
  audioEnabled = false 
}: UseChatProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const userId = user?.id;
  
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(audioEnabled);
  
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
    updateConversationTimestamp,
    setupConversationMonitor
  } = useConversation({ userId });
  
  const {
    audioSrc,
    isGenerating,
    isPlaying,
    playAudio,
    stopAudio,
    togglePlayback,
    clearAudio
  } = useAudio(isAudioEnabled);
  
  const {
    enableOnlineSearch,
    toggleOnlineSearch
  } = useSearchConfig();

  useEffect(() => {
    const loadConversation = async () => {
      if (conversationId && user) {
        console.log(`Loading conversation: ${conversationId} for user: ${user.id}`);
        const success = await loadMessages(conversationId, user.id);
        if (!success) {
          console.error(`Failed to load conversation: ${conversationId}`);
          navigate('/', { replace: true });
          toast({ title: "Conversation not found", variant: "destructive" });
        } else {
          console.log(`Successfully loaded conversation: ${conversationId}`);
          
          setConversationId(conversationId);
        }
      } else if (!user) {
        console.log("No user, resetting messages");
        resetMessages();
      }
      
      clearAudio();
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

    if (!currentConvId) {
      currentConvId = await createNewConversation(trimmedMessage);
      if (!currentConvId) return;
      isFirstUserInteraction = true;
    }

    console.log(`Sending message to conversation ${currentConvId} for user ${user.id}: ${trimmedMessage}`);

    addUserMessage(trimmedMessage);
    
    setIsLoading(true);

    try {
      const apiMessages = formatMessagesForApi(trimmedMessage);
      console.log('API messages to send:', apiMessages);

      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: {
          query: trimmedMessage,
          messages: apiMessages,
          isVoiceInput: isVoiceInput,
          enableOnlineSearch: enableOnlineSearch,
          conversationId: currentConvId,
          userId: user.id
        }
      });
      
      console.log('Response from gemini-chat function:', data, error);

      if (error || !data?.content) {
        throw new Error(error?.message || data?.error || 'Function returned empty response');
      }

      const responseMessage = addSystemMessage(
        data.content, 
        (data.source || 'gemini') as MessageSource, 
        data.citation
      );

      console.log(`Saving messages to conversation: ${currentConvId} for user: ${user.id}`);
      const saveResult = await saveMessages(
        currentConvId, 
        user.id, 
        trimmedMessage, 
        {
          content: responseMessage.content,
          source: responseMessage.source as 'gemini' | 'system',
          citation: responseMessage.citation
        }
      );
      
      if (!saveResult) {
        console.warn('Failed to save messages to database');
        toast({ 
          title: "Warning", 
          description: "Messages displayed but not saved to history.",
          variant: "default" 
        });
      }

      if (isAudioEnabled && data.audioContent) {
        playAudio(data.audioContent);
      } else if (isAudioEnabled && data.content && !data.audioContent) {
        try {
          const processedText = data.content.substring(0, 500);
          const { data: ttsData } = await supabase.functions.invoke('text-to-speech', {
            body: { text: processedText }
          });
          
          if (ttsData?.audioContent) {
            playAudio(ttsData.audioContent);
          }
        } catch (ttsError) {
          console.error('TTS fallback error:', ttsError);
        }
      }

      if (isFirstUserInteraction) {
        const generatedTitle = generateConversationTitle(trimmedMessage);
        console.log(`Setting initial conversation title: "${generatedTitle}"`);
        await updateConversationTitle(currentConvId, generatedTitle);
        setHasInteracted(true);
      } else {
        console.log(`Updating conversation timestamp for ordering: ${currentConvId}`);
        await updateConversationTimestamp(currentConvId);
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

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const allowedTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Unsupported File Type",
        description: "Please upload a PDF, Word, Excel, CSV, or text document.",
        variant: "destructive"
      });
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }
    
    const filePrompt = `I've uploaded a document titled "${file.name}". Please analyze this document and provide insights.`;
    await sendMessage(filePrompt, false);
  };

  return {
    messages,
    isLoading,
    audioSrc,
    isAudioEnabled,
    isPlaying,
    enableOnlineSearch,
    hasInteracted,
    sendMessage,
    createNewConversation,
    resetChat,
    toggleOnlineSearch,
    toggleAudio,
    togglePlayback,
    stopAudio,
    handleFileUpload
  };
}
