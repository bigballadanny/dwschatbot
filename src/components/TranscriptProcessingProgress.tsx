import React from 'react';
import { CheckCircle2, Clock, FileText, Loader2, Info, AlertTriangle } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { cn } from '@/lib/utils';

// Define the stages of transcript processing
export type ProcessingStage = 
  | 'upload'
  | 'extraction'
  | 'chunking'
  | 'embedding'
  | 'summarization'
  | 'completion';

export type ProcessingStatus = 
  | 'idle'       // Not started
  | 'processing' // In progress
  | 'completed'  // Successfully completed
  | 'failed'     // Failed
  | 'warning';   // Completed with warnings

export interface StageStatus {
  stage: ProcessingStage;
  status: ProcessingStatus;
  message?: string;
}

interface TranscriptProcessingProgressProps {
  stages: StageStatus[];
  className?: string;
  currentStage?: ProcessingStage | null;
  showLabels?: boolean;
  size?: 'sm' | 'default' | 'lg';
  vertical?: boolean;
  showDetails?: boolean;
}

const stageConfig = {
  upload: {
    label: 'Upload',
    description: 'Uploading transcript file',
    icon: FileText,
    order: 0,
  },
  extraction: {
    label: 'Extraction',
    description: 'Extracting content from file',
    icon: FileText,
    order: 1,
  },
  chunking: {
    label: 'Chunking',
    description: 'Breaking content into processable chunks',
    icon: FileText,
    order: 2,
  },
  embedding: {
    label: 'Embedding',
    description: 'Creating vector embeddings for search',
    icon: Clock,
    order: 3,
  },
  summarization: {
    label: 'Summarization',
    description: 'Generating summary and extracting key points',
    icon: Info,
    order: 4,
  },
  completion: {
    label: 'Completion',
    description: 'Processing complete',
    icon: CheckCircle2,
    order: 5,
  },
};

const TranscriptProcessingProgress: React.FC<TranscriptProcessingProgressProps> = ({
  stages,
  className,
  currentStage = null,
  showLabels = true,
  size = 'default',
  vertical = false,
  showDetails = false,
}) => {
  // Get the ordered stages
  const orderedStages = [...stages].sort(
    (a, b) => stageConfig[a.stage].order - stageConfig[b.stage].order
  );

  // Calculate the overall progress percentage
  const completedStages = stages.filter(s => s.status === 'completed' || s.status === 'warning').length;
  const processingStages = stages.filter(s => s.status === 'processing').length;
  const totalStages = stages.length;
  
  // Calculate progress percentage (completed + half of processing)
  const progressPercentage = 
    ((completedStages + (processingStages * 0.5)) / totalStages) * 100;

  // Determine the overall status
  const failedStages = stages.filter(s => s.status === 'failed').length;
  const warningStages = stages.filter(s => s.status === 'warning').length;
  
  const overallStatus = 
    failedStages > 0 ? 'failed' :
    completedStages === totalStages ? 'completed' :
    warningStages > 0 ? 'warning' :
    processingStages > 0 ? 'processing' : 'idle';

  // Get size configuration
  const sizeClasses = {
    sm: 'text-xs space-y-1',
    default: 'text-sm space-y-2',
    lg: 'text-base space-y-3',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    default: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  // Get status color classes
  const getStatusClasses = (status: ProcessingStatus) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'processing':
        return 'text-blue-600 dark:text-blue-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-amber-600 dark:text-amber-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const renderStageIcon = (stage: ProcessingStage, status: ProcessingStatus) => {
    const IconComponent = stageConfig[stage].icon;
    
    // Handle processing animation
    if (status === 'processing') {
      return <Loader2 className={`${iconSizes[size]} animate-spin ${getStatusClasses(status)}`} />;
    }
    
    return (
      <IconComponent className={`${iconSizes[size]} ${getStatusClasses(status)}`} />
    );
  };

  const renderProgressBar = () => {
    let progressColor = 'bg-blue-600';
    
    if (overallStatus === 'completed') {
      progressColor = 'bg-green-600';
    } else if (overallStatus === 'failed') {
      progressColor = 'bg-red-600';
    } else if (overallStatus === 'warning') {
      progressColor = 'bg-amber-600';
    }
    
    return (
      <div className="w-full mt-1 mb-3">
        <Progress 
          value={progressPercentage} 
          className={`h-1.5 ${progressColor}`}
        />
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>{Math.round(progressPercentage)}% complete</span>
          {overallStatus === 'processing' && <span>Processing...</span>}
          {overallStatus === 'completed' && <span>Completed</span>}
          {overallStatus === 'failed' && <span>Failed</span>}
          {overallStatus === 'warning' && <span>Completed with warnings</span>}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("w-full", className)}>
      {!vertical && renderProgressBar()}
      
      <div 
        className={cn(
          sizeClasses[size],
          vertical ? "flex flex-col space-y-2" : "flex justify-between items-center space-x-2"
        )}
      >
        {orderedStages.map((stage) => {
          const isCurrentStage = currentStage === stage.stage;
          const config = stageConfig[stage.stage];
          
          return (
            <div 
              key={stage.stage} 
              className={cn(
                "flex flex-col items-center",
                vertical ? "flex-row items-start space-x-3" : "flex-col",
                isCurrentStage ? "scale-105" : ""
              )}
            >
              <div 
                className={cn(
                  "flex items-center justify-center p-1.5 rounded-full",
                  stage.status === 'completed' ? "bg-green-100 dark:bg-green-950/40" : 
                  stage.status === 'processing' ? "bg-blue-100 dark:bg-blue-950/40 animate-pulse" : 
                  stage.status === 'failed' ? "bg-red-100 dark:bg-red-950/40" :
                  stage.status === 'warning' ? "bg-amber-100 dark:bg-amber-950/40" :
                  "bg-muted/30"
                )}
              >
                {renderStageIcon(stage.stage, stage.status)}
              </div>
              
              {showLabels && (
                <div className={cn(
                  "mt-1 text-center",
                  vertical ? "ml-2" : "",
                  getStatusClasses(stage.status)
                )}>
                  <div className="font-medium">{config.label}</div>
                  {showDetails && <div className="text-xs text-muted-foreground mt-0.5">{config.description}</div>}
                  {stage.message && <div className="text-xs italic mt-0.5">{stage.message}</div>}
                </div>
              )}
              
              {vertical && <div className={cn(
                "w-full h-1 my-2",
                stage.status === 'completed' ? "bg-green-200 dark:bg-green-800" : 
                stage.status === 'processing' ? "bg-blue-200 dark:bg-blue-800" : 
                stage.status === 'failed' ? "bg-red-200 dark:bg-red-800" :
                stage.status === 'warning' ? "bg-amber-200 dark:bg-amber-800" :
                "bg-muted/30"
              )} />}
            </div>
          );
        })}
      </div>
      
      {vertical && renderProgressBar()}
    </div>
  );
};

export default TranscriptProcessingProgress;