
import React from 'react';
import { cn } from "@/lib/utils";
import UnifiedInputBar from '@/components/UnifiedInputBar';
import SearchModeToggle from '@/components/SearchModeToggle';
import AudioPlayer from '@/components/AudioPlayer';

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
  placeholder = "Ask anything...",
  className,
}) => {
  return (
    <div className={cn("absolute bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-sm z-10", className)}>
      <div className="max-w-3xl mx-auto px-4 pt-3 pb-4 space-y-3">
        {currentAudioSrc && (
          <AudioPlayer
            audioSrc={currentAudioSrc}
            onStop={onAudioStop}
            className="mb-2"
          />
        )}

        <div className="flex items-center gap-3 justify-between">
          <UnifiedInputBar
            onSend={onSendMessage}
            onFileUpload={onFileUpload}
            loading={isLoading}
            disabled={disabled}
            enableAudio={audioEnabled}
            onToggleAudio={onToggleAudio}
            placeholder={placeholder}
            className="flex-1"
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

export default ChatInputBar;
