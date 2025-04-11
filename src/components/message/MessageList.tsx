
import React, { useRef, useEffect } from 'react';
import MessageItem from '@/components/MessageItem';
import { MessageData } from '@/utils/messageUtils';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface MessageListProps {
  messages: MessageData[];
  className?: string;
}

const MessageList: React.FC<MessageListProps> = ({ messages, className }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  return (
    <div className={cn('flex-1 overflow-y-auto px-4 py-8 pb-32', className)}>
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
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
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;
