
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMessages } from './useMessages';
import { useConversation } from './useConversation';
import { useAudio } from './useAudio';
import { useSearchConfig } from './useSearchConfig';
import { MessageSource } from '@/utils/messageUtils';

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
  const [actualConversationId, setActualConversationId] = useState<string | null>(conversationId);
  
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
  } = useMessages({ userId, conversationId: actualConversationId });
  
  const {
    hasMetadataColumn, // Now correctly destructured
    createNewConversation,
    saveMessages,
    updateConversationTitle,
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

  // Load conversation messages when conversationId changes
  useEffect(() => {
    // Update the local conversationId state when the prop changes
    setActualConversationId(conversationId);
    
    const loadConversation = async () => {
      if (conversationId && user) {
        console.log("Loading conversation:", conversationId);
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
    if (!user || !actualConversationId) return;
    
    const channel = setupConversationMonitor(actualConversationId, () => {
      navigate('/', { replace: true });
      resetChat();
    });
    
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, actualConversationId, navigate]);

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

    let currentConvId = actualConversationId;
    let isFirstUserInteraction = !hasInteracted;

    clearAudio();

    // Create new conversation if needed
    if (!currentConvId) {
      console.log("No conversation ID, creating new conversation");
      const newConversationId = await createNewConversation(trimmedMessage);
      if (!newConversationId) return;
      
      // Update URL and state
      setActualConversationId(newConversationId);
      navigate(`/?conversation=${newConversationId}`, { replace: true });
      currentConvId = newConversationId;
      isFirstUserInteraction = true;
      console.log("Created new conversation:", newConversationId);
    }

    // Add user message to UI
    console.log("Adding user message to UI:", trimmedMessage);
    addUserMessage(trimmedMessage);
    
    setIsLoading(true);

    try {
      // Format messages for the API
      const apiMessages = formatMessagesForApi(trimmedMessage);

      console.log("Sending request to Supabase function");
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
      console.log("Processing AI response");
      const responseMessage = addSystemMessage(
        data.content, 
        (data.source || 'gemini') as MessageSource, 
        data.citation
      );

      // Save messages to database
      console.log("Saving messages to database for conversation:", currentConvId);
      const saveSuccess = await saveMessages(
        currentConvId, 
        user.id, 
        trimmedMessage, 
        {
          content: responseMessage.content,
          source: responseMessage.source as 'gemini' | 'system',
          citation: responseMessage.citation
        }
      );

      if (!saveSuccess) {
        console.warn("Failed to save messages, but continuing with chat interaction");
      } else {
        console.log("Successfully saved messages");
      }

      // Handle audio if enabled
      if (isAudioEnabled && data.audioContent) {
        playAudio(data.audioContent);
      } else if (isAudioEnabled && data.content && !data.audioContent) {
        // If no audio content is provided, use text-to-speech
        try {
          const processedText = data.content.substring(0, 500); // Limit TTS to 500 chars
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

      // Update conversation title if first interaction
      if (isFirstUserInteraction) {
        console.log("Updating conversation title for first interaction");
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
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }
    
    // For now, just create a message about the file
    // In a real implementation, this would upload and process the file
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
