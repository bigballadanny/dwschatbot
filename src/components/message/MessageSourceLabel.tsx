
import React from 'react';
import { cn } from "@/lib/utils";

export type MessageSource = 'user' | 'system' | 'transcript' | 'gemini' | 'error' | 'web' | 'fallback';

interface MessageSourceLabelProps {
  source: MessageSource;
  timestamp: Date;
}

const MessageSourceLabel: React.FC<MessageSourceLabelProps> = ({ source, timestamp }) => {
  const isUser = source === 'user';
  const timeString = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(timestamp);

  return (
    <div className="flex justify-between items-center mt-2">
      {!isUser && (
        <div className="text-xs font-semibold uppercase tracking-wide">
          {source === 'transcript' ? (
            <span className="text-blue-500 dark:text-blue-300">Transcript Source</span>
          ) : source === 'web' ? (
            <span className="text-emerald-500 dark:text-emerald-300">Web Source</span>
          ) : source === 'fallback' ? (
            <span className="text-amber-600 dark:text-amber-300">Quota Limited Response</span>
          ) : source === 'system' ? (
            <span className="text-gray-500 dark:text-gray-400">System</span>
          ) : source === 'gemini' ? (
            <span className="text-green-500 dark:text-green-300">Gemini</span>
          ) : null}
        </div>
      )}
      <div className={cn(
        "text-xs opacity-60 ml-auto",
        isUser ? "text-primary-foreground" : "text-foreground"
      )}>
        {timeString}
      </div>
    </div>
  );
};

export default MessageSourceLabel;
