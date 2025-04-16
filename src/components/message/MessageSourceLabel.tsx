
import React from 'react';
import { format } from 'date-fns';
import { Chip } from "@/components/ui/chip";
import { getSourceDescription } from '@/utils/transcriptUtils';
import { MessageSource } from '@/utils/messageUtils';

interface MessageSourceLabelProps {
  source: MessageSource;
  timestamp?: Date;
  className?: string;
}

const MessageSourceLabel: React.FC<MessageSourceLabelProps> = ({ source, timestamp, className }) => {
  const time = timestamp ? format(new Date(timestamp), 'h:mm a') : null;
  
  const getSourceConfig = (source: MessageSource) => {
    switch (source) {
      case 'gemini':
        return {
          color: 'blue',
          label: 'Gemini AI',
          bgClass: 'bg-blue-700/20 text-blue-200',
        };
      case 'vertex':
        return {
          color: 'blue',
          label: 'Gemini AI',
          bgClass: 'bg-blue-700/20 text-blue-200',
        };
      case 'system':
        return {
          color: 'gray',
          label: 'System',
          bgClass: 'bg-gray-700/20 text-gray-200',
        };
      case 'cache':
        return {
          color: 'green',
          label: 'Cached Response',
          bgClass: 'bg-green-700/20 text-green-200',
        };
      case 'transcript':
        return {
          color: 'amber',
          label: 'Transcript',
          bgClass: 'bg-amber-700/20 text-amber-200',
        };
      default:
        return {
          color: 'gray',
          label: source,
          bgClass: 'bg-gray-700/20 text-gray-200',
        };
    }
  };

  const { label, bgClass } = getSourceConfig(source);

  return (
    <div className={`flex items-center mt-2 mb-1 text-xs text-gray-400 ${className || ''}`}>
      <Chip 
        variant="secondary"
        size="sm" 
        className={`mr-2 ${bgClass}`}
      >
        {label}
      </Chip>
      {time && <span className="opacity-70">{time}</span>}
    </div>
  );
};

export default MessageSourceLabel;
