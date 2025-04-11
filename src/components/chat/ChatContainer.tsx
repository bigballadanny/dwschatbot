
import React from 'react';
import { MessageData } from '@/utils/messageUtils';
import MessageList from '../message/MessageList';
import ChatInputBar from './ChatInputBar';

interface ChatContainerProps {
  messages: MessageData[];
  isLoading: boolean;
  audioEnabled: boolean;
  currentAudioSrc: string | null;
  enableOnlineSearch: boolean;
  conversationId: string | null;
  user: any;
  onSendMessage: (message: string, isVoice: boolean) => Promise<void>;
  onToggleAudio: () => void;
  onToggleOnlineSearch: (enabled: boolean) => void;
  onFileUpload: (files: FileList) => void;
  onAudioStop: () => void;
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  isLoading,
  audioEnabled,
  currentAudioSrc,
  enableOnlineSearch,
  conversationId,
  user,
  onSendMessage,
  onToggleAudio,
  onToggleOnlineSearch,
  onFileUpload,
  onAudioStop,
}) => {
  return (
    <div className="flex-1 overflow-hidden flex flex-col relative">
      <MessageList messages={messages} />
      
      <ChatInputBar
        onSendMessage={onSendMessage}
        onToggleOnlineSearch={onToggleOnlineSearch}
        onFileUpload={onFileUpload}
        isLoading={isLoading}
        disabled={isLoading || (!user && !conversationId)}
        audioEnabled={audioEnabled}
        onToggleAudio={onToggleAudio}
        enableOnlineSearch={enableOnlineSearch}
        currentAudioSrc={currentAudioSrc}
        onAudioStop={onAudioStop}
        placeholder={user ? "Ask anything..." : "Please sign in to chat"}
      />
    </div>
  );
};

export default ChatContainer;
