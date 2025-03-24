
import React from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MessageSquare, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export interface Conversation {
  id: string;
  title: string;
  preview: string;
  date: Date;
}

interface ConversationHistoryProps {
  conversations: Conversation[];
  onSelectConversation: (conversationId: string) => void;
  className?: string;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  conversations,
  onSelectConversation,
  className
}) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("relative", className)} aria-label="View conversation history">
          <MessageSquare className="h-5 w-5" />
          {conversations.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {conversations.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
        <div className="h-full flex flex-col">
          <div className="p-4 border-b glassmorphism">
            <h2 className="text-lg font-medium">Your Conversations</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto py-2">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No previous conversations
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    className="w-full text-left px-4 py-3 hover:bg-accent transition-colors"
                    onClick={() => onSelectConversation(conversation.id)}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-foreground text-sm">{conversation.title}</h3>
                      <span className="text-xs text-muted-foreground">
                        {conversation.date.toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                      {conversation.preview}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ConversationHistory;
