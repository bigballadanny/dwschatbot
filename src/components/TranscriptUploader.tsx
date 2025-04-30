
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, Upload, X, File, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
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
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };
  
  const handleFiles = (files: FileList) => {
    if (files.length > 0) {
      // Check for allowed file types
      const file = files[0];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (!fileExtension || !['txt', 'pdf', 'doc', 'docx'].includes(fileExtension)) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please select a text document (.txt, .pdf, .doc, .docx)",
        });
        return;
      }
      
      if (file.size > 10485760) { // 10MB limit
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please select a file smaller than 10MB",
        });
        return;
      }
      
      setSelectedFile(file);
      // Reset progress when selecting a new file
      setUploadProgress(null);
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
        variant: "success",
      });
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
        variant: "info",
      });
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const filePath = generateStoragePath(userId, selectedFile.name);
      const sanitizedFilePath = sanitizeFilename(filePath);
      
      // Simulate progress for better UX
      const progressSimulation = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev === null) return 10;
          return prev < 90 ? prev + 10 : prev;
        });
      }, 500);
      
      // Upload the file without progress tracking (not supported in this Supabase version)
      const { error } = await supabase.storage
        .from('transcripts')
        .upload(sanitizedFilePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });
        
      clearInterval(progressSimulation);
      
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
      
      // Set progress to 100% when done
      setUploadProgress(100);
      
      // Reset progress after showing 100% complete
      setTimeout(() => {
        setUploadProgress(null);
      }, 1500);
      
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "There was an error uploading your transcript.",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const cancelUpload = () => {
    setSelectedFile(null);
    setUploadProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
      
      <div 
        className={`border-2 border-dashed rounded-lg p-6 transition-all ${
          dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'
        } ${selectedFile ? 'bg-secondary/20' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-3">
          {!selectedFile ? (
            <>
              <div className="p-3 rounded-full bg-secondary">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drag and drop your transcript file or
                </p>
                <Button 
                  variant="ghost" 
                  className="mt-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Supported formats: .txt, .pdf, .doc, .docx (Max 10MB)
              </p>
            </>
          ) : (
            <div className="w-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="p-2 mr-3 rounded-full bg-secondary/60">
                    <FileText className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium truncate max-w-[200px]">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(selectedFile.size / 1024)} KB
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={cancelUpload}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {uploadProgress !== null && (
                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept=".txt,.pdf,.doc,.docx"
        />
      </div>
      
      <div className="flex justify-end">
        <Button
          onClick={uploadFile}
          disabled={!selectedFile || isUploading}
          className="relative"
        >
          {isUploading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading{uploadProgress !== null ? ` (${uploadProgress}%)` : '...'}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Transcript
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default TranscriptUploader;
