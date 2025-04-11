
import React, { useRef, useEffect } from 'react';
import MessageItem from '@/components/MessageItem';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MessageData } from '@/utils/messageUtils';

interface MessageListProps {
  messages: MessageData[];
  className?: string;
}

const MessageList: React.FC<MessageListProps> = ({ messages, className }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <ScrollArea className={cn("flex-1 px-4 py-6 pb-40", className)}>
      <div className="mx-auto max-w-3xl space-y-4">
        {messages.map((message, index) => (
          <MessageItem
            key={`message-${index}`}
            content={message.content}
            source={message.source}
            citation={message.citation}
            timestamp={message.timestamp}
            isLoading={message.isLoading}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};

export default MessageList;
