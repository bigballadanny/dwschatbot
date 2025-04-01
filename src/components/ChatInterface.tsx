
import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import MessageItem, { MessageProps } from './MessageItem';
import { cn } from "@/lib/utils";
import SearchModeToggle from './SearchModeToggle';
import { useSidebar } from "@/components/ui/sidebar";
import { AIInputWithSearch } from "@/components/ui/ai-input-with-search";
import { toast } from "@/components/ui/use-toast";
import { supabase } from '@/integrations/supabase/client';

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
  const [uploading, setUploading] = useState(false);
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
    
    setUploading(true);
    
    try {
      // Here we would normally upload the file to storage
      // For now, just simulate the upload
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Document Uploaded",
        description: `"${file.name}" has been uploaded and is being analyzed.`,
      });
      
      // This is where you would process the document and generate a message
      const filePrompt = `I've uploaded a document titled "${file.name}". Please analyze this document and provide insights based on it.`;
      await handleSubmitQuestion(filePrompt);
      
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Upload Failed",
        description: "There was a problem uploading your document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
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
            onFileUpload={handleFileUpload}
            disabled={isLoading}
            placeholder="Ask about deal structuring, financing, due diligence..."
            loading={isLoading}
            uploading={uploading}
            className="rounded-lg shadow-md"
            buttonClassName="shadow-md"
          />
        </div>
      </div>
    </div>
  );
});

ChatInterface.displayName = "ChatInterface";

export default ChatInterface;
