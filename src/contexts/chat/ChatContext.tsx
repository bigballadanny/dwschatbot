import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMessages } from '@/hooks/chat/useMessages';
import { useMessageCreation } from '@/hooks/chat/useMessageCreation';
import { useMessageApi } from '@/hooks/chat/useMessageApi';
import { useSearchConfig } from '@/hooks/ui/useSearchConfig';
import { MessageData } from '@/utils/messageUtils';
import { useToast } from '@/components/ui/use-toast';
import { useAudio } from '@/contexts/audio';
import offlineQueue from '@/utils/offlineQueue';
import { logger } from '@/utils/logger';

// Define context type
interface ChatContextType {
  // State
  messages: MessageData[];
  isLoading: boolean;
  hasInteracted: boolean;
  enableOnlineSearch: boolean;
  conversationId: string | null;
  
  // Actions
  sendMessage: (message: string, isVoiceInput?: boolean) => Promise<void>;
  resetChat: () => void;
  toggleOnlineSearch: (enabled: boolean) => void;
  createNewConversation: (title: string) => Promise<string | null>;
  handleFileUpload: (files: FileList) => Promise<void>;
  clearMessageQueue: () => void;
}

// Create context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Props for provider
interface ChatProviderProps {
  children: ReactNode;
  user: any;
  initialConversationId?: string | null;
}

// Request queue for handling multiple chat requests
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
        logger.error('Request error:', error);
      }
      
      setTimeout(() => this.processQueue(), 100);
    } else {
      this.isProcessing = false;
    }
  }
};

/**
 * Provider component for chat functionality
 */
export const ChatProvider: React.FC<ChatProviderProps> = ({ 
  children, 
  user, 
  initialConversationId = null 
}) => {
  // Register send function with offline queue when component mounts
  useEffect(() => {
    if (user) {
      offlineQueue.registerSendFunction(sendMessage);
    }
  }, []);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [retryCount, setRetryCount] = useState<number>(0);
  
  // Get audio functionality from context
  const { playAudioContent, clearAudio } = useAudio();
  
  // Initialize message handling
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
    formatMessagesForApi,
    setMessages
  } = useMessages({ 
    userId: user?.id, 
    conversationId 
  });
  
  // Initialize search configuration
  const {
    enableOnlineSearch,
    toggleOnlineSearch
  } = useSearchConfig();
  
  // Reset chat state
  const resetChat = useCallback(() => {
    resetMessages();
    clearAudio();
    setRetryCount(0);
  }, [resetMessages, clearAudio]);
  
  // Clear message queue and any stuck states
  const clearMessageQueue = useCallback(() => {
    // Clear the request queue
    requestQueue.queue = [];
    requestQueue.isProcessing = false;
    
    // Clear any stuck loading states
    setIsLoading(false);
    setRetryCount(0);
    
    logger.info('ChatContext', 'Message queue cleared');
  }, [setIsLoading, setRetryCount]);
  
  // Create a new conversation
  const createNewConversation = useCallback(async (title: string): Promise<string | null> => {
    if (!user) {
      toast({ title: "Authentication Required", description: "Please sign in.", variant: "default" });
      return null;
    }
    
    try {
      const { data, error } = await supabase.from('conversations').insert([{
        title,
        user_id: user.id
      }]).select();
      
      if (error) throw error;
      
      if (data?.[0]?.id) {
        const newConversationId = data[0].id;
        setConversationId(newConversationId);
        return newConversationId;
      }
      
      return null;
    } catch (error) {
      logger.error('ChatContext', 'Error creating conversation', error);
      toast({
        title: 'Error',
        description: 'Failed to create a new conversation.',
        variant: 'destructive'
      });
      
      return null;
    }
  }, [user, toast]);
  
  // Update conversation title
  const updateConversationTitle = useCallback(async (convId: string, title: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('conversations')
        .update({ title })
        .eq('id', convId)
        .eq('user_id', user.id);
    } catch (error) {
      logger.error('ChatContext', 'Error updating conversation title', error);
    }
  }, [user]);
  
  // Save messages to the database
  const saveMessages = useCallback(async (
    convId: string,
    userId: string,
    userMessage: string,
    aiResponse: { content: string; source: 'gemini' | 'system'; citation?: string[]; metadata?: any }
  ) => {
    try {
      // Create user message
      const { error: userMsgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          user_id: userId,
          content: userMessage,
          is_user: true, // Keep for backward compatibility
          role: 'user',
        });
        
      if (userMsgError) throw userMsgError;
      
      // Create AI message
      const { error: aiMsgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          user_id: userId,
          content: aiResponse.content,
          is_user: false, // Keep for backward compatibility
          role: 'assistant',
          source: aiResponse.source,
          citation: aiResponse.citation,
          metadata: aiResponse.metadata,
        });
        
      if (aiMsgError) throw aiMsgError;
    } catch (error) {
      logger.error('ChatContext', 'Error saving messages', error);
      // Don't throw - just log the error to prevent retry loop
      toast({
        title: 'Warning',
        description: 'Message saved locally but not synced to server',
        variant: 'warning'
      });
    }
  }, [toast]);
  
  // Send a message to the AI
  const sendMessage = useCallback(async (message: string, isVoiceInput: boolean = false): Promise<void> => {
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
      setConversationId(currentConvId);
      isFirstUserInteraction = true;
    }

    addUserMessage(trimmedMessage);
    
    // Add message to offline queue for automatic retries if needed
    if (!navigator.onLine) {
      toast({ 
        title: "You're offline", 
        description: "Your message has been queued and will be sent when you're back online.",
        variant: "warning"
      });
      
      offlineQueue.enqueue(
        trimmedMessage,
        currentConvId,
        user.id,
        { isVoiceInput, enableOnlineSearch }
      );
      
      // Don't proceed with sending while offline
      return;
    }
    
    setIsLoading(true);
    
    // Add a placeholder assistant message immediately
    const placeholderMessageId = crypto.randomUUID();
    addSystemMessage('Thinking...', 'system', undefined, undefined, placeholderMessageId);

    const sendMessageToAI = async (retryAttempt = 0): Promise<void> => {
      try {
        // Update placeholder message for retries
        if (retryAttempt > 0) {
          // Update the existing placeholder message instead of adding a new one
          setMessages(prev => prev.map(msg => 
            msg.id === placeholderMessageId 
              ? { ...msg, content: `Retrying... (${retryAttempt}/${requestQueue.maxRetries})` }
              : msg
          ));
        }
        
        const apiMessages = formatMessagesForApi(trimmedMessage);

        const { data, error } = await supabase.functions.invoke('ai-chat', {
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
          throw new Error(errorMsg);
        }

        // Save messages to database first (this can fail and trigger retry)
        await saveMessages(
          currentConvId as string, 
          user.id, 
          trimmedMessage, 
          {
            content: data.content,
            source: (data.source || 'gemini') as 'gemini' | 'system',
            citation: data.citation,
            metadata: data.metadata
          }
        );

        // Update the placeholder message with the actual response
        setMessages(prev => prev.map(msg => 
          msg.id === placeholderMessageId 
            ? {
                ...msg,
                content: data.content,
                source: (data.source || 'gemini') as 'gemini' | 'system',
                citation: data.citation,
                metadata: data.metadata,
                isLoading: false
              }
            : msg
        ));

        // Reset retry count on success
        if (retryCount > 0) {
          setRetryCount(0);
        }

        // Handle audio content if present
        if (data.audioContent) {
          playAudioContent(data.audioContent);
        }

        // Update conversation title for first interaction
        if (isFirstUserInteraction) {
          await updateConversationTitle(currentConvId as string, trimmedMessage);
          setHasInteracted(true);
        }
        
      } catch (error) {
        logger.error('ChatContext', 'Error in sendMessage', error);
        
        if (retryAttempt < requestQueue.maxRetries) {
          const nextRetry = retryAttempt + 1;
          logger.info('ChatContext', `Retrying message (${nextRetry}/${requestQueue.maxRetries})`);
          
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
        
        // Final failure - update the placeholder message to show error
        setMessages(prev => prev.map(msg => 
          msg.id === placeholderMessageId 
            ? {
                ...msg,
                content: 'Sorry, I encountered an error. Please try again.',
                source: 'system' as const,
                isLoading: false,
                isError: true
              }
            : msg
        ));
        
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
  }, [
    user, isLoading, conversationId, hasInteracted, enableOnlineSearch, 
    clearAudio, createNewConversation, addUserMessage, formatMessagesForApi, retryCount,
    addSystemMessage, addErrorMessage, saveMessages, playAudioContent, updateConversationTitle,
    setHasInteracted, setIsLoading, setRetryCount, toast, setMessages
  ]);
  
  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!files || files.length === 0) return;
    
    try {
      // Import dynamically to avoid circular dependencies
      const { processFileForUpload } = await import('@/utils/fileUtils');
      
      // Process the file (validate and compress if needed)
      const file = files[0];
      const { file: processedFile, validation } = await processFileForUpload(file);
      
      // Check validation result
      if (!validation.isValid) {
        toast({
          title: "File Upload Error",
          description: validation.errorMessage || "File validation failed.",
          variant: "destructive"
        });
        return;
      }
      
      // Show toast if file was compressed
      if (processedFile.size < file.size && processedFile.size !== file.size) {
        toast({
          title: "Image Optimized",
          description: `Image compressed from ${(file.size / (1024 * 1024)).toFixed(2)}MB to ${(processedFile.size / (1024 * 1024)).toFixed(2)}MB.`,
          variant: "default"
        });
      }
    
      // Generate an appropriate prompt based on file type
      let filePrompt = '';
      
      if (validation.fileType === 'image') {
        filePrompt = `I've uploaded an image titled "${processedFile.name}". Please analyze this image and provide insights.`;
      } else if (validation.fileType === 'document') {
        filePrompt = `I've uploaded a document titled "${processedFile.name}". Please analyze this document and provide insights.`;
      } else if (validation.fileType === 'audio') {
        filePrompt = `I've uploaded an audio file titled "${processedFile.name}". Please analyze this audio file.`;
      } else if (validation.fileType === 'video') {
        filePrompt = `I've uploaded a video file titled "${processedFile.name}". Please analyze this video file.`;
      } else {
        filePrompt = `I've uploaded a file titled "${processedFile.name}". Please analyze this file and provide insights.`;
      }
      
      await sendMessage(filePrompt, false);
      
      toast({
        title: "File Uploaded",
        description: `"${processedFile.name}" has been uploaded and is being analyzed.`,
      });
    } catch (error) {
      logger.error('Error processing file upload:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "There was a problem processing your file. Please try again.",
        variant: "destructive"
      });
    }
  }, [sendMessage, toast]);
  
  // Create context value
  const contextValue: ChatContextType = {
    // State
    messages,
    isLoading,
    hasInteracted,
    enableOnlineSearch,
    conversationId,
    
    // Actions
    sendMessage,
    resetChat,
    toggleOnlineSearch,
    createNewConversation,
    handleFileUpload,
    clearMessageQueue
  };
  
  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

/**
 * Hook to use chat context
 */
export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  
  return context;
};