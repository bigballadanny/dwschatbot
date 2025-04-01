
import React from 'react';
import { Loader2 } from 'lucide-react';

interface MessageContentProps {
  content: string;
  isLoading: boolean;
}

const MessageContent: React.FC<MessageContentProps> = ({ content, isLoading }) => {
  const formattedContent = React.useMemo(() => {
    let sanitizedText = content
      .replace(/<strong>/g, '**')
      .replace(/<\/strong>/g, '**')
      .replace(/<em>/g, '*')
      .replace(/<\/em>/g, '*');
    
    let formattedText = sanitizedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    formattedText = formattedText.replace(/^- (.*)/gm, '• $1');
    formattedText = formattedText.replace(/^• (.*)/gm, '• $1');
    
    formattedText = formattedText.replace(/^(\d+)\. (.*)/gm, '$1. $2');
    
    return formattedText.split('\n\n').map((paragraph, index) => {
      if (paragraph.includes('\n• ')) {
        const listItems = paragraph.split('\n• ');
        const title = listItems.shift();
        
        return (
          <div key={index} className={index > 0 ? 'mt-4' : ''}>
            {title && <p dangerouslySetInnerHTML={{ __html: title }} />}
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {listItems.map((item, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
          </div>
        );
      } 
      else if (/\n\d+\.\s/.test(paragraph)) {
        const listItems = paragraph.split(/\n(\d+\.\s)/);
        const title = listItems.shift();
        
        const numberItems = [];
        for (let i = 0; i < listItems.length; i += 2) {
          if (i + 1 < listItems.length) {
            numberItems.push(listItems[i] + listItems[i + 1]);
          }
        }
        
        return (
          <div key={index} className={index > 0 ? 'mt-4' : ''}>
            {title && <p dangerouslySetInnerHTML={{ __html: title }} />}
            <ol className="list-decimal pl-5 mt-2 space-y-1">
              {numberItems.map((item, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ol>
          </div>
        );
      } 
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

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <p className="text-sm">Generating response...</p>
      </div>
    );
  }

  return <div className="message-content prose prose-sm dark:prose-invert max-w-none">{formattedContent}</div>;
};

export default MessageContent;
