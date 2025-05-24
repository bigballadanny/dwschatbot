import React, { useState, useEffect } from 'react';
import { Check, Filter, Tag as TagIcon, X, Plus, Hash, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatTagForDisplay } from '@/utils/transcriptUtils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';

interface TagFilterProps {
  onTagAdded?: (tag: string) => void;
  onTagRemoved?: (tag: string) => void;
  selectedTags?: string[];
  initialTags?: string[];
  title?: string;
}

const TagFilter: React.FC<TagFilterProps> = ({ 
  onTagAdded, 
  onTagRemoved, 
  selectedTags: propSelectedTags,
  initialTags = [],
  title = "Tags"
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [open, setOpen] = useState(false);
  const [allTags, setAllTags] = useState<string[]>(initialTags);
  const [internalSelectedTags, setInternalSelectedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Use either provided selected tags or internal state
  const selectedTags = propSelectedTags !== undefined ? propSelectedTags : internalSelectedTags;
  
  // Only update internal state if we're not using prop-based selected tags
  const updateSelectedTags = (tags: string[]) => {
    if (propSelectedTags === undefined) {
      setInternalSelectedTags(tags);
    }
  };

  // Fetch all unique tags from transcripts
  useEffect(() => {
    if (initialTags.length > 0) {
      setAllTags(initialTags);
      return;
    }

    const fetchTags = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('transcripts')
          .select('tags');

        if (error) {
          logger.error('Error fetching tags:', error);
          return;
        }

        if (data) {
          // Extract and flatten all tags from transcripts
          const uniqueTags = Array.from(
            new Set(
              data
                .filter(item => item.tags && Array.isArray(item.tags))
                .flatMap(item => item.tags || [])
            )
          );
          setAllTags(uniqueTags);
        }
      } catch (error) {
        logger.error('Error fetching tags:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTags();
  }, [initialTags]);

  const filteredTags = searchValue
    ? allTags.filter(tag => formatTagForDisplay(tag).toLowerCase().includes(searchValue.toLowerCase()))
    : allTags;

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      const updatedTags = selectedTags.filter(t => t !== tag);
      updateSelectedTags(updatedTags);
      
      if (onTagRemoved) {
        onTagRemoved(tag);
      }
    } else {
      const updatedTags = [...selectedTags, tag];
      updateSelectedTags(updatedTags);
      
      if (onTagAdded) {
        onTagAdded(tag);
      }
    }
  };

  const handleAddNewTag = () => {
    if (!searchValue.trim()) return;
    
    const newTag = searchValue.toLowerCase().replace(/\s+/g, '_');
    
    if (!allTags.includes(newTag)) {
      setAllTags([...allTags, newTag]);
    }
    
    if (!selectedTags.includes(newTag)) {
      const updatedTags = [...selectedTags, newTag];
      updateSelectedTags(updatedTags);
      
      if (onTagAdded) {
        onTagAdded(newTag);
      }
    }
    
    setSearchValue('');
  };

  const clearFilters = () => {
    selectedTags.forEach(tag => {
      if (onTagRemoved) {
        onTagRemoved(tag);
      }
    });
    updateSelectedTags([]);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddNewTag();
    }
  };

  return (
    <div className="relative">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outlineHover" 
            size="sm" 
            className={cn(
              "flex items-center gap-1 h-9 transition-all",
              selectedTags.length > 0 ? "text-primary border-primary" : ""
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>{title}</span>
            {selectedTags.length > 0 && (
              <Badge variant="secondary" size="sm" className="ml-1 h-5 px-1.5">
                {selectedTags.length}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3 ml-0.5 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="w-72">
          <div className="p-2 space-y-2">
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">{title.toUpperCase()}</DropdownMenuLabel>
            <div className="relative">
              <Input
                placeholder="Search or add new tag..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-8 pr-8"
              />
              <Button
                variant="ghost"
                size="iconXs"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={handleAddNewTag}
                disabled={!searchValue.trim()}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="sr-only">Add Tag</span>
              </Button>
            </div>
          </div>
          
          <DropdownMenuSeparator />
          
          <ScrollArea className="h-56">
            <DropdownMenuGroup>
              {isLoading ? (
                <div className="p-4 text-sm text-center">
                  <div className="animate-spin h-4 w-4 mx-auto mb-2 border-2 border-primary border-t-transparent rounded-full"></div>
                  <p className="text-muted-foreground">Loading tags...</p>
                </div>
              ) : filteredTags.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  {searchValue ? (
                    <>
                      <p>No tags found matching "{searchValue}"</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={handleAddNewTag}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Create tag "{searchValue}"
                      </Button>
                    </>
                  ) : (
                    'No tags available'
                  )}
                </div>
              ) : (
                filteredTags.map((tag) => (
                  <DropdownMenuItem
                    key={tag}
                    onSelect={(e) => {
                      e.preventDefault();
                      handleTagToggle(tag);
                    }}
                    className="flex items-center gap-2 cursor-pointer px-3 py-1.5 min-h-8 text-sm"
                  >
                    <div className="rounded-sm border w-4 h-4 flex items-center justify-center transition-colors">
                      {selectedTags.includes(tag) && <Check className="h-3 w-3 text-primary" />}
                    </div>
                    <TagIcon className="h-3.5 w-3.5 opacity-70" />
                    <span className="flex-1 truncate">{formatTagForDisplay(tag)}</span>
                    <Badge 
                      variant="outline" 
                      size="sm" 
                      className="ml-auto opacity-60 pointer-events-none"
                    >
                      {tag}
                    </Badge>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuGroup>
          </ScrollArea>
          
          <DropdownMenuSeparator />
          
          <div className="p-2 flex justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters} 
              disabled={selectedTags.length === 0}
              className="text-xs"
            >
              Clear all
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => setOpen(false)}
              className="text-xs"
            >
              Apply
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedTags.map((tag) => (
            <Badge 
              key={tag} 
              variant="tag" 
              className="group flex items-center gap-1 py-0.5 pl-1.5 pr-1 hover:pl-2 transition-all duration-200"
              interactive={true}
            >
              <Hash className="h-3 w-3 opacity-70 group-hover:text-primary transition-colors" />
              <span className="truncate max-w-[100px]">{formatTagForDisplay(tag)}</span>
              <Button
                variant="ghost"
                size="iconXs"
                className="h-4 w-4 p-0 ml-0.5 opacity-70 hover:opacity-100 hover:bg-background rounded-full group-hover:bg-background/80"
                onClick={() => handleTagToggle(tag)}
              >
                <X className="h-2.5 w-2.5" />
                <span className="sr-only">Remove</span>
              </Button>
            </Badge>
          ))}
          
          {selectedTags.length > 1 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-xs hover:bg-muted/40"
                    onClick={clearFilters}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Remove all selected tags</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}
    </div>
  );
};

export default TagFilter;