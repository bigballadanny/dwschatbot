
import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import MessageItem from './MessageItem';
import { MessageData } from '@/utils/messageUtils';
import { cn } from "@/lib/utils";
import SearchModeToggle from './SearchModeToggle';
import { useSidebar } from "@/components/ui/sidebar";
import { AIInputWithSearch } from "@/components/ui/ai-input-with-search";
import { showInfo, showError } from "@/utils/toastUtils";

interface ChatInterfaceProps {
  className?: string;
  initialQuestion?: string | null;
  messages: MessageData[];
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
  const [uploading, setUploading] = useState(false);
  const [searchMode, setSearchMode] = useState(enableOnlineSearch);
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
      // Use a longer delay to ensure the component is fully mounted
      const timer = setTimeout(() => handleSubmitQuestion(initialQuestion), 1000);
      return () => clearTimeout(timer);
    }
  }, [initialQuestion]);
  
  useEffect(() => {
    setSearchMode(enableOnlineSearch);
  }, [enableOnlineSearch]);
  
  const handleSubmitQuestion = async (questionText: string) => {
    if (!questionText.trim() || isLoading) return;
    
    console.log("Submitting question:", questionText);
    setInput('');
    setIsLoading(true);
    
    try {
      await onSendMessage(questionText);
    } catch (error) {
      console.error('Error submitting question:', error);
      showError('Failed to send message', 'Please try again later.', error);
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
      showError("Unsupported File Type", "Please upload a PDF, Word, Excel, CSV, or text document.");
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      showError("File Too Large", "Please upload a file smaller than 10MB.");
      return;
    }
    
    setUploading(true);
    
    try {
      // Removed artificial delay: await new Promise(resolve => setTimeout(resolve, 1500));
      
      showInfo("Document Uploaded", `"${file.name}" has been uploaded and is being analyzed.`);
      
      const filePrompt = `I've uploaded a document titled "${file.name}". Please analyze this document and provide insights.`;
      await handleSubmitQuestion(filePrompt);
      
    } catch (error) {
      console.error('Error uploading document:', error);
      showError("Upload Failed", "There was a problem uploading your document. Please try again.");
    } finally {
      setUploading(false);
    }
  };
  
  useEffect(() => {
    // Scroll to bottom, but use 'auto' for less jarring effect on updates
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);
  
  return (
    <div className={cn("flex flex-col h-full relative", className)}>
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-28">
        <div className="mx-auto">
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
        "border-t fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm z-10 pb-6 pt-4",
        sidebarState === "expanded" ? "ml-[16rem]" : ""
      )}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <AIInputWithSearch
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onSend={handleSubmitQuestion}
              onFileUpload={handleFileUpload}
              disabled={isLoading}
              placeholder="Ask about deal structuring, financing, due diligence..."
              loading={isLoading}
              uploading={uploading}
              className="w-full"
              containerClassName="flex-1 max-w-xl"
              buttonClassName="shadow-md"
            />
            
            {onToggleOnlineSearch && (
              <SearchModeToggle 
                enableOnlineSearch={searchMode} 
                onToggle={handleToggleOnlineSearch}
                className="text-xs mt-2 sm:mt-0"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

ChatInterface.displayName = "ChatInterface";

export default ChatInterface;
