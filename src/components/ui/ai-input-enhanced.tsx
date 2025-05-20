import React from 'react';
import { AIInputWithSearch } from './ai-input-with-search';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface EnhancedAIInputProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  onSubmit: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  onFilesChange?: (files: File[]) => void;
  uploadingFiles?: boolean;
  className?: string;
}

export const EnhancedAIInput: React.FC<EnhancedAIInputProps> = ({
  value,
  onValueChange,
  placeholder = "Ask anything...",
  onSubmit,
  isLoading,
  disabled,
  onFilesChange,
  uploadingFiles,
  className
}) => {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute -inset-1 bg-gradient-to-r from-dws-gold/20 via-dws-blue/20 to-dws-gold/20 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
          <div className="relative">
            <Sparkles className="h-5 w-5 text-dws-gold animate-pulse" />
            <div className="absolute inset-0 bg-dws-gold/20 blur-xl"></div>
          </div>
        </div>
        <AIInputWithSearch
          value={value}
          onValueChange={onValueChange}
          placeholder={placeholder}
          onSubmit={onSubmit}
          isLoading={isLoading}
          disabled={disabled}
          onFilesChange={onFilesChange}
          uploadingFiles={uploadingFiles}
          className={cn(
            "pl-12 border-2 border-dws-gold/20 hover:border-dws-gold/40 focus-within:border-dws-gold transition-all duration-300",
            "bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm",
            className
          )}
        />
      </div>
    </div>
  );
};