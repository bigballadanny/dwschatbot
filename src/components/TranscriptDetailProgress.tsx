import React, { useState, useEffect } from 'react';
import TranscriptProcessingProgress, { 
  ProcessingStage, 
  ProcessingStatus, 
  StageStatus 
} from './TranscriptProcessingProgress';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TranscriptDetailProgressProps {
  transcriptId: string;
  metadata?: Record<string, any> | null;
  isProcessed?: boolean;
  isSummarized?: boolean;
  onRefresh?: () => void;
  className?: string;
}

const TranscriptDetailProgress: React.FC<TranscriptDetailProgressProps> = ({
  transcriptId,
  metadata = null,
  isProcessed = false,
  isSummarized = false,
  onRefresh,
  className
}) => {
  const [stages, setStages] = useState<StageStatus[]>([]);
  const [currentStage, setCurrentStage] = useState<ProcessingStage | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate stages based on transcript status and metadata
  useEffect(() => {
    const newStages: StageStatus[] = [];
    
    // Upload stage is always completed for existing transcripts
    newStages.push({
      stage: 'upload',
      status: 'completed'
    });
    
    // Processing stages
    if (metadata) {
      // Check for errors in extraction
      const extractionFailed = metadata.extraction_error || false;
      newStages.push({
        stage: 'extraction',
        status: extractionFailed ? 'failed' : 'completed',
        message: extractionFailed ? metadata.extraction_error : undefined
      });

      // Chunking stage
      const chunkingComplete = metadata.chunking_completed || false;
      const chunkingFailed = metadata.chunking_error || false;
      const chunkingWarning = metadata.chunking_warning || false;
      let chunkingStatus: ProcessingStatus = 'idle';
      
      if (chunkingFailed) {
        chunkingStatus = 'failed';
      } else if (chunkingComplete) {
        chunkingStatus = chunkingWarning ? 'warning' : 'completed';
      } else if (metadata.chunking_started_at) {
        chunkingStatus = 'processing';
      }
      
      newStages.push({
        stage: 'chunking',
        status: chunkingStatus,
        message: chunkingFailed ? metadata.chunking_error : 
                 chunkingWarning ? metadata.chunking_warning : undefined
      });

      // Embedding stage
      const embeddingComplete = metadata.embedding_completed || false;
      const embeddingFailed = metadata.embedding_error || false;
      let embeddingStatus: ProcessingStatus = 'idle';
      
      if (embeddingFailed) {
        embeddingStatus = 'failed';
      } else if (embeddingComplete) {
        embeddingStatus = 'completed';
      } else if (metadata.embedding_started_at) {
        embeddingStatus = 'processing';
      } else if (chunkingComplete) {
        embeddingStatus = 'idle';
      }
      
      newStages.push({
        stage: 'embedding',
        status: embeddingStatus,
        message: embeddingFailed ? metadata.embedding_error : undefined
      });
    } else {
      // If no metadata, add basic stages based on isProcessed
      newStages.push({
        stage: 'extraction',
        status: isProcessed ? 'completed' : 'processing'
      });
      
      newStages.push({
        stage: 'chunking',
        status: isProcessed ? 'completed' : 'idle'
      });
      
      newStages.push({
        stage: 'embedding',
        status: isProcessed ? 'completed' : 'idle'
      });
    }
    
    // Summarization stage
    if (metadata?.summarization_error) {
      newStages.push({
        stage: 'summarization',
        status: 'failed',
        message: metadata.summarization_error
      });
    } else if (isSummarized) {
      newStages.push({
        stage: 'summarization',
        status: 'completed'
      });
    } else if (metadata?.summarization_started_at && !isSummarized) {
      newStages.push({
        stage: 'summarization',
        status: 'processing'
      });
    } else if (isProcessed) {
      newStages.push({
        stage: 'summarization',
        status: 'idle'
      });
    }
    
    // Completion stage
    const hasErrors = newStages.some(s => s.status === 'failed');
    const hasWarnings = newStages.some(s => s.status === 'warning');
    const isComplete = isProcessed && isSummarized;
    
    let completionStatus: ProcessingStatus = 'idle';
    if (isComplete) {
      completionStatus = hasErrors ? 'failed' : hasWarnings ? 'warning' : 'completed';
    } else if (isProcessed) {
      completionStatus = hasErrors ? 'failed' : 'idle';
    }
    
    newStages.push({
      stage: 'completion',
      status: completionStatus
    });
    
    // Determine current stage
    let processingStages = newStages.filter(s => s.status === 'processing');
    if (processingStages.length > 0) {
      setCurrentStage(processingStages[0].stage);
    } else if (!isProcessed) {
      setCurrentStage('embedding');
    } else if (!isSummarized) {
      setCurrentStage('summarization');
    } else {
      setCurrentStage('completion');
    }
    
    setStages(newStages);
  }, [metadata, isProcessed, isSummarized]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (onRefresh) {
      onRefresh();
      setTimeout(() => setIsRefreshing(false), 1000);
    } else {
      setIsRefreshing(false);
    }
  };

  return (
    <Card className={cn("border", className)}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Processing Status</CardTitle>
          {onRefresh && (
            <Button 
              variant="ghost" 
              size="iconSm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <TranscriptProcessingProgress 
          stages={stages}
          currentStage={currentStage}
          showLabels={true}
          size="default"
          showDetails={true}
        />
      </CardContent>
    </Card>
  );
};

export default TranscriptDetailProgress;