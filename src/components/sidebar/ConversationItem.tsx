
import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';

interface ConversationItemProps {
  id: string;
  title: string;
  isActive: boolean;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

const ConversationItem = ({ id, title, isActive, onDelete }: ConversationItemProps) => {
  return (
    <div className="group flex items-center w-full rounded-md p-2 text-sm hover:bg-accent transition-colors">
      <Link 
        to={`/?conversation=${id}`}
        className={cn(
          "flex flex-grow items-center min-w-0 max-w-[calc(100%-40px)]",
          isActive && "font-medium"
        )}
      >
        <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0" />
        <span className="truncate">
          {title || 'New Conversation'}
        </span>
      </Link>
      <div className="ml-auto">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 flex-shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={(e) => onDelete(id, e)}
          title="Delete conversation"
          aria-label="Delete conversation"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ConversationItem;
