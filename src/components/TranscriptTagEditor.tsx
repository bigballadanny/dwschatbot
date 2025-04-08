
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tag as TagIcon, Save, X, Sparkles, Plus } from "lucide-react";
import { TagsInput } from "./TagsInput";
import { formatTagForDisplay, suggestTagsFromContent, getCommonTagSuggestions } from "@/utils/transcriptUtils";
import { showSuccess, showError } from "@/utils/toastUtils";
import { supabase } from '@/integrations/supabase/client';

interface TranscriptTagEditorProps {
  open: boolean;
  onClose: () => void;
  transcriptId: string | string[];  // Support for single or multiple IDs
  initialTags: string[];
  onTagsUpdated: (transcriptId: string | string[], tags: string[]) => void;
  isBatchMode?: boolean;
}

const TranscriptTagEditor: React.FC<TranscriptTagEditorProps> = ({
  open,
  onClose,
  transcriptId,
  initialTags,
  onTagsUpdated,
  isBatchMode = false
}) => {
  const [tags, setTags] = useState<string[]>(initialTags || []);
  const [isSaving, setIsSaving] = useState(false);
  const [content, setContent] = useState("");
  const [isDetectingTags, setIsDetectingTags] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(false);
  const [commonTags, setCommonTags] = useState<{id: string, label: string, checked: boolean}[]>([]);

  useEffect(() => {
    if (open) {
      setTags(initialTags || []);
      
      // Set up common tags with checked state based on initialTags
      const suggestions = getCommonTagSuggestions().map(tag => ({
        ...tag,
        checked: initialTags?.includes(tag.id) || false
      }));
      setCommonTags(suggestions);
      
      if (!isBatchMode) {
        fetchTranscriptContent();
      }
    }
  }, [open, initialTags, transcriptId, isBatchMode]);

  const fetchTranscriptContent = async () => {
    if (Array.isArray(transcriptId)) return; // Don't fetch content in batch mode
    
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
    if (!content || !autoDetectEnabled) return;
    
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

  const handleCommonTagToggle = (tagId: string) => {
    setCommonTags(prev => prev.map(tag => 
      tag.id === tagId ? { ...tag, checked: !tag.checked } : tag
    ));

    // Also update the main tags array for consistency
    if (tags.includes(tagId)) {
      setTags(tags.filter(t => t !== tagId));
    } else {
      setTags([...tags, tagId]);
    }
  };

  const handleApplyCommonTags = () => {
    // Get all checked tag IDs
    const checkedTagIds = commonTags
      .filter(tag => tag.checked)
      .map(tag => tag.id);

    // Update the tags list with all checked tags
    setTags(checkedTagIds);
  };
  
  const handleSaveTags = async () => {
    try {
      setIsSaving(true);
      
      // Create a properly typed update object
      const updateData: Record<string, any> = {
        tags: tags.length > 0 ? tags : null
      };
      
      // Handle single vs batch update
      if (!Array.isArray(transcriptId)) {
        // Single transcript update
        const { error } = await supabase
          .from('transcripts')
          .update(updateData)
          .eq('id', transcriptId);
        
        if (error) throw error;
        
        onTagsUpdated(transcriptId, tags);
        showSuccess("Tags updated", `Successfully updated tags for this transcript`);
      } else {
        // Batch update for multiple transcripts
        if (transcriptId.length === 0) {
          showError("No transcripts selected", "Please select at least one transcript to update tags.");
          setIsSaving(false);
          return;
        }
        
        const { error } = await supabase
          .from('transcripts')
          .update(updateData)
          .in('id', transcriptId);
        
        if (error) throw error;
        
        onTagsUpdated(transcriptId, tags);
        showSuccess("Tags updated", `Successfully updated tags for ${transcriptId.length} transcripts`);
      }
      
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
            {isBatchMode ? `Batch Edit Tags (${Array.isArray(transcriptId) ? transcriptId.length : 1} transcripts)` : 'Edit Tags'}
          </DialogTitle>
          <DialogDescription>
            {isBatchMode 
              ? "Apply tags to multiple transcripts at once." 
              : "Add or remove tags for this transcript to help with organization and search."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isBatchMode && (
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="auto-detect" 
                checked={autoDetectEnabled} 
                onCheckedChange={() => setAutoDetectEnabled(!autoDetectEnabled)} 
              />
              <label 
                htmlFor="auto-detect" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Enable auto-detection (uses AI resources)
              </label>
            </div>
          )}

          {!isBatchMode && autoDetectEnabled && (
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
          )}
          
          {/* Common tags with checkboxes for quick selection */}
          <div className="border rounded-md p-3 bg-muted/30">
            <p className="text-sm font-medium mb-2">Common Tags:</p>
            <div className="grid grid-cols-2 gap-2">
              {commonTags.map(tag => (
                <div key={tag.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`tag-${tag.id}`} 
                    checked={tag.checked || tags.includes(tag.id)}
                    onCheckedChange={() => handleCommonTagToggle(tag.id)}
                  />
                  <label 
                    htmlFor={`tag-${tag.id}`}
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {tag.label}
                  </label>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleApplyCommonTags}
              className="mt-2 w-full text-xs"
            >
              Apply Selected Tags
            </Button>
          </div>
          
          {suggestedTags.length > 0 && (
            <div className="border rounded-md p-3 bg-muted/50">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium">Auto-suggested tags:</p>
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
            placeholder="Add custom tags..."
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
                {isBatchMode ? `Save Tags to ${Array.isArray(transcriptId) ? transcriptId.length : 1} Transcripts` : 'Save Tags'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TranscriptTagEditor;
