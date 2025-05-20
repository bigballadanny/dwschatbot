import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Send, Loader2 } from "lucide-react";

export interface UnifiedInputBarProps {
  onSend: (message: string) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const UnifiedInputBar: React.FC<UnifiedInputBarProps> = ({
  onSend,
  loading = false,
  disabled = false,
  placeholder = "Type a message...",
  className,
}) => {
  const [inputValue, setInputValue] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || loading || disabled) return;
    
    try {
      await onSend(inputValue);
      setInputValue('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  return (
    <form
      className={cn("flex items-center gap-2", className)}
      onSubmit={handleSubmit}
    >
      <div className="relative flex-1">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={disabled || loading}
          placeholder={placeholder}
          className={cn(
            "flex h-12 w-full rounded-full border border-input bg-background px-4 py-6 text-sm shadow-sm", 
            disabled && "opacity-70"
          )}
        />
      </div>
      
      <Button
        type="submit"
        size="icon"
        disabled={loading || disabled || !inputValue.trim()}
        className="h-10 w-10 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-black shadow-md"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Send className="h-5 w-5" />
        )}
      </Button>
    </form>
  );
};

export default UnifiedInputBar;