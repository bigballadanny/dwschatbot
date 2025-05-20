import React, { useRef, useEffect, useState, useMemo, memo } from 'react';
import MessageItem from '@/components/MessageItem';
import { MessageData } from '@/utils/messageUtils';
import { cn } from '@/lib/utils';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

interface VirtualizedMessageListProps {
  messages: MessageData[];
  className?: string;
  showNewestOnTop?: boolean;
}

interface MessageRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    messages: MessageData[];
  };
}

/**
 * A message list component that uses virtualization for efficient rendering
 * of large message lists.
 */
const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({
  messages,
  className,
  showNewestOnTop = false
}) => {
  const listRef = useRef<List>(null);
  const [hasAutoScrolled, setHasAutoScrolled] = useState(false);
  const [previousMessageCount, setPreviousMessageCount] = useState(messages.length);
  
  // Memoize sorted messages to avoid unnecessary operations
  const sortedMessages = useMemo(() => {
    return showNewestOnTop ? [...messages].reverse() : messages;
  }, [messages, showNewestOnTop]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Only auto-scroll if new messages were added
    if (messages.length > previousMessageCount && !hasAutoScrolled) {
      // Scroll to the bottom of the list
      if (listRef.current) {
        const scrollIndex = showNewestOnTop ? 0 : messages.length - 1;
        listRef.current.scrollToItem(scrollIndex, 'end');
      }
    }
    
    setPreviousMessageCount(messages.length);
  }, [messages.length, previousMessageCount, showNewestOnTop, hasAutoScrolled]);
  
  // Reset scroll state when switching conversations
  useEffect(() => {
    if (messages.length <= 1) {
      setHasAutoScrolled(false);
    }
  }, [messages.length]);
  
  // Rendering for empty state
  if (messages.length === 0) {
    return (
      <div className={cn("py-4 text-center text-muted-foreground", className)}>
        <p>Start a conversation by sending a message.</p>
      </div>
    );
  }
  
  // Row renderer for the virtualized list
  const MessageRow = memo(({ index, style, data }: MessageRowProps) => {
    const message = data.messages[index];
    return (
      <div style={style} className="px-4 py-2">
        <MemoizedMessageItem
          content={message.content}
          source={message.source}
          timestamp={message.timestamp}
          citation={message.citation}
          isLoading={message.isLoading}
        />
      </div>
    );
  });
  
  // Handle scroll events to determine if user has manually scrolled
  const handleScroll = ({ scrollOffset, scrollDirection }: { scrollOffset: number; scrollDirection: string }) => {
    // We consider the user has manually scrolled if they're not at the bottom
    // and the direction is not toward the bottom
    const isAtBottom = scrollOffset < 50;
    
    if (!isAtBottom && scrollDirection === 'forward') {
      setHasAutoScrolled(true);
    } else if (isAtBottom) {
      setHasAutoScrolled(false);
    }
  };
  
  return (
    <div 
      className={cn(
        'flex-1 relative h-full', 
        className
      )} 
      data-testid="virtualized-message-list"
    >
      <AutoSizer>
        {({ height, width }) => (
          <List
            ref={listRef}
            className="scrollbar-thin"
            height={height}
            width={width}
            itemCount={sortedMessages.length}
            itemSize={150} // Approximate height of a message, can be adjusted
            itemData={{ messages: sortedMessages }}
            onScroll={handleScroll}
            overscanCount={5} // Pre-renders additional items for smoother scrolling
          >
            {MessageRow}
          </List>
        )}
      </AutoSizer>
    </div>
  );
};

// Create a memoized version of MessageItem to prevent unnecessary re-renders
const MemoizedMessageItem = memo(MessageItem);

export default memo(VirtualizedMessageList);