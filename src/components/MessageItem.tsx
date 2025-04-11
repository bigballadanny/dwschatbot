
import React from 'react';
import { cn } from '@/lib/utils';
import MessageContent from './message/MessageContent';
import MessageControls from './message/MessageControls';
import MessageSourceLabel from './message/MessageSourceLabel';
import { MessageData, MessageSource } from '@/utils/messageUtils';

export interface MessageProps extends MessageData {
  className?: string;
}

const MessageItem: React.FC<MessageProps> = ({
  content,
  source,
  timestamp,
  citation,
  isLoading,
  className,
}) => {
  const isUser = source === 'user';

  return (
    <div
      className={cn(
        'flex flex-col space-y-2 mb-6',
        isUser ? 'items-end' : 'items-start',
        className
      )}
    >
      <div
        className={cn(
          'flex flex-col p-4 rounded-lg max-w-3xl',
          isUser
            ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-white'
            : 'bg-muted'
        )}
      >
        <MessageContent content={content} isLoading={isLoading} />
        <MessageSourceLabel source={source} timestamp={timestamp} />
        {!isUser && (
          <MessageControls 
            content={content} 
            citation={citation} 
            isLoading={isLoading} 
          />
        )}
      </div>
    </div>
  );
};

export default MessageItem;
