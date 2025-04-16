import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMessages } from './useMessages';
import { useConversation } from './useConversation';
import { useAudio } from './useAudio';
import { useSearchConfig } from './useSearchConfig';
import { MessageSource } from '@/utils/messageUtils';

const requestQueue = {
  isProcessing: false,
  lastRequestTime: 0,
  minTimeBetweenRequests: 1000,
  queue: [] as Array<() => Promise<void>>,
  maxRetries: 3,
  
  async add(request: () => Promise<void>) {
    this.queue.push(request);
    if (!this.isProcessing) {
      this.processQueue();
    }
  },
  
  async processQueue() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }
    
    this.isProcessing = true;
    const now = Date.now();
    const timeToWait = Math.max(0, this.minTimeBetweenRequests - (now - this.lastRequestTime));
    
    if (timeToWait > 0) {
      await new Promise(resolve => setTimeout(resolve, timeToWait));
    }
    
    const nextRequest = this.queue.shift();
    if (nextRequest) {
      this.lastRequestTime = Date.now();
      try {
        await nextRequest();
      } catch (error) {
        console.error('Request error:', error);
      }
      
      setTimeout(() => this.processQueue(), 100);
    } else {
      this.isProcessing = false;
    }
  }
};

const messageCache = new Map<string, any>();

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
  const [retryCount, setRetryCount] = useState<number>(0);
  const [lastError, setLastError] = useState<string | null>(null);
  
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
    hasMetadataColumn,
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

  useEffect(() => {
    setActualConversationId(conversationId);
    
    const loadConversation = async () => {
      if (conversationId && user) {
        try {
          const success = await loadMessages(conversationId, user.id);
          if (!success) {
            navigate('/');
            toast({ title: "Conversation not found", variant: "destructive" });
          }
        } catch (err) {
          console.error("Error loading messages:", err);
          toast({ 
            title: "Error Loading Conversation", 
            description: "Failed to load conversation messages. Please try again.", 
            variant: "destructive" 
          });
        }
      } else if (!user) {
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
    setRetryCount(0);
    setLastError(null);
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
    
    try {
      const filePrompt = `I've uploaded a document titled "${file.name}". Please analyze this document and provide insights.`;
      await sendMessage(filePrompt, false);
      
      toast({
        title: "Document Uploaded",
        description: `"${file.name}" has been uploaded and is being analyzed.`,
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Upload Failed",
        description: "There was a problem uploading your document. Please try again.",
        variant: "destructive"
      });
    }
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
      setActualConversationId(currentConvId);
      isFirstUserInteraction = true;
    }

    addUserMessage(trimmedMessage);
    
    setIsLoading(true);

    const sendMessageToAI = async (retryAttempt = 0): Promise<void> => {
      try {
        const apiMessages = formatMessagesForApi(trimmedMessage);

        const { data, error } = await supabase.functions.invoke('gemini-chat', {
          body: {
            query: trimmedMessage,
            messages: apiMessages,
            isVoiceInput: isVoiceInput,
            enableOnlineSearch: enableOnlineSearch,
            conversationId: currentConvId,
            requestId: Date.now().toString()
          }
        });

        if (error || !data?.content) {
          const errorMsg = error?.message || data?.error || 'Function returned empty response';
          if (errorMsg.includes('not allowed to use Publisher Model') || 
              errorMsg.includes('model not found') ||
              errorMsg.includes('FAILED_PRECONDITION')) {
            throw new Error(`Model configuration error: ${errorMsg}. Please check the Vertex AI model settings.`);
          } else {
            throw new Error(errorMsg);
          }
        }

        if (retryCount > 0) {
          setRetryCount(0);
          setLastError(null);
        }

        const responseMessage = addSystemMessage(
          data.content, 
          (data.source || 'gemini') as 'gemini' | 'system', 
          data.citation
        );

        await saveMessages(
          currentConvId as string, 
          user.id, 
          trimmedMessage, 
          {
            content: responseMessage.content,
            source: responseMessage.source as 'gemini' | 'system',
            citation: responseMessage.citation
          }
        );

        if (isAudioEnabled && data.audioContent) {
          playAudio(data.audioContent);
        } else if (isAudioEnabled && responseMessage.content) {
        }

        if (isFirstUserInteraction) {
          await updateConversationTitle(currentConvId as string, trimmedMessage);
          setHasInteracted(true);
        }
        
      } catch (error) {
        console.error('Error in sendMessage:', error);
        
        setLastError(error instanceof Error ? error.message : 'Request failed');
        
        if (retryAttempt < requestQueue.maxRetries) {
          const nextRetry = retryAttempt + 1;
          console.log(`Retrying message (${nextRetry}/${requestQueue.maxRetries})...`);
          
          const retryDelay = Math.min(1000 * Math.pow(2, retryAttempt), 10000);
          
          setRetryCount(prevCount => prevCount + 1);
          
          if (retryAttempt === 0) {
            toast({ 
              title: "Connection Issue", 
              description: "Retrying message...", 
              variant: "warning" 
            });
          }
          
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return sendMessageToAI(nextRetry);
        }
        
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

    requestQueue.add(() => sendMessageToAI());
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

  return {
    messages,
    isLoading,
    audioSrc,
    isAudioEnabled,
    isPlaying,
    enableOnlineSearch,
    hasInteracted,
    retryCount,
    lastError,
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
