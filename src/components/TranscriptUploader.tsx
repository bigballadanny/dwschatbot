
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Upload, X, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/ui/use-toast';
import { 
  sanitizeFilename, 
  generateStoragePath, 
  generatePublicUrl,
  detectSourceCategory,
  formatFileSize
} from "@/utils/fileUtils";
import { Progress } from "@/components/ui/progress";

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
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const { toast } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<number | null>(null);

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
      setUploadStatus('idle');
      setUploadProgress(null);
    }
  };

  const checkForDuplicates = async (file: File): Promise<boolean> => {
    try {
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
      
      setUploadStatus('success');
      toast({
        title: "Upload complete",
        description: "Your transcript has been uploaded and is being processed.",
      });
    } catch (error: any) {
      console.error('Error creating transcript record:', error);
      setUploadStatus('error');
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to create transcript: ${error.message || error}`,
      });
    }
  };

  const startProgressSimulation = () => {
    // Clear any existing interval
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
    }
    
    setUploadProgress(0);
    
    // Simulate progress
    progressIntervalRef.current = window.setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null) return 5;
        return prev < 85 ? prev + 5 : prev;
      });
    }, 300);
  };

  const stopProgressSimulation = () => {
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;
    
    // Check for duplicates first
    const shouldContinue = await checkForDuplicates(selectedFile);
    if (!shouldContinue) {
      toast({
        description: "Upload canceled.",
        variant: "default",
      });
      return;
    }
    
    setIsUploading(true);
    setUploadStatus('uploading');
    
    // Start progress simulation
    startProgressSimulation();
    
    try {
      const filePath = generateStoragePath(userId, selectedFile.name);
      
      // Upload the file without progress tracking
      const { error } = await supabase.storage
        .from('transcripts')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });
      
      // Stop progress simulation
      stopProgressSimulation();
      
      if (error) {
        if (error.message && error.message.includes('The resource already exists')) {
          setUploadStatus('error');
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
      
      // Set progress to 100% when done
      setUploadProgress(100);
      
      const publicURL = generatePublicUrl('transcripts', filePath);
      
      await createTranscript(selectedFile.name, '', filePath, publicURL);
      setSelectedFile(null);
      
      // Reset progress after showing 100% complete
      setTimeout(() => {
        setUploadProgress(null);
        setUploadStatus('idle');
      }, 2000);
      
    } catch (error: any) {
      stopProgressSimulation();
      setUploadStatus('error');
      setUploadProgress(null);
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
    stopProgressSimulation();
    setSelectedFile(null);
    setUploadProgress(null);
    setUploadStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderUploadStatus = () => {
    if (uploadStatus === 'success') {
      return (
        <Alert className="bg-green-50 border-green-200 mt-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Upload successful! Your transcript is being processed.
          </AlertDescription>
        </Alert>
      );
    } else if (uploadStatus === 'error') {
      return (
        <Alert className="bg-red-50 border-red-200 mt-2">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            Upload failed. Please try again.
          </AlertDescription>
        </Alert>
      );
    }
    return null;
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
        } ${selectedFile ? 'bg-secondary/10' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-3">
          {!selectedFile ? (
            <>
              <div className="p-3 rounded-full bg-secondary/50">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drag and drop your transcript file or
                </p>
                <Button 
                  variant="outline" 
                  className="mt-2 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Select File
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
                  <div className="p-2 mr-3 rounded-full bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium truncate max-w-[200px]">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={cancelUpload}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {uploadProgress !== null && (
                <div className="w-full mt-4 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{uploadStatus === 'success' ? 'Complete' : 'Uploading...'}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
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
      
      {renderUploadStatus()}
      
      <div className="flex justify-end">
        <Button
          onClick={uploadFile}
          disabled={!selectedFile || isUploading}
          className={`relative ${isUploading ? 'bg-primary/80' : ''}`}
        >
          {isUploading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
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
