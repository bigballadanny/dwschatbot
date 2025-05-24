
import React from 'react';
import { cn } from '@/lib/utils';
import MessageContent from './message/MessageContent';
import MessageControls from './message/MessageControls';
import MessageSourceLabel from './message/MessageSourceLabel';
import { RagIndicator } from './chat/RagIndicator';
import { FollowUpQuestions } from './chat/FollowUpQuestions';
import { MessageData, MessageSource } from '@/utils/messageUtils';
import { logger } from '@/utils/logger';

export interface MessageProps extends MessageData {
  className?: string;
}

const MessageItem: React.FC<MessageProps> = ({
  content,
  source,
  timestamp,
  citation,
  isLoading,
  metadata,
  className,
}) => {
  const isUser = source === 'user';
  const isTranscriptSource = citation && citation.length > 0;

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
            : 'bg-zinc-800 px-4 py-3 rounded-2xl rounded-tl-sm',
          isTranscriptSource && !isUser && 'border-l-2 border-amber-500' // Visual indicator for transcript-sourced responses
        )}
      >
        {isTranscriptSource && !isUser && !isLoading && (
          <div className="text-xs text-amber-400 mb-2 font-medium">
            Transcript-sourced response
          </div>
        )}
        <MessageContent content={content} isLoading={isLoading} />
        {!isUser && !isLoading && (
          <>
            <MessageSourceLabel source={source} timestamp={timestamp} />
            <MessageControls 
              content={content} 
              citation={citation} 
              isLoading={isLoading} 
            />
            {metadata && (metadata.ragPercentage || metadata.sourcesUsed || metadata.processingTime) && (
              <div className="mt-3">
                <RagIndicator 
                  ragPercentage={metadata.ragPercentage}
                  sourcesUsed={metadata.sourcesUsed}
                  processingTime={metadata.processingTime}
                />
              </div>
            )}
            {metadata && metadata.followUpQuestions && metadata.followUpQuestions.length > 0 && (
              <div className="mt-3">
                <FollowUpQuestions 
                  questions={metadata.followUpQuestions}
                  onQuestionClick={(question) => {
                    // Add the question to the chat input
                    // This will be handled by the parent component or context
                    logger.debug('Follow-up question clicked:', question);
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MessageItem;
