
import React from 'react';
import { Toggle } from "@/components/ui/toggle";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Globe, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchModeToggleProps {
  enableOnlineSearch: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
}

const SearchModeToggle: React.FC<SearchModeToggleProps> = ({
  enableOnlineSearch,
  onToggle,
  className
}) => {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="flex items-center">
        <BookOpen className={cn(
          "h-4 w-4 mr-1", 
          !enableOnlineSearch ? "text-primary" : "text-muted-foreground"
        )} />
        <Label htmlFor="online-search" className="text-xs whitespace-nowrap">
          Transcripts Only
        </Label>
      </div>
      
      <Switch
        id="online-search"
        checked={enableOnlineSearch}
        onCheckedChange={onToggle}
      />
      
      <div className="flex items-center">
        <Globe className={cn(
          "h-4 w-4 mr-1",
          enableOnlineSearch ? "text-primary" : "text-muted-foreground"
        )} />
        <Label htmlFor="online-search" className="text-xs whitespace-nowrap">
          Online Search
        </Label>
      </div>
    </div>
  );
};

export default SearchModeToggle;
