
import React from 'react';
import { cn } from "@/lib/utils";
import MessageContent from './message/MessageContent';
import MessageControls from './message/MessageControls';
import MessageSourceLabel from './message/MessageSourceLabel';

export type MessageSource = 'transcript' | 'web' | 'system' | 'user' | 'fallback' | 'gemini';

export interface MessageProps {
  content: string;
  source: MessageSource;
  citation?: string;
  timestamp: Date;
  isLoading?: boolean;
  className?: string;
}

const MessageItem: React.FC<MessageProps> = ({
  content,
  source,
  citation,
  timestamp,
  isLoading = false,
  className
}) => {
  const isUser = source === 'user';
  const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return (
    <div className={cn(
      "flex w-full mb-6 animate-fade-in",
      isUser ? "justify-end" : "justify-start",
      className
    )}>
      <div className={cn(
        "max-w-[80%] sm:max-w-[70%] py-3 px-4 rounded-xl shadow-sm",
        "flex flex-col",
        isUser 
          ? "bg-primary text-primary-foreground rounded-tr-none"
          : source === 'system'
            ? "bg-secondary text-secondary-foreground"
            : source === 'fallback'
              ? "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-200 dark:border-amber-800"
              : "glassmorphism rounded-tl-none",
        isLoading && "animate-pulse-subtle"
      )}>
        <MessageContent content={content} isLoading={isLoading} />
        
        {citation && (
          <div className="mt-3 pt-2 border-t border-foreground/10 text-sm font-light opacity-80">
            {citation}
          </div>
        )}
        
        <MessageControls content={content} isUser={isUser} isLoading={isLoading} />
        
        <MessageSourceLabel source={source} isUser={isUser} timeString={timeString} />
      </div>
    </div>
  );
};

export default MessageItem;
