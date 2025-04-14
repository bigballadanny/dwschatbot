
import React from 'react';
import { MessageData } from '@/utils/messageUtils';
import MessageList from '../message/MessageList';
import ChatInputBar from './ChatInputBar';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatContainerProps {
  messages: MessageData[];
  isLoading: boolean;
  audioEnabled: boolean;
  currentAudioSrc: string | null;
  isPlaying?: boolean;
  enableOnlineSearch: boolean;
  conversationId: string | null;
  user: any;
  retryCount?: number;
  lastError?: string | null;
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
  retryCount = 0,
  lastError = null,
  onSendMessage,
  onToggleAudio,
  onToggleOnlineSearch,
  onFileUpload,
  onAudioStop,
  onTogglePlayback,
}) => {
  // Handle retrying the last message
  const handleRetry = () => {
    const lastUserMessage = [...messages].reverse().find(m => m.source === 'user');
    if (lastUserMessage?.content) {
      onSendMessage(lastUserMessage.content, false);
    }
  };

  // Show error alert if there were multiple retries
  const showErrorAlert = retryCount >= 2 && lastError;

  return (
    <div className="flex flex-col relative h-full w-full bg-black">
      <div className="flex-1 overflow-hidden relative">
        {showErrorAlert && (
          <Alert variant="destructive" className="mx-4 mt-4 mb-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Issues</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>We're having trouble connecting to the AI service. This may be due to:</p>
              <ul className="list-disc pl-5">
                <li>Service account configuration issues</li>
                <li>Authentication problems</li>
                <li>Temporary API service outage</li>
              </ul>
              <Button 
                variant="outline" 
                className="mt-2 w-fit"
                onClick={handleRetry}
                disabled={isLoading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Last Message
              </Button>
            </AlertDescription>
          </Alert>
        )}
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
        isPlaying={isPlaying}
        onTogglePlayback={onTogglePlayback}
        placeholder={user ? "Ask anything..." : "Please sign in to chat"}
        className="sticky bottom-0 z-20"
      />
    </div>
  );
};

export default ChatContainer;
