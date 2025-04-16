
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateFileIcon } from "@/utils/transcriptUtils";
import { LucideIcon, File } from 'lucide-react';
import { Play, Info, Sparkles, Check } from 'lucide-react';
import TranscriptSummary from './TranscriptSummary';

interface TranscriptDiagnosticsProps {
  open?: boolean;
  onClose: () => void;
  onComplete?: () => void;
  transcript?: any;
  userId?: string;
}

const TranscriptDiagnostics: React.FC<TranscriptDiagnosticsProps> = ({
  open = false,
  onClose,
  onComplete,
  transcript,
  userId = ''
}) => {
  const [fileIcon, setFileIcon] = useState<LucideIcon>(() => File);
  const [defaultTab, setDefaultTab] = useState<string>('content');
  
  useEffect(() => {
    if (transcript?.file_path) {
      const fileType = transcript.file_type || 'text';
      const iconName = generateFileIcon(fileType);
      import('lucide-react').then(module => {
        const icon = module[iconName.charAt(0).toUpperCase() + iconName.slice(1)] || File;
        setFileIcon(icon);
      });
    }
    
    // If the transcript has been summarized, set the default tab to summary
    if (transcript?.is_summarized) {
      setDefaultTab('summary');
    } else {
      setDefaultTab('content');
    }
  }, [transcript]);

  if (!transcript) return null;

  const handleClose = () => {
    onClose();
    if (onComplete) onComplete();
  };

  const renderFileInfo = () => {
    if (!transcript.file_path) return null;

    return (
      <div className="mb-4 flex items-center">
        <Badge variant="secondary" className="flex items-center gap-1 text-xs">
          <Info className="w-3 h-3" />
          File: {transcript.file_path.split('/').pop()}
        </Badge>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {fileIcon && React.createElement(fileIcon, { className: "w-5 h-5" })}
            <span className="truncate">{transcript.title}</span>
            {transcript.is_summarized && (
              <Badge variant="secondary" className="ml-2 flex items-center gap-1 text-xs">
                <Sparkles className="w-3 h-3" />
                Summarized
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {renderFileInfo()}
        
        <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col">
          <div className="border-b mb-4">
            <TabsList>
              <TabsTrigger value="content">Transcript Content</TabsTrigger>
              <TabsTrigger value="summary">
                AI Summary
                {transcript.is_summarized && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 flex items-center justify-center p-0">
                    <Check className="h-3 w-3" />
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="content" className="flex-1 overflow-y-auto">
            <pre className="whitespace-pre-wrap p-4 border rounded-md bg-muted/20">
              {transcript.content || 'No content available.'}
            </pre>
          </TabsContent>
          
          <TabsContent value="summary" className="flex-1 overflow-y-auto">
            <TranscriptSummary 
              transcriptId={transcript.id} 
              userId={userId} 
            />
          </TabsContent>
          
          <TabsContent value="metadata" className="flex-1 overflow-y-auto">
            <div className="p-4 border rounded-md bg-muted/20">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Source</h3>
                  <p className="text-sm">{transcript.source || 'Unknown'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">Created</h3>
                  <p className="text-sm">{new Date(transcript.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">Updated</h3>
                  <p className="text-sm">{new Date(transcript.updated_at).toLocaleString()}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">ID</h3>
                  <p className="text-sm">{transcript.id}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">Size</h3>
                  <p className="text-sm">{transcript.content ? Math.round(transcript.content.length / 1000) : 0} KB</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1">Processing Status</h3>
                  <p className="text-sm">{transcript.is_processed ? 'Processed' : 'Not processed'}</p>
                </div>
              </div>
              
              {transcript.tags && transcript.tags.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {transcript.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleClose}>Close</Button>
          {transcript.content && (
            <Button variant="default" onClick={() => window.open(transcript.file_path, '_blank')}>
              <Play className="mr-2 h-4 w-4" />
              Open Original
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TranscriptDiagnostics;

