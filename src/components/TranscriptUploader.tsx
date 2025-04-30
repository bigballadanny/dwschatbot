
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/components/ui/use-toast';
import FileUploader from "@/components/FileUploader";
import { 
  sanitizeFilename, 
  generateStoragePath, 
  generatePublicUrl,
  detectSourceCategory
} from "@/utils/fileUtils";

interface TranscriptUploaderProps {
  userId: string;
  onUploadComplete?: (transcriptId: string) => void;
  defaultSelectedSource?: string;
  isCompact?: boolean;
}

const TranscriptUploader = ({
  userId,
  onUploadComplete,
  defaultSelectedSource,
  isCompact = false
}: TranscriptUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (files: FileList) => {
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const checkForDuplicates = async (file: File): Promise<boolean> => {
    try {
      // Calculate simple file fingerprint (name + size)
      const fingerprint = `${file.name}-${file.size}`;
      
      // Check if there are any transcripts with similar properties
      const { data: existingFiles, error } = await supabase
        .from('transcripts')
        .select('id, title, file_path')
        .eq('user_id', userId)
        .filter('file_path', 'like', `%${sanitizeFilename(file.name)}%`)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      // If we find a potential match
      if (existingFiles && existingFiles.length > 0) {
        const confirmed = window.confirm(
          `A file with a similar name "${existingFiles[0].title}" already exists. Upload anyway?`
        );
        
        return confirmed;
      }
      
      // No duplicates found
      return true;
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      // If the check fails, allow the upload rather than blocking it
      return true;
    }
  };

  const createTranscript = async (
    title: string, 
    content: string, 
    filePath: string,
    publicUrl: string
  ) => {
    try {
      // Auto-detect source category from title
      const sourceCategory = detectSourceCategory(title);
      
      // Insert a record into the transcripts table
      const { data, error } = await supabase
        .from('transcripts')
        .insert([
          {
            title: title.replace(/\.\w+$/, '').replace(/_/g, ' '),
            content: content,
            file_path: filePath,
            source: sourceCategory || defaultSelectedSource || 'other',
            user_id: userId,
            is_processed: false
          }
        ])
        .select();
        
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0 && onUploadComplete) {
        onUploadComplete(data[0].id);
      }
      
      toast({
        title: "Upload complete",
        description: "Your transcript has been uploaded and is being processed.",
      });
      
      // Trigger the process-transcript function to start processing
      const { error: webhookError } = await supabase.functions.invoke('transcript-webhook', {
        body: { 
          type: 'INSERT',
          record: data ? data[0] : { id: null }
        }
      });
      
      if (webhookError) {
        console.error('Error triggering transcript processing:', webhookError);
      }
    } catch (error: any) {
      console.error('Error creating transcript record:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to create transcript: ${error.message || error}`,
      });
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;
    
    // Check for duplicates first
    const shouldContinue = await checkForDuplicates(selectedFile);
    if (!shouldContinue) {
      toast({
        description: "Upload canceled.",
      });
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const filePath = generateStoragePath(userId, selectedFile.name);
      const sanitizedFilePath = sanitizeFilename(filePath);
      
      const { error } = await supabase.storage
        .from('transcripts')
        .upload(sanitizedFilePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setUploadProgress(percent);
          }
        });
        
      if (error) {
        if (error.message && error.message.includes('The resource already exists')) {
          toast({
            variant: "destructive",
            title: "Duplicate file",
            description: "This file already exists in storage. Please use a different file name or delete the existing file.",
          });
        } else {
          throw error;
        }
        return;
      }
      
      const publicURL = generatePublicUrl('transcripts', sanitizedFilePath);
      
      await createTranscript(selectedFile.name, '', sanitizedFilePath, publicURL);
      setSelectedFile(null);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "There was an error uploading your transcript.",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className={`space-y-4 ${isCompact ? 'max-w-md' : 'w-full'}`}>
      {!isCompact && (
        <div className="pb-2">
          <Label className="text-lg font-medium">Upload Transcript</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Upload transcript files to be processed and analyzed.
          </p>
        </div>
      )}
      
      <FileUploader
        onFileSelect={handleFileSelect}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        acceptedFileTypes=".txt,.pdf,.doc,.docx"
        multiple={false}
      />
      
      {selectedFile && (
        <Alert variant="outline" className="bg-amber-50/30 dark:bg-amber-950/20">
          <Info className="h-4 w-4" />
          <AlertTitle>Selected File</AlertTitle>
          <AlertDescription>
            {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex justify-end">
        <Button
          onClick={uploadFile}
          disabled={!selectedFile || isUploading}
        >
          {isUploading ? "Uploading..." : "Upload Transcript"}
        </Button>
      </div>
    </div>
  );
};

export default TranscriptUploader;
