
import React, { useRef, useEffect } from 'react';
import MessageItem from '@/components/MessageItem';
import { MessageData } from '@/utils/messageUtils';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface MessageListProps {
  messages: MessageData[];
  className?: string;
}

const MessageList: React.FC<MessageListProps> = ({ messages, className }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  return (
    <div className={cn('flex-1 overflow-y-auto px-4 py-8 pb-32', className)} data-testid="message-list">
      <div className="max-w-3xl mx-auto space-y-6">
        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
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
  );
};

export default MessageList;
