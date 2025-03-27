
import React from 'react';
import { cn } from "@/lib/utils";

export type MessageSource = 'transcript' | 'web' | 'system' | 'user' | 'gemini' | 'fallback';

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
  
  const formattedContent = React.useMemo(() => {
    // Handle asterisks for bold formatting (convert *text* to <strong>text</strong>)
    let formattedText = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    
    // Handle bullet points
    formattedText = formattedText.replace(/^- (.*)/gm, '• $1');
    
    // Handle numbered lists
    formattedText = formattedText.replace(/^(\d+)\. (.*)/gm, '$1. $2');
    
    // Split by paragraph breaks and create JSX elements
    return formattedText.split('\n\n').map((paragraph, index) => {
      // Check if paragraph is a bullet list
      if (paragraph.includes('\n• ')) {
        const listItems = paragraph.split('\n• ');
        const title = listItems.shift(); // Get the first line as title
        
        return (
          <div key={index} className={index > 0 ? 'mt-4' : ''}>
            {title && <p>{title}</p>}
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {listItems.map((item, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
          </div>
        );
      } 
      // Check if paragraph is a numbered list
      else if (/\n\d+\.\s/.test(paragraph)) {
        const listItems = paragraph.split(/\n(\d+\.\s)/);
        const title = listItems.shift(); // Get the first line as title
        
        const numberItems = [];
        for (let i = 0; i < listItems.length; i += 2) {
          if (i + 1 < listItems.length) {
            numberItems.push(listItems[i] + listItems[i + 1]);
          }
        }
        
        return (
          <div key={index} className={index > 0 ? 'mt-4' : ''}>
            {title && <p>{title}</p>}
            <ol className="list-decimal pl-5 mt-2 space-y-1">
              {numberItems.map((item, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ol>
          </div>
        );
      } 
      // Regular paragraph
      else {
        return (
          <p 
            key={index} 
            className={index > 0 ? 'mt-3' : ''} 
            dangerouslySetInnerHTML={{ __html: paragraph }}
          />
        );
      }
    });
  }, [content]);
  
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
            : "glassmorphism rounded-tl-none",
        isLoading && "animate-pulse-subtle"
      )}>
        <div className="message-content prose prose-sm dark:prose-invert max-w-none">
          {formattedContent}
        </div>
        
        {citation && (
          <div className="mt-3 pt-2 border-t border-foreground/10 text-sm font-light opacity-80">
            {citation}
          </div>
        )}
        
        <div className="flex justify-between items-center mt-2">
          {!isUser && source !== 'system' && (
            <div className="text-xs font-semibold uppercase tracking-wide">
              {source === 'transcript' ? (
                <span className="text-blue-500 dark:text-blue-300">Transcript Source</span>
              ) : source === 'web' ? (
                <span className="text-emerald-500 dark:text-emerald-300">Web Source</span>
              ) : source === 'gemini' ? (
                <span className="text-purple-500 dark:text-purple-300">Gemini AI</span>
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
      </div>
    </div>
  );
};

export default MessageItem;
