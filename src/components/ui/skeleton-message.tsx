import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonMessageProps {
  type?: 'user' | 'ai';
  width?: string;
  className?: string;
}

/**
 * Skeleton loading component for chat messages
 * Provides an animated placeholder while messages are loading
 */
const SkeletonMessage: React.FC<SkeletonMessageProps> = ({
  type = 'ai',
  width = '100%',
  className,
}) => {
  return (
    <div 
      className={cn(
        'animate-pulse flex w-full',
        type === 'user' ? 'justify-end' : 'justify-start',
        className
      )}
    >
      <div 
        style={{ width: typeof width === 'string' ? width : `${width}px` }} 
        className={cn(
          'rounded-lg p-4',
          type === 'user' 
            ? 'bg-primary/20 rounded-tr-none' 
            : 'bg-muted rounded-tl-none'
        )}
      >
        {/* Fake message content lines */}
        <div className="flex flex-col gap-2">
          {/* Generate 3-5 lines for AI, 1-2 for user */}
          {Array.from({ length: type === 'ai' ? 5 : 2 }).map((_, i) => (
            <div 
              key={i} 
              className={cn(
                'h-4 bg-muted-foreground/20 rounded',
                // Vary the width of each line
                i === 0 ? 'w-full' : 
                i === 1 ? 'w-[85%]' : 
                i === 2 ? 'w-[90%]' : 
                i === 3 ? 'w-[70%]' : 
                'w-[40%]',
                // If it's the last line for user messages, make it shorter
                type === 'user' && i === 1 ? 'w-[65%]' : ''
              )}
            />
          ))}
        </div>
        
        {/* Fake message metadata */}
        <div className="flex items-center justify-between mt-4">
          <div className="h-3 w-16 bg-muted-foreground/20 rounded" />
          <div className="h-3 w-10 bg-muted-foreground/20 rounded" />
        </div>
      </div>
    </div>
  );
};

/**
 * Loading skeleton for an entire conversation
 * Shows multiple skeleton messages with different sizes and orientations
 */
export const ConversationSkeleton: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      <SkeletonMessage type="user" width="50%" />
      <SkeletonMessage type="ai" width="80%" />
      <SkeletonMessage type="user" width="60%" />
      <SkeletonMessage type="ai" width="90%" />
      <SkeletonMessage type="ai" width="75%" />
    </div>
  );
};

export default SkeletonMessage;