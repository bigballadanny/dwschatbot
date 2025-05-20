import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import MessageContent from './message/MessageContent';
import MessageControls from './message/MessageControls';
import MessageSourceLabel from './message/MessageSourceLabel';
import { MessageData, MessageSource } from '@/utils/messageUtils';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface MessageItemProps {
  content: string;
  source: MessageSource;
  timestamp: Date;
  citation?: string[];
  isLoading?: boolean;
  // Add prop for feedback handler
  onFeedback?: (rating: 1 | -1) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  content,
  source,
  timestamp,
  citation,
  isLoading,
  onFeedback
}) => {
  const isUser = source === 'user';
  const isAi = source === 'gemini' || source === 'system';
  const [feedbackRating, setFeedbackRating] = useState<1 | -1 | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const handleFeedback = (rating: 1 | -1) => {
    if (feedbackSubmitted) return;
    
    setFeedbackRating(rating);
    setFeedbackSubmitted(true);
    
    if (onFeedback) {
      onFeedback(rating);
    }
  };

  return (
    <div
      className={cn(
        'flex gap-3',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 mt-1">
          <AvatarFallback className="bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div
        className={cn(
          'max-w-[80%] lg:max-w-[70%]',
          isUser ? 'order-1' : 'order-2'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-3 transition-all duration-300',
            isUser 
              ? 'bg-gradient-to-r from-dws-gold to-dws-gold-dark text-black shadow-lg' 
              : 'bg-gray-100 dark:bg-gray-800 border border-dws-gold/10 hover:border-dws-gold/30'
          )}
        >
          <MessageContent content={content} isLoading={isLoading} />
          
          {!isUser && (
            <div className="mt-2 flex items-center justify-between">
              <MessageSourceLabel source={source} timestamp={timestamp} />
              
              {!isLoading && (
                <div className="flex items-center gap-2">
                  <MessageControls
                    content={content}
                    citation={citation}
                    isLoading={isLoading}
                  />
                  
                  {isAi && onFeedback && (
                    <div className="flex items-center gap-1 border-l border-border pl-2 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-6 w-6',
                          feedbackRating === 1 ? 'text-green-600' : 'text-muted-foreground',
                          'hover:text-green-600',
                          feedbackSubmitted && 'cursor-not-allowed opacity-70'
                        )}
                        onClick={() => handleFeedback(1)}
                        disabled={feedbackSubmitted}
                        aria-label="Good response"
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-6 w-6',
                          feedbackRating === -1 ? 'text-red-600' : 'text-muted-foreground',
                          'hover:text-red-600',
                          feedbackSubmitted && 'cursor-not-allowed opacity-70'
                        )}
                        onClick={() => handleFeedback(-1)}
                        disabled={feedbackSubmitted}
                        aria-label="Bad response"
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {isUser && (
        <Avatar className="h-8 w-8 mt-1 order-2">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default MessageItem;