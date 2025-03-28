
import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu } from "@/components/ui/sidebar";
import ConversationItem from './ConversationItem';

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  searchQuery: string;
}

const ConversationList = ({ 
  conversations, 
  activeConversationId, 
  onDeleteConversation,
  searchQuery
}: ConversationListProps) => {
  const filteredConversations = conversations.filter(
    conversation => conversation.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ScrollArea className="h-full">
      <SidebarGroup>
        <SidebarGroupLabel>Conversations</SidebarGroupLabel>
        <SidebarMenu>
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </div>
          ) : (
            <div className="space-y-1 px-2">
              {filteredConversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  id={conversation.id}
                  title={conversation.title}
                  isActive={activeConversationId === conversation.id}
                  onDelete={onDeleteConversation}
                />
              ))}
            </div>
          )}
        </SidebarMenu>
      </SidebarGroup>
    </ScrollArea>
  );
};

export default ConversationList;
