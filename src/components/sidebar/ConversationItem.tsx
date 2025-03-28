
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
    <div className="group flex items-center justify-between w-full rounded-md p-2 text-sm hover:bg-accent transition-colors">
      <Link 
        to={`/?conversation=${id}`}
        className={cn(
          "flex items-center flex-1 min-w-0",
          isActive && "font-medium"
        )}
      >
        <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0" />
        <span className="truncate">
          {title || 'New Conversation'}
        </span>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 flex-shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={(e) => onDelete(id, e)}
        title="Delete conversation"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ConversationItem;
