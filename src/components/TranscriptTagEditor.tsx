
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tag as TagIcon, Save, X, Sparkles } from "lucide-react";
import { TagsInput } from "./TagsInput";
import { formatTagForDisplay, suggestTagsFromContent } from "@/utils/transcriptUtils";
import { showSuccess, showError } from "@/utils/toastUtils";
import { supabase } from '@/integrations/supabase/client';

interface TranscriptTagEditorProps {
  open: boolean;
  onClose: () => void;
  transcriptId: string;
  initialTags: string[];
  onTagsUpdated: (transcriptId: string, tags: string[]) => void;
}

const TranscriptTagEditor: React.FC<TranscriptTagEditorProps> = ({
  open,
  onClose,
  transcriptId,
  initialTags,
  onTagsUpdated
}) => {
  const [tags, setTags] = useState<string[]>(initialTags || []);
  const [isSaving, setIsSaving] = useState(false);
  const [content, setContent] = useState("");
  const [isDetectingTags, setIsDetectingTags] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setTags(initialTags || []);
      fetchTranscriptContent();
    }
  }, [open, initialTags, transcriptId]);

  const fetchTranscriptContent = async () => {
    try {
      const { data, error } = await supabase
        .from('transcripts')
        .select('content')
        .eq('id', transcriptId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setContent(data.content);
      }
    } catch (error) {
      console.error("Error fetching transcript content:", error);
    }
  };

  const handleDetectTags = () => {
    if (!content) return;
    
    setIsDetectingTags(true);
    try {
      const detected = suggestTagsFromContent(content);
      
      // Filter out tags that are already added
      const newTags = detected.filter(tag => !tags.includes(tag));
      
      if (newTags.length > 0) {
        setSuggestedTags(newTags);
      } else {
        setSuggestedTags([]);
        showSuccess("No new tags detected", "All relevant tags are already added to this transcript.");
      }
    } catch (error) {
      console.error("Error detecting tags:", error);
    } finally {
      setIsDetectingTags(false);
    }
  };

  const handleAddSuggestedTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
      setSuggestedTags(suggestedTags.filter(t => t !== tag));
    }
  };

  const handleAddAllSuggestedTags = () => {
    const newTagsSet = new Set([...tags, ...suggestedTags]);
    setTags(Array.from(newTagsSet));
    setSuggestedTags([]);
  };

  const handleSaveTags = async () => {
    try {
      setIsSaving(true);
      
      // Create a properly typed update object
      const updateData: Record<string, any> = {
        tags: tags.length > 0 ? tags : null
      };
      
      const { error } = await supabase
        .from('transcripts')
        .update(updateData)
        .eq('id', transcriptId);
      
      if (error) throw error;
      
      onTagsUpdated(transcriptId, tags);
      showSuccess("Tags updated", `Successfully updated tags for this transcript`);
      onClose();
    } catch (error) {
      console.error("Error updating tags:", error);
      showError("Failed to update tags", "There was an error saving the tags. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TagIcon className="h-5 w-5" />
            Edit Tags
          </DialogTitle>
          <DialogDescription>
            Add or remove tags for this transcript to help with organization and search.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Button 
            variant="outline" 
            onClick={handleDetectTags} 
            disabled={isDetectingTags || !content}
            className="w-full"
          >
            {isDetectingTags ? (
              <>Detecting tags...</>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Auto-detect tags from content
              </>
            )}
          </Button>
          
          {suggestedTags.length > 0 && (
            <div className="border rounded-md p-3 bg-muted/50">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium">Suggested tags:</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleAddAllSuggestedTags}
                  className="h-7 text-xs"
                >
                  Add all
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {suggestedTags.map(tag => (
                  <Badge 
                    key={tag} 
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => handleAddSuggestedTag(tag)}
                  >
                    {formatTagForDisplay(tag)}
                    <Plus className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          <TagsInput
            value={tags}
            onChange={setTags}
            placeholder="Add tags..."
          />
          
          {tags.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">Current tags:</p>
              <p>{tags.map(formatTagForDisplay).join(', ')}</p>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveTags}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            {isSaving ? "Saving..." : (
              <>
                <Save className="h-4 w-4" />
                Save Tags
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TranscriptTagEditor;
