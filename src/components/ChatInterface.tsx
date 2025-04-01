
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import MessageItem, { MessageProps } from './MessageItem';
import { cn } from "@/lib/utils";
import SearchModeToggle from './SearchModeToggle';
import { useSidebar } from "@/components/ui/sidebar";
import { AIInputWithSearch } from "@/components/ui/ai-input-with-search";

interface ChatInterfaceProps {
  className?: string;
  initialQuestion?: string | null;
  messages: MessageProps[];
  onSendMessage: (message: string) => Promise<void>;
  conversationId?: string | null;
  enableOnlineSearch?: boolean;
  onToggleOnlineSearch?: (enabled: boolean) => void;
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
  onToggleOnlineSearch
}, ref) => {
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchMode, setSearchMode] = React.useState(enableOnlineSearch);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { state: sidebarState } = useSidebar();
  
  useImperativeHandle(ref, () => ({
    submitQuestion: (question: string) => {
      if (question.trim()) {
        handleSubmitQuestion(question);
      }
    }
  }));
  
  useEffect(() => {
    if (initialQuestion && initialQuestion.trim()) {
      setTimeout(() => handleSubmitQuestion(initialQuestion), 800);
    }
  }, [initialQuestion]);
  
  useEffect(() => {
    setSearchMode(enableOnlineSearch);
  }, [enableOnlineSearch]);
  
  const handleSubmitQuestion = async (questionText: string) => {
    if (!questionText.trim() || isLoading) return;
    
    setInput('');
    setIsLoading(true);
    
    try {
      await onSendMessage(questionText);
    } catch (error) {
      console.error('Error submitting question:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleToggleOnlineSearch = (enabled: boolean) => {
    setSearchMode(enabled);
    if (onToggleOnlineSearch) {
      onToggleOnlineSearch(enabled);
    }
  };
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  return (
    <div className={cn("flex flex-col h-full relative", className)}>
      <div className="flex items-center justify-end p-4 border-b">
        <SearchModeToggle 
          enableOnlineSearch={searchMode}
          onToggle={handleToggleOnlineSearch}
        />
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-28">
        <div className="max-w-4xl mx-auto">
          {messages.map((message, index) => (
            <MessageItem
              key={index}
              content={message.content}
              source={message.source}
              citation={message.citation}
              timestamp={message.timestamp}
              isLoading={message.isLoading}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <div className={cn(
        "border-t fixed bottom-0 bg-background/80 backdrop-blur-sm z-10 pb-6 pt-4 px-4 w-full",
        sidebarState === "expanded" ? "left-[16rem] right-0" : "left-0 right-0"
      )}>
        <div className="max-w-3xl mx-auto">
          <AIInputWithSearch
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onSend={handleSubmitQuestion}
            disabled={isLoading}
            placeholder="Ask about deal structuring, financing, due diligence..."
            loading={isLoading}
            className="rounded-full"
            buttonClassName="rounded-full"
          />
        </div>
      </div>
    </div>
  );
});

ChatInterface.displayName = "ChatInterface";

export default ChatInterface;
