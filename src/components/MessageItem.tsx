
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
          'flex flex-col max-w-3xl',
          isUser 
            ? 'bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm' 
            : 'bg-zinc-800 px-4 py-3 rounded-2xl rounded-tl-sm'
        )}
      >
        <MessageContent content={content} isLoading={isLoading} />
        {!isUser && !isLoading && (
          <>
            <MessageSourceLabel source={source} timestamp={timestamp} />
            <MessageControls 
              content={content} 
              citation={citation} 
              isLoading={isLoading} 
            />
          </>
        )}
      </div>
    </div>
  );
};

export default MessageItem;
