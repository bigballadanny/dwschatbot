import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState, memo } from 'react';
import { MessageData } from '@/utils/messageUtils';
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { AIInputWithSearch } from "@/components/ui/ai-input-with-search";
import { showInfo, showError } from "@/utils/toastUtils";
import { useThrottle } from '@/utils/performanceUtils';
import MessageList from './message/MessageList';
import { useIsMobile } from '@/hooks/ui/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logger } from '@/utils/logger';

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
 * Enhanced ChatInterface component with improved mobile responsiveness and user guidance
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
  const [showGuidance, setShowGuidance] = useState(messages.length === 0);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { state: sidebarState } = useSidebar();
  const isMobile = useIsMobile();
  
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
  
  // Show guidance when there are no messages
  useEffect(() => {
    setShowGuidance(messages.length === 0);
  }, [messages.length]);
  
  // Handle scroll detection to show scroll indicator
  useEffect(() => {
    const checkScroll = () => {
      if (!messagesContainerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      // Show indicator when user is not at the bottom and there's enough content to scroll
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
      const canScroll = scrollHeight > clientHeight + 100;
      
      setShowScrollIndicator(canScroll && !isAtBottom);
    };
    
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      // Check initial scroll position
      checkScroll();
    }
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', checkScroll);
      }
    };
  }, [messages]);
  
  // Handle submitting a question
  const handleSubmitQuestion = async (questionText: string) => {
    if (!questionText.trim() || isLoading) return;
    
    setInput('');
    setIsLoading(true);
    setShowGuidance(false); // Hide guidance when user sends a message
    
    try {
      await onSendMessage(questionText);
    } catch (error) {
      logger.error('Error submitting question:', error);
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
    setShowGuidance(false); // Hide guidance when user uploads a file
    
    try {
      showInfo("Document Uploaded", `"${file.name}" has been uploaded and is being analyzed.`);
      
      const filePrompt = `I've uploaded a document titled "${file.name}". Please analyze this document and provide insights.`;
      await handleSubmitQuestion(filePrompt);
      
    } catch (error) {
      logger.error('Error uploading document:', error);
      showError("Upload Failed", "There was a problem uploading your document. Please try again.");
    } finally {
      setUploading(false);
    }
  };
  
  // Handle scrolling to bottom
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Determine sidebar width offset class
  const sidebarOffsetClass = sidebarState === "expanded" ? "ml-[16rem]" : "";
  
  return (
    <div className={cn("flex flex-col h-full relative", className)}>
      {/* Message container */}
      <div 
        ref={messagesContainerRef}
        className={cn(
          "flex-1 overflow-y-auto pb-32",
          isMobile ? "px-2 py-4" : "px-4 py-6" // Smaller padding on mobile
        )}
      >
        <div className={cn(
          "mx-auto",
          isMobile ? "max-w-full" : "max-w-4xl"
        )}>
          {/* Welcome guidance for first-time users */}
          <AnimatePresence>
            {showGuidance && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="mb-8"
              >
                <Alert className="bg-amber-50/20 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800/50 mb-4">
                  <Info className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-sm">
                    Welcome to the M&A Mastermind AI Assistant! Ask me anything about deal structuring, 
                    acquisitions, financing, or business growth strategies.
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-4 mt-6">
                  <h3 className="font-semibold text-center mb-2">Try asking about:</h3>
                  <div className={cn(
                    "grid gap-3",
                    isMobile ? "grid-cols-1" : "grid-cols-2"
                  )}>
                    {[
                      "How can I structure a leveraged buyout?",
                      "What due diligence should I perform before acquiring a business?",
                      "What are the best financing options for small business acquisitions?",
                      "How do I value a business for acquisition?",
                      "What's the best way to negotiate with a business seller?",
                      "How can I find good acquisition targets?"
                    ].map((suggestion, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        className="justify-start h-auto py-3 text-left"
                        onClick={() => handleSubmitQuestion(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <MessageList messages={messages} />
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Scroll to bottom indicator */}
      <AnimatePresence>
        {showScrollIndicator && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={cn(
              "absolute bottom-28 left-1/2 transform -translate-x-1/2 z-20",
              isMobile ? "bottom-32" : "bottom-28" // Position higher on mobile
            )}
          >
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full py-1 px-3 shadow-md flex items-center gap-1 bg-background/80 backdrop-blur-sm"
              onClick={scrollToBottom}
            >
              <ChevronDownCircle className="h-4 w-4" />
              <span className="text-xs">New messages</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Input area */}
      <div className={cn(
        "border-t fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm z-10",
        isMobile ? "pb-8 pt-2" : "pb-6 pt-4", // More bottom padding on mobile for iOS
        sidebarOffsetClass
      )}>
        <div className={cn(
          "mx-auto px-4",
          isMobile ? "w-full" : "max-w-4xl" // Full width on mobile
        )}>
          <AIInputWithSearch
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onSend={handleSubmitQuestion}
            onFileUpload={handleFileUpload}
            disabled={isLoading}
            placeholder={isMobile ? "Ask anything..." : "Ask about deal structuring, financing, due diligence..."}
            loading={isLoading}
            uploading={uploading}
            className={cn(
              "w-full",
              isMobile ? "text-base" : "text-sm" // Larger text on mobile
            )}
            containerClassName="flex-1 max-w-full"
            buttonClassName="shadow-md"
            acceptFileTypes=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.jpg,.jpeg,.png,.mp3,.mp4,.wav"
            allowMultipleFiles={false}
            enableOnlineSearch={searchMode}
            onToggleOnlineSearch={handleToggleOnlineSearch}
            showVoiceInput={true} // Always show voice input option
          />
        </div>
      </div>
    </div>
  );
});

ChatInterface.displayName = "ChatInterface";

export default memo(ChatInterface);