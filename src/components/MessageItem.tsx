
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
      data-testid={`message-item-${isUser ? 'user' : 'system'}`}
    >
      <div
        className={cn(
          'flex flex-col rounded-2xl shadow-sm max-w-3xl',
          isUser 
            ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-white p-3 pr-5 rounded-br-sm' 
            : 'bg-white dark:bg-gray-800 dark:border dark:border-gray-700 p-4 rounded-bl-sm'
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
