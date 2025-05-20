import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import MessageItem from './MessageItem';
import { MessageData } from '@/utils/messageUtils';
import { cn } from "@/lib/utils";
import SearchModeToggle from './SearchModeToggle';
import { useSidebar } from "@/components/ui/sidebar";
import { EnhancedAIInput } from "@/components/ui/ai-input-enhanced";
import { toast } from "@/components/ui/use-toast";
import { debounce } from 'lodash-es';
import { Card } from '@/components/ui/card';

interface ChatInterfaceProps {
  className?: string;
  initialQuestion?: string | null;
  messages: MessageData[];
  onSendMessage: (message: string) => Promise<void>;
  conversationId?: string | null;
  enableOnlineSearch?: boolean;
  onToggleOnlineSearch?: (enabled: boolean) => void;
  onMessageFeedback?: (messageId: string, rating: 1 | -1) => void;
}

const ChatInterface = forwardRef<
  { submitQuestion: (question: string) => void }, 
  ChatInterfaceProps
>(({ 
  className, 
  initialQuestion, 
  messages, 
  onSendMessage, 
  conversationId,
  enableOnlineSearch = false,
  onToggleOnlineSearch,
  onMessageFeedback
}, ref) => {
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchMode, setSearchMode] = useState(enableOnlineSearch);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { state: sidebarState } = useSidebar();
  
  const handleFeedback = (messageId: string, rating: 1 | -1) => {
    if (onMessageFeedback) {
      onMessageFeedback(messageId, rating);
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const debouncedScrollToBottom = useCallback(
    debounce(() => {
      scrollToBottom();
    }, 100),
    [scrollToBottom]
  );

  useEffect(() => {
    debouncedScrollToBottom();
  }, [messages, debouncedScrollToBottom]);

  useEffect(() => {
    if (initialQuestion && typeof initialQuestion === 'string') {
      handleSubmit(initialQuestion);
    }
  }, [initialQuestion, handleSubmit]);

  useEffect(() => {
    setSearchMode(enableOnlineSearch);
  }, [enableOnlineSearch]);

  const handleSubmit = useCallback(async (message: string) => {
    if (!message.trim()) return;
    
    try {
      setIsLoading(true);
      setInput('');
      await onSendMessage(message);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [onSendMessage]);

  const toggleSearchMode = useCallback((enabled: boolean) => {
    setSearchMode(enabled);
    if (onToggleOnlineSearch) {
      onToggleOnlineSearch(enabled);
    }
  }, [onToggleOnlineSearch]);

  useImperativeHandle(ref, () => ({
    submitQuestion: handleSubmit,
  }), [handleSubmit]);

  const isLoadingMessage = messages.some(msg => msg.isLoading);

  return (
    <div 
      className={cn(
        "h-full flex flex-col relative bg-background", 
        className
      )}
    >
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-4xl mx-auto">
          <div className="py-8 px-4 sm:px-6 lg:px-8">
            {messages.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  Welcome to DWS Chatbot
                </h3>
                <p className="text-sm text-muted-foreground">
                  Ask me anything about deal making, acquisitions, or business strategies.
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <MessageItem
                    key={`${message.source}-${index}`}
                    content={message.content}
                    source={message.source}
                    timestamp={message.timestamp}
                    citation={message.citation}
                    isLoading={message.isLoading}
                    onFeedback={
                      message.source !== 'user' && !message.isLoading 
                        ? (rating) => handleFeedback(message.id, rating)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t bg-background/95 backdrop-blur-sm border-dws-gold/20">
        <div className="container max-w-4xl mx-auto p-4">
          {/* Search Mode Toggle */}
          {onToggleOnlineSearch && (
            <div className="mb-4 flex justify-end">
              <SearchModeToggle
                checked={searchMode}
                onCheckedChange={toggleSearchMode}
                disabled={isLoadingMessage}
              />
            </div>
          )}
          
          {/* AI Input */}
          <div className="relative">
            <EnhancedAIInput
              value={input}
              onValueChange={setInput}
              placeholder={searchMode 
                ? "Ask anything (web search enabled)..." 
                : "Ask anything..."
              }
              onSubmit={() => handleSubmit(input)}
              isLoading={isLoadingMessage || isLoading}
              disabled={isLoadingMessage || isLoading}
              onFilesChange={async (files) => {
                setUploading(true);
                try {
                  console.log('Files to upload:', files);
                  toast({
                    title: "File upload",
                    description: "File upload feature coming soon",
                  });
                } catch (error) {
                  console.error('Upload error:', error);
                  toast({
                    title: "Upload failed",
                    description: "Failed to upload files",
                    variant: "destructive",
                  });
                } finally {
                  setUploading(false);
                }
              }}
              uploadingFiles={uploading}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
});

ChatInterface.displayName = 'ChatInterface';

export default ChatInterface;