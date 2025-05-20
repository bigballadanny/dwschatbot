import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Copy, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MessageControlsProps {
  content: string;
  citation?: string[];
  isLoading?: boolean;
}

const MessageControls: React.FC<MessageControlsProps> = ({ content, citation, isLoading }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return null;
  }

  return (
    <>
      <div className="mt-3 flex items-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCopy}
                className="px-2 h-8 text-xs"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span className="ml-1">{copied ? "Copied" : "Copy"}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{copied ? "Copied to clipboard!" : "Copy message to clipboard"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {citation && citation.length > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          <p className="italic">{citation.join(', ')}</p>
        </div>
      )}
    </>
  );
};

export default MessageControls;