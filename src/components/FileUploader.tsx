
import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, Loader2, AlertTriangle, FileType } from "lucide-react";

interface FileUploaderProps {
  onFileSelect: (files: FileList) => void;
  isUploading: boolean;
  uploadProgress?: number | null;
  acceptedFileTypes?: string;
  multiple?: boolean;
  showPreview?: boolean;
}

const FileUploader = ({
  onFileSelect,
  isUploading,
  uploadProgress = null,
  acceptedFileTypes = ".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.jpg,.jpeg,.png,.mp3,.mp4,.wav",
  multiple = true,
  showPreview = true
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
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="file">Select File{multiple ? '(s)' : ''}</Label>
        <Input
          type="file"
          id="file"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="cursor-pointer"
          accept={acceptedFileTypes}
          multiple={multiple}
        />
      </div>

      {showPreview && selectedFiles.length > 0 && (
        <div className="space-y-2">
          <Label>Selected Files ({selectedFiles.length})</Label>
          <div className="max-h-32 overflow-y-auto border rounded-md p-2">
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

      <Button
        onClick={handleClick}
        disabled={isUploading}
        className="w-full"
        variant="outline"
      >
        {isUploading ? (
          <span className="flex items-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading... {uploadProgress !== null ? `${uploadProgress}%` : ''}
          </span>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            {multiple ? 'Choose Files' : 'Choose File'}
          </>
        )}
      </Button>

      {uploadProgress !== null && (
        <Progress value={uploadProgress} className="w-full" />
      )}
    </div>
  );
};

export default FileUploader;
