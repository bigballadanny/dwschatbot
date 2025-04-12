import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { format, isToday } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ConversationItemProps {
  id: string;
  title: string;
  isActive: boolean;
  timestamp?: Date;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

const ConversationItem = ({ id, title, isActive, timestamp, onDelete }: ConversationItemProps) => {
  // Keep formatting the timestamp in the code for analytics/debugging purposes
  // but not display it in the UI
  const formattedTime = timestamp ? (
    isToday(timestamp) 
      ? format(timestamp, 'h:mm a') 
      : format(timestamp, 'MMM d')
  ) : '';

  // Truncate long titles
  const displayTitle = title.length > 25 ? `${title.substring(0, 25)}...` : title;

  return (
    <div className="group/item flex items-center justify-between gap-2 w-full rounded-md p-2 text-sm hover:bg-accent transition-colors">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link 
              to={`/?conversation=${id}`}
              className={cn(
                "flex-1 flex items-center min-w-0 overflow-hidden",
                isActive && "font-medium"
              )}
            >
              <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate max-w-[220px]">
                {displayTitle || 'New Conversation'}
              </span>
            </Link>
          </TooltipTrigger>
          {title.length > 25 && (
            <TooltipContent side="right">
              <p className="max-w-[300px] break-words">{title}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 p-0 flex-shrink-0 opacity-0 group-hover/item:opacity-100 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={(e) => onDelete(id, e)}
        title="Delete conversation"
        aria-label="Delete conversation"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export default ConversationItem;
