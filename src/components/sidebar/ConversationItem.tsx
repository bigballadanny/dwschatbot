
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
    <div className="group relative flex w-full items-center rounded-md p-2 text-sm hover:bg-accent transition-colors">
      <Link 
        to={`/?conversation=${id}`}
        className={cn(
          "flex w-full items-center rounded-md",
          isActive && "bg-accent"
        )}
      >
        <div className="flex items-center flex-1 min-w-0 mr-2">
          <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="truncate">
            {title || 'New Conversation'}
          </span>
        </div>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 flex-shrink-0 opacity-100 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={(e) => onDelete(id, e)}
        title="Delete conversation"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ConversationItem;
