import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState, memo } from 'react';
import { MessageData } from '@/utils/messageUtils';
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { AIInputWithSearch } from "@/components/ui/ai-input-with-search";
import { showInfo, showError } from "@/utils/toastUtils";
import { useThrottle } from '@/utils/performanceUtils';
import MessageList from './message/MessageList';

interface ChatInterfaceProps {
  className?: string;
  initialQuestion?: string | null;
  messages: MessageData[];
  onSendMessage: (message: string) => Promise<void>;
  conversationId?: string | null;
  enableOnlineSearch?: boolean;
  onToggleOnlineSearch?: (enabled: boolean) => void;
}

interface ChatInterfaceRef {
  submitQuestion: (question: string) => void;
}

/**
 * Enhanced ChatInterface component with performance optimizations
 */
const ChatInterface = forwardRef<ChatInterfaceRef, ChatInterfaceProps>(({ 
  className, 
  initialQuestion, 
  messages, 
  onSendMessage, 
  conversationId,
  enableOnlineSearch = false,
  onToggleOnlineSearch
}, ref) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchMode, setSearchMode] = useState(enableOnlineSearch);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { state: sidebarState } = useSidebar();
  
  // Create a throttled scroll function to avoid excessive renders
  const throttledScrollToBottom = useThrottle(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, 150);
  
  // Expose function to parent component
  useImperativeHandle(ref, () => ({
    submitQuestion: (question: string) => {
      if (question.trim()) {
        handleSubmitQuestion(question);
      }
    }
  }));
  
  // Handle initial question if provided
  useEffect(() => {
    if (initialQuestion && initialQuestion.trim()) {
      // Use a delay to ensure the component is fully mounted
      const timer = setTimeout(() => handleSubmitQuestion(initialQuestion), 1000);
      return () => clearTimeout(timer);
    }
  }, [initialQuestion]); // Depend only on initialQuestion
  
  // Sync search mode with prop
  useEffect(() => {
    setSearchMode(enableOnlineSearch);
  }, [enableOnlineSearch]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    throttledScrollToBottom();
  }, [messages, throttledScrollToBottom]);
  
  // Handle submitting a question
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
  
  // Handle toggling online search
  const handleToggleOnlineSearch = (enabled: boolean) => {
    setSearchMode(enabled);
    if (onToggleOnlineSearch) {
      onToggleOnlineSearch(enabled);
    }
  };
  
  // Handle file upload
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
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      showError("Unsupported File Type", "Please upload a PDF, Word, Excel, CSV, image, or text document.");
      return;
    }
    
    if (file.size > 15 * 1024 * 1024) { // 15MB limit
      showError("File Too Large", "Please upload a file smaller than 15MB.");
      return;
    }
    
    setUploading(true);
    
    try {
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

  // Determine sidebar width offset class
  const sidebarOffsetClass = sidebarState === "expanded" ? "ml-[16rem]" : "";
  
  return (
    <div className={cn("flex flex-col h-full relative", className)}>
      {/* Message container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-28">
        <div className="mx-auto">
          <MessageList messages={messages} />
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Input area */}
      <div className={cn(
        "border-t fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm z-10 pb-6 pt-4",
        sidebarOffsetClass
      )}>
        <div className="max-w-4xl mx-auto px-4">
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
            containerClassName="flex-1 max-w-full"
            buttonClassName="shadow-md"
            acceptFileTypes=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.jpg,.jpeg,.png,.mp3,.mp4,.wav"
            allowMultipleFiles={false}
            enableOnlineSearch={searchMode}
            onToggleOnlineSearch={handleToggleOnlineSearch}
          />
        </div>
      </div>
    </div>
  );
});

ChatInterface.displayName = "ChatInterface";

export default memo(ChatInterface);