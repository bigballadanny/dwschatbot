
import React from 'react';
import { cn } from "@/lib/utils";
import UnifiedInputBar from '@/components/UnifiedInputBar';
import SearchModeToggle from '@/components/SearchModeToggle';
import AudioPlayer from '@/components/AudioPlayer';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '@/contexts/chat';
import { useAudio } from '@/contexts/audio';
import { useAuth } from '@/contexts/auth/AuthContext';
import { useIsMobile } from '@/hooks/ui/use-mobile';

interface ChatInputBarProps {
  onSendMessage: (message: string, isVoice: boolean) => Promise<void>;
  onToggleOnlineSearch: (enabled: boolean) => void;
  onFileUpload: (files: FileList) => void;
  isLoading: boolean;
  disabled: boolean;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  enableOnlineSearch: boolean;
  currentAudioSrc: string | null;
  onAudioStop: () => void;
  isPlaying?: boolean;
  onTogglePlayback?: () => void;
  placeholder?: string;
  className?: string;
}

const ChatInputBar: React.FC<ChatInputBarProps> = ({
  onSendMessage,
  onToggleOnlineSearch,
  onFileUpload,
  isLoading,
  disabled,
  audioEnabled,
  onToggleAudio,
  enableOnlineSearch,
  currentAudioSrc,
  onAudioStop,
  isPlaying,
  onTogglePlayback,
  placeholder = "Ask anything...",
  className,
}) => {
  return (
    <div className={cn(
      "w-full border-t border-zinc-800 bg-background/80 backdrop-blur-sm z-10 shadow-lg",
      className
    )}>
      <div className="max-w-3xl mx-auto px-4 pt-3 pb-5 space-y-3">
        <AnimatePresence>
          {currentAudioSrc && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              key="audio-player"
            >
              <AudioPlayer
                audioSrc={currentAudioSrc}
                onStop={onAudioStop}
                className="mb-2"
                displayControls={true}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap items-center gap-3 justify-between">
          <UnifiedInputBar
            onSend={onSendMessage}
            onFileUpload={onFileUpload}
            loading={isLoading}
            disabled={disabled}
            enableAudio={audioEnabled}
            onToggleAudio={onToggleAudio}
            placeholder={placeholder}
            className="flex-1 min-w-0"
            showVoiceFeatures={true}
          />
          <SearchModeToggle
            enableOnlineSearch={enableOnlineSearch}
            onToggle={onToggleOnlineSearch}
            className="text-xs"
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Context-aware ChatInputBar that uses ChatContext and AudioContext
 */
export const ContextChatInputBar: React.FC<Partial<ChatInputBarProps>> = (props) => {
  const { user } = useAuth();
  
  const {
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
    stopAudio,
  } = useAudio();
  
  return (
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
      placeholder={user ? "Ask anything..." : "Please sign in to chat"}
      {...props}
    />
  );
};

export default ChatInputBar;
