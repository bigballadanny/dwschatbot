import React from 'react';
import { cn } from "@/lib/utils";
import UnifiedInputBar from '@/components/UnifiedInputBar';
import SearchModeToggle from '@/components/SearchModeToggle';

interface ChatInputBarProps {
  onSendMessage: (message: string) => Promise<void>;
  onToggleOnlineSearch: (enabled: boolean) => void;
  isLoading: boolean;
  disabled: boolean;
  enableOnlineSearch: boolean;
  placeholder?: string;
  className?: string;
}

const ChatInputBar: React.FC<ChatInputBarProps> = ({
  onSendMessage,
  onToggleOnlineSearch,
  isLoading,
  disabled,
  enableOnlineSearch,
  placeholder = "Ask anything...",
  className,
}) => {
  return (
    <div className={cn(
      "w-full border-t border-zinc-800 bg-background/80 backdrop-blur-sm z-10 shadow-lg",
      className
    )}>
      <div className="max-w-3xl mx-auto px-4 pt-3 pb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <UnifiedInputBar
            onSend={onSendMessage}
            loading={isLoading}
            disabled={disabled}
            placeholder={placeholder}
            className="flex-1 min-w-0"
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