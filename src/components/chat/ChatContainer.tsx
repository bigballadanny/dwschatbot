
import React, { useEffect } from 'react';
import { MessageData } from '@/utils/messageUtils';
import MessageList from '../message/MessageList';
import ChatInputBar from './ChatInputBar';

interface ChatContainerProps {
  messages: MessageData[];
  isLoading: boolean;
  audioEnabled: boolean;
  currentAudioSrc: string | null;
  isPlaying?: boolean;
  enableOnlineSearch: boolean;
  conversationId: string | null;
  user: any;
  onSendMessage: (message: string, isVoice: boolean) => Promise<void>;
  onToggleAudio: () => void;
  onToggleOnlineSearch: (enabled: boolean) => void;
  onFileUpload: (files: FileList) => void;
  onAudioStop: () => void;
  onTogglePlayback?: () => void;
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  isLoading,
  audioEnabled,
  currentAudioSrc,
  isPlaying,
  enableOnlineSearch,
  conversationId,
  user,
  onSendMessage,
  onToggleAudio,
  onToggleOnlineSearch,
  onFileUpload,
  onAudioStop,
  onTogglePlayback,
}) => {
  // Debugging logs to help track conversation state
  useEffect(() => {
    console.log("ChatContainer rendered with conversationId:", conversationId);
    console.log("Messages:", messages.length);
  }, [conversationId, messages.length]);

  return (
    <div className="flex flex-col relative h-full w-full bg-black">
      <div className="flex-1 overflow-hidden relative">
        <MessageList 
          messages={messages} 
          showNewestOnTop={false}
          className="h-full pb-20" // Add bottom padding to make space for the input bar
        />
      </div>
      
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
        className="sticky bottom-0 z-20"
      />
    </div>
  );
};

export default ChatContainer;
