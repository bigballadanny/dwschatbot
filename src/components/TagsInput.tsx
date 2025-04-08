
import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Tag as TagIcon, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { formatTagForDisplay, formatTagForStorage, getCommonTagSuggestions } from '@/utils/transcriptUtils';
import { showTagAction } from '@/utils/toastUtils';

interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxTags?: number;
  suggestions?: { id: string; label: string }[];
}

export const TagsInput = React.forwardRef<HTMLDivElement, TagsInputProps>(
  ({ value = [], onChange, placeholder = "Add tags...", disabled = false, maxTags = 10, suggestions = [] }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState('');
    const [open, setOpen] = useState(false);
    const [isComposing, setIsComposing] = useState(false);
    const allSuggestions = suggestions.length > 0 ? suggestions : getCommonTagSuggestions();

    const handleAddTag = (tag: string) => {
      if (!tag.trim() || value.length >= maxTags) return;
      
      const formattedTag = formatTagForStorage(tag.trim());
      
      if (!value.includes(formattedTag)) {
        const newTags = [...value, formattedTag];
        onChange(newTags);
        showTagAction('added', formatTagForDisplay(formattedTag));
      }
      
      setInputValue('');
      inputRef.current?.focus();
    };

    const handleRemoveTag = (index: number) => {
      const removedTag = value[index];
      const newTags = value.filter((_, i) => i !== index);
      onChange(newTags);
      showTagAction('deleted', formatTagForDisplay(removedTag));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isComposing) return;

      // Add tag on Enter or comma
      if ((e.key === 'Enter' || e.key === ',') && inputValue) {
        e.preventDefault();
        handleAddTag(inputValue);
      } 
      // Remove last tag on Backspace if input is empty
      else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
        handleRemoveTag(value.length - 1);
      }
    };

    const handleSelectSuggestion = (selectedTag: string) => {
      handleAddTag(selectedTag);
      setOpen(false);
    };

    const filteredSuggestions = allSuggestions.filter(suggestion => 
      !value.includes(suggestion.id) && 
      (inputValue ? suggestion.label.toLowerCase().includes(inputValue.toLowerCase()) : true)
    );

    return (
      <div 
        ref={ref}
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-md border border-input bg-background p-1 px-3 ring-offset-background",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex flex-wrap gap-1">
          {value.map((tag, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1 px-2 py-1">
              <TagIcon className="h-3 w-3 opacity-70" />
              <span>{formatTagForDisplay(tag)}</span>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 rounded-full hover:bg-muted"
                  onClick={() => handleRemoveTag(index)}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove tag {tag}</span>
                </Button>
              )}
            </Badge>
          ))}
          
          <div className="flex-1 flex items-center">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder={value.length === 0 ? placeholder : ''}
              disabled={disabled || value.length >= maxTags}
              className="w-auto min-w-[120px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 ml-auto flex-shrink-0" 
              disabled={disabled || value.length >= maxTags}
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add tag</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-60" align="end">
            <Command>
              <CommandInput placeholder="Search tags..." />
              <CommandList>
                <CommandEmpty>No tags found</CommandEmpty>
                <CommandGroup heading="Suggested tags">
                  {filteredSuggestions.map(suggestion => (
                    <CommandItem
                      key={suggestion.id}
                      onSelect={() => handleSelectSuggestion(suggestion.label)}
                      className="flex items-center gap-2"
                    >
                      <TagIcon className="h-3 w-3 opacity-70" />
                      {suggestion.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
                
                {inputValue && (
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => handleAddTag(inputValue)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-3 w-3" />
                      Add "{inputValue}"
                    </CommandItem>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);

TagsInput.displayName = "TagsInput";

export default TagsInput;
