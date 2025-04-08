
import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, Loader2, AlertTriangle, FileType, Info } from "lucide-react";

interface FileUploaderProps {
  onFileSelect: (files: FileList) => void;
  isUploading: boolean;
  uploadProgress?: number | null;
  acceptedFileTypes?: string;
  multiple?: boolean;
  showPreview?: boolean;
  className?: string;
}

const FileUploader = ({
  onFileSelect,
  isUploading,
  uploadProgress = null,
  acceptedFileTypes = ".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.jpg,.jpeg,.png,.mp3,.mp4,.wav",
  multiple = true,
  showPreview = true,
  className
}: FileUploaderProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
      onFileSelect(e.target.files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles(Array.from(e.dataTransfer.files));
      onFileSelect(e.dataTransfer.files);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('doc')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('audio')) return '🔊';
    if (mimeType.includes('video')) return '🎬';
    return '📁';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          type="file"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="hidden"
          accept={acceptedFileTypes}
          multiple={multiple}
        />
        
        <div className="flex flex-col items-center justify-center gap-2">
          <Upload className="h-10 w-10 text-gray-400" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {multiple ? 'Upload files' : 'Upload a file'}
            </p>
            <p className="text-xs text-muted-foreground">
              Drag and drop {multiple ? 'files' : 'a file'} or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supported formats: {acceptedFileTypes.replace(/\./g, '').split(',').join(', ')}
            </p>
          </div>
        </div>
      </div>

      {showPreview && selectedFiles.length > 0 && (
        <div className="space-y-2">
          <Label>Selected Files ({selectedFiles.length})</Label>
          <div className="max-h-40 overflow-y-auto border rounded-md p-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="text-sm text-muted-foreground flex items-center gap-2 py-1">
                <span>{getFileIcon(file.type)}</span>
                <span className="truncate max-w-xs">{file.name}</span>
                <span className="text-xs">({Math.round(file.size / 1024)} KB)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploadProgress !== null && (
        <Progress value={uploadProgress} className="w-full" />
      )}
    </div>
  );
};

export default FileUploader;
