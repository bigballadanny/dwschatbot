
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tag as TagIcon, Save, X, Sparkles, Plus, FileText } from "lucide-react";
import { TagsInput } from "./TagsInput";
import { 
  formatTagForDisplay, 
  suggestTagsFromContent, 
  getCommonTagSuggestions,
  getSourceCategories 
} from "@/utils/transcriptUtils";
import { showSuccess, showError } from "@/utils/toastUtils";
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TranscriptTagEditorProps {
  open: boolean;
  onClose: () => void;
  transcriptId: string | string[];  // Support for single or multiple IDs
  initialTags: string[];
  onTagsUpdated: (transcriptId: string | string[], tags: string[]) => void;
  isBatchMode?: boolean;
  initialSource?: string;
}

const TranscriptTagEditor: React.FC<TranscriptTagEditorProps> = ({
  open,
  onClose,
  transcriptId,
  initialTags,
  onTagsUpdated,
  isBatchMode = false,
  initialSource
}) => {
  const [tags, setTags] = useState<string[]>(initialTags || []);
  const [isSaving, setIsSaving] = useState(false);
  const [content, setContent] = useState("");
  const [isDetectingTags, setIsDetectingTags] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(false);
  const [commonTags, setCommonTags] = useState<{id: string, label: string, checked: boolean}[]>([]);
  const [sourceCategory, setSourceCategory] = useState<string>(initialSource || '');
  const [activeTab, setActiveTab] = useState<string>("tags");
  const [originalSource, setOriginalSource] = useState<string>('');

  const sourceCategories = getSourceCategories();

  useEffect(() => {
    if (open) {
      setTags(initialTags || []);
      
      // Set up common tags with checked state based on initialTags
      const suggestions = getCommonTagSuggestions().map(tag => ({
        ...tag,
        checked: initialTags?.includes(tag.id) || false
      }));
      setCommonTags(suggestions);
      
      if (!isBatchMode && !Array.isArray(transcriptId)) {
        fetchTranscriptDetails();
      }
    }
  }, [open, initialTags, transcriptId, isBatchMode]);

  const fetchTranscriptDetails = async () => {
    if (Array.isArray(transcriptId)) return; // Don't fetch for batch mode
    
    try {
      const { data, error } = await supabase
        .from('transcripts')
        .select('content, source')
        .eq('id', transcriptId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setContent(data.content);
        setSourceCategory(data.source || '');
        setOriginalSource(data.source || '');
      }
    } catch (error) {
      console.error("Error fetching transcript details:", error);
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

  const handleSourceChange = (value: string) => {
    setSourceCategory(value);
  };
  
  const handleSaveTags = async () => {
    try {
      setIsSaving(true);
      
      // Create a properly typed update object
      const updateData: { tags: string[] | null } = {
        tags: tags.length > 0 ? tags : null
      };
      
      // Only update the source if it's different from the original
      // and this is not a batch operation
      if (sourceCategory && (!isBatchMode || (isBatchMode && sourceCategory !== '')) && sourceCategory !== originalSource) {
        updateData.source = sourceCategory;
      }
      
      // Handle single vs batch update
      if (!Array.isArray(transcriptId)) {
        // Single transcript update
        const { error } = await supabase
          .from('transcripts')
          .update(updateData)
          .eq('id', transcriptId);
        
        if (error) throw error;
        
        onTagsUpdated(transcriptId, tags);
        showSuccess("Transcript updated", `Successfully updated tags${sourceCategory !== originalSource ? ' and source category' : ''} for this transcript`);
      } else {
        // Batch update for multiple transcripts
        if (transcriptId.length === 0) {
          showError("No transcripts selected", "Please select at least one transcript to update.");
          setIsSaving(false);
          return;
        }
        
        const { error } = await supabase
          .from('transcripts')
          .update(updateData)
          .in('id', transcriptId);
        
        if (error) throw error;
        
        onTagsUpdated(transcriptId, tags);
        showSuccess("Transcripts updated", `Successfully updated ${transcriptId.length} transcripts`);
      }
      
      onClose();
    } catch (error) {
      console.error("Error updating transcript:", error);
      showError("Failed to update", "There was an error saving the changes. Please try again.");
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
            {isBatchMode ? `Batch Edit (${Array.isArray(transcriptId) ? transcriptId.length : 1} transcripts)` : 'Edit Transcript'}
          </DialogTitle>
          <DialogDescription>
            {isBatchMode 
              ? "Apply tags and settings to multiple transcripts at once." 
              : "Add or remove tags and update the source category for this transcript."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tags">
              <TagIcon className="h-4 w-4 mr-2" />
              Tags
            </TabsTrigger>
            <TabsTrigger value="source">
              <FileText className="h-4 w-4 mr-2" />
              Source
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="tags" className="space-y-4 py-4">
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
          </TabsContent>
          
          <TabsContent value="source" className="space-y-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="source-category" className="text-sm font-medium">
                Source Category
              </label>
              
              <Select 
                value={sourceCategory} 
                onValueChange={handleSourceChange}
                disabled={isBatchMode && Array.isArray(transcriptId) && transcriptId.length > 10}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a source category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Source Categories</SelectLabel>
                    {sourceCategories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              
              {isBatchMode && Array.isArray(transcriptId) && transcriptId.length > 10 && (
                <p className="text-xs text-muted-foreground">
                  Source category editing is disabled for large batch operations (more than 10 transcripts).
                </p>
              )}
              
              <p className="text-sm text-muted-foreground mt-2">
                The source category helps organize transcripts and affects how they are displayed and searched.
              </p>
            </div>
          </TabsContent>
        </Tabs>

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
                {isBatchMode ? `Save Changes (${Array.isArray(transcriptId) ? transcriptId.length : 1})` : 'Save Changes'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TranscriptTagEditor;
