
import React from 'react';
import { MessageData } from '@/utils/messageUtils';
import MessageList from '../message/MessageList';
import ChatInputBar, { ContextChatInputBar } from './ChatInputBar';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/contexts/ChatContext';
import { useAudio } from '@/contexts/AudioContext';

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

/**
 * ChatContainer component that can work with both Context and props
 * This provides backward compatibility while we transition to the Context API
 */
const ChatContainer: React.FC<ChatContainerProps> = ({
  // Default props for compatibility
  messages: propMessages,
  isLoading: propIsLoading,
  audioEnabled: propAudioEnabled,
  currentAudioSrc: propAudioSrc,
  isPlaying: propIsPlaying,
  enableOnlineSearch: propEnableOnlineSearch,
  conversationId: propConversationId,
  user: propUser,
  onSendMessage: propSendMessage,
  onToggleAudio: propToggleAudio,
  onToggleOnlineSearch: propToggleOnlineSearch,
  onFileUpload: propHandleFileUpload,
  onAudioStop: propStopAudio,
  onTogglePlayback: propTogglePlayback,
}) => {
  // Get chat context values
  const {
    messages: contextMessages,
    isLoading: contextIsLoading,
    enableOnlineSearch: contextEnableOnlineSearch,
    conversationId: contextConversationId,
    sendMessage: contextSendMessage,
    toggleOnlineSearch: contextToggleOnlineSearch,
    handleFileUpload: contextHandleFileUpload,
  } = useChat();
  
  // Get audio context values
  const {
    audioSrc: contextAudioSrc,
    isPlaying: contextIsPlaying,
    enabled: contextAudioEnabled,
    toggleEnabled: contextToggleAudio,
    togglePlayback: contextTogglePlayback,
    stopAudio: contextStopAudio,
  } = useAudio();
  
  // Use context values if available, otherwise use props
  const messages = propMessages || contextMessages;
  const isLoading = propIsLoading !== undefined ? propIsLoading : contextIsLoading;
  const audioEnabled = propAudioEnabled !== undefined ? propAudioEnabled : contextAudioEnabled;
  const audioSrc = propAudioSrc || contextAudioSrc;
  const isPlaying = propIsPlaying !== undefined ? propIsPlaying : contextIsPlaying;
  const enableOnlineSearch = propEnableOnlineSearch !== undefined ? propEnableOnlineSearch : contextEnableOnlineSearch;
  const conversationId = propConversationId || contextConversationId;
  const user = propUser;
  
  const sendMessage = propSendMessage || contextSendMessage;
  const toggleAudio = propToggleAudio || contextToggleAudio;
  const toggleOnlineSearch = propToggleOnlineSearch || contextToggleOnlineSearch;
  const handleFileUpload = propHandleFileUpload || contextHandleFileUpload;
  const stopAudio = propStopAudio || contextStopAudio;
  const togglePlayback = propTogglePlayback || contextTogglePlayback;
  
  // Handle retrying the last message
  const handleRetry = () => {
    const lastUserMessage = [...messages].reverse().find(m => m.source === 'user');
    if (lastUserMessage?.content) {
      sendMessage(lastUserMessage.content, false);
    }
  };

  // Determine if we should use props or context
  const useContextInputBar = 
    !propSendMessage && 
    !propToggleOnlineSearch && 
    !propHandleFileUpload;
  
  return (
    <div className="flex flex-col relative h-full w-full bg-black">
      <div className="flex-1 overflow-hidden relative">
        <MessageList 
          messages={messages} 
          showNewestOnTop={false}
          className="h-full pb-20" // Add bottom padding to make space for the input bar
        />
      </div>
      
      {useContextInputBar ? (
        <ContextChatInputBar className="sticky bottom-0 z-20" />
      ) : (
        <ChatInputBar
          onSendMessage={sendMessage}
          onToggleOnlineSearch={toggleOnlineSearch}
          onFileUpload={handleFileUpload}
          isLoading={isLoading}
          disabled={isLoading || (!user && !conversationId)}
          audioEnabled={audioEnabled}
          onToggleAudio={toggleAudio}
          enableOnlineSearch={enableOnlineSearch}
          currentAudioSrc={audioSrc}
          onAudioStop={stopAudio}
          isPlaying={isPlaying}
          onTogglePlayback={togglePlayback}
          placeholder={user ? "Ask anything..." : "Please sign in to chat"}
          className="sticky bottom-0 z-20"
        />
      )}
    </div>
  );
};

/**
 * A simplified ChatContainer that only uses context
 * This allows components to simply use <ContextChatContainer /> without passing any props
 */
export const ContextChatContainer: React.FC = () => {
  const {
    messages,
    isLoading,
    enableOnlineSearch,
    conversationId,
    sendMessage,
    toggleOnlineSearch,
    handleFileUpload
  } = useChat();
  
  const {
    audioSrc,
    isPlaying,
    enabled: audioEnabled,
    toggleEnabled: toggleAudio,
    togglePlayback,
    stopAudio
  } = useAudio();
  
  // Get the user from auth context
  // Note: In a real implementation, you would import and use the useAuth hook
  // For this example, we're assuming user from the chat context
  const user = useChat().user;
  
  return (
    <ChatContainer
      messages={messages}
      isLoading={isLoading}
      audioEnabled={audioEnabled}
      currentAudioSrc={audioSrc}
      isPlaying={isPlaying}
      enableOnlineSearch={enableOnlineSearch}
      conversationId={conversationId}
      user={user}
      onSendMessage={sendMessage}
      onToggleAudio={toggleAudio}
      onToggleOnlineSearch={toggleOnlineSearch}
      onFileUpload={handleFileUpload}
      onAudioStop={stopAudio}
      onTogglePlayback={togglePlayback}
    />
  );
};

export default ChatContainer;
