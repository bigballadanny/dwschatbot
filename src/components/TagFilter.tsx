
import React, { useState } from 'react';
import { Check, Filter, Tag as TagIcon, X } from 'lucide-react';
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

interface TagFilterProps {
  tags: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

const TagFilter: React.FC<TagFilterProps> = ({ tags, selectedTags, onTagsChange }) => {
  const [searchValue, setSearchValue] = useState('');
  const [open, setOpen] = useState(false);

  const filteredTags = searchValue
    ? tags.filter(tag => formatTagForDisplay(tag).toLowerCase().includes(searchValue.toLowerCase()))
    : tags;

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const clearFilters = () => {
    onTagsChange([]);
    setOpen(false);
  };

  return (
    <div className="relative">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "flex items-center gap-1 h-9",
              selectedTags.length > 0 ? "text-primary border-primary" : ""
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Tags</span>
            {selectedTags.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1">
                {selectedTags.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="w-64">
          <div className="p-2">
            <Input
              placeholder="Search tags..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-8"
            />
          </div>
          
          <DropdownMenuSeparator />
          
          <ScrollArea className="h-56">
            <DropdownMenuGroup>
              {filteredTags.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  No tags found
                </div>
              ) : (
                filteredTags.map((tag) => (
                  <DropdownMenuItem
                    key={tag}
                    onSelect={(e) => {
                      e.preventDefault();
                      handleTagToggle(tag);
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <div className="rounded-sm border w-4 h-4 flex items-center justify-center">
                      {selectedTags.includes(tag) && <Check className="h-3 w-3" />}
                    </div>
                    <TagIcon className="h-3 w-3 opacity-70" />
                    <span>{formatTagForDisplay(tag)}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuGroup>
          </ScrollArea>
          
          <DropdownMenuSeparator />
          
          <div className="p-2 flex justify-between">
            <Button variant="ghost" size="sm" onClick={clearFilters} disabled={selectedTags.length === 0}>
              Clear filters
            </Button>
            <Button variant="default" size="sm" onClick={() => setOpen(false)}>
              Apply
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              <TagIcon className="h-3 w-3 opacity-70" />
              {formatTagForDisplay(tag)}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1 hover:bg-muted rounded-full"
                onClick={() => handleTagToggle(tag)}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove</span>
              </Button>
            </Badge>
          ))}
          
          {selectedTags.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={clearFilters}
            >
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// Helper function from shadcn
const cn = (...classes: any[]) => {
  return classes.filter(Boolean).join(' ');
};

export default TagFilter;
