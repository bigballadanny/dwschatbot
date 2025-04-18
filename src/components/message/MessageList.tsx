
import React, { useRef, useEffect, useState, useMemo } from 'react';
import MessageItem from '@/components/MessageItem';
import { MessageData } from '@/utils/messageUtils';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useThrottle } from '@/utils/performanceUtils';

interface MessageListProps {
  messages: MessageData[];
  className?: string;
  showNewestOnTop?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  className,
  showNewestOnTop = false 
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [previousMessageCount, setPreviousMessageCount] = useState(messages.length);
  
  // Memoize display messages to avoid unnecessary re-sorting on every render
  const displayMessages = useMemo(() => {
    return showNewestOnTop ? [...messages].reverse() : messages;
  }, [messages, showNewestOnTop]);
  
  // Effect to detect when messages are added
  useEffect(() => {
    // Only auto-scroll if new messages were added
    if (messages.length > previousMessageCount) {
      setHasScrolled(false);
    }
    setPreviousMessageCount(messages.length);
  }, [messages.length, previousMessageCount]);
  
  // Throttled scroll handler to improve performance
  const handleScroll = useThrottle((event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    // Check if element exists before accessing its properties
    if (element) {
      const isScrolledToBottom = 
        Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 50;
      
      setHasScrolled(!isScrolledToBottom);
    }
  }, 100);
  
  // Improved scroll to bottom when messages change
  useEffect(() => {
    if (!hasScrolled && messagesEndRef.current) {
      const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      };
      
      // Use a small timeout to ensure the DOM has updated
      const timer = setTimeout(scrollToBottom, 200);
      return () => clearTimeout(timer);
    }
  }, [messages, hasScrolled]);

  // Reset scroll state when messages change significantly (e.g., new conversation)
  useEffect(() => {
    if (messages.length <= 1) {
      setHasScrolled(false);
    }
  }, [messages.length]);
  
  return (
    <div 
      className={cn(
        'flex-1 relative h-full', 
        className
      )} 
      data-testid="message-list"
    >
      <div 
        ref={containerRef}
        className="absolute inset-0 overflow-y-auto px-4 py-8 scrollbar-thin"
        onScroll={handleScroll}
      >
        <div className="max-w-3xl mx-auto space-y-6">
          <AnimatePresence initial={false}>
            {displayMessages.map((message, index) => (
              <motion.div
                key={`${message.source}-${index}`}
                initial={{ 
                  opacity: 0, 
                  y: message.source === 'user' ? -20 : 20
                }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ 
                  duration: 0.3, 
                  delay: message.source === 'user' ? 0 : 0.2 
                }}
                data-testid={`message-item-${message.source}`}
              >
                <MessageItem
                  content={message.content}
                  source={message.source}
                  timestamp={message.timestamp}
                  citation={message.citation}
                  isLoading={message.isLoading}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
};

export default React.memo(MessageList);
