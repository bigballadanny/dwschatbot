
import React from 'react';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageContentProps {
  content: string;
  isLoading: boolean;
}

// Define an interface for the code component props that includes the inline property
interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const MessageContent: React.FC<MessageContentProps> = ({ content, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <p className="text-sm">Generating response...</p>
      </div>
    );
  }

  return (
    <div className="message-content prose prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-3 mb-2" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-md font-bold mt-2 mb-1" {...props} />,
          p: ({ node, ...props }) => <p className="mb-2" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2" {...props} />,
          li: ({ node, ...props }) => <li className="mb-1" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
          em: ({ node, ...props }) => <em className="italic" {...props} />,
          // Use the CodeProps interface to type the code component props
          code: ({ node, inline, ...props }: CodeProps) => 
            inline 
              ? <code className="bg-zinc-700 px-1 rounded text-sm" {...props} />
              : <code className="block bg-zinc-800 p-3 rounded-md text-sm whitespace-pre-wrap my-2" {...props} />
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MessageContent;
