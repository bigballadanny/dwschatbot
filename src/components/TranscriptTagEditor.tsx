
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
import { Tag as TagIcon, Save, X } from "lucide-react";
import { TagsInput } from "./TagsInput";
import { formatTagForDisplay } from "@/utils/transcriptUtils";
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

  useEffect(() => {
    if (open) {
      setTags(initialTags || []);
    }
  }, [open, initialTags]);

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
