import React from 'react';
import { Clock, CheckCircle2, AlertTriangle, Loader2, FileText, Info } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type TranscriptStatus = 
  | 'unprocessed'  // Not processed yet
  | 'processing'   // Currently being processed
  | 'processed'    // Successfully processed but not summarized
  | 'summarized'   // Processed and summarized
  | 'failed'       // Processing failed
  | 'empty'        // Empty content
  | 'stuck'        // Stuck in processing

interface TranscriptStatusIndicatorProps {
  status: TranscriptStatus;
  showText?: boolean;
  showTooltip?: boolean;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  onClick?: () => void;
  animateIcon?: boolean;
}

/**
 * A specialized component for displaying transcript processing status
 * with consistent visual indicators across the application
 */
const TranscriptStatusIndicator: React.FC<TranscriptStatusIndicatorProps> = ({
  status,
  showText = true,
  showTooltip = true,
  className,
  size = 'default',
  onClick,
  animateIcon = true
}) => {
  // Define the configuration for each status type
  const statusConfig = {
    unprocessed: {
      icon: <Clock className="h-3.5 w-3.5" />,
      text: 'Unprocessed',
      tooltip: 'This transcript has not been processed yet',
      badgeVariant: 'statusUnprocessed' as const,
      animation: animateIcon ? 'none' as const : 'none' as const
    },
    processing: {
      icon: <Loader2 className="h-3.5 w-3.5" />,
      text: 'Processing',
      tooltip: 'This transcript is currently being processed',
      badgeVariant: 'statusUnprocessed' as const,
      animation: animateIcon ? 'pulse' as const : 'none' as const
    },
    processed: {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      text: 'Processed',
      tooltip: 'This transcript has been successfully processed',
      badgeVariant: 'statusProcessed' as const,
      animation: 'none' as const
    },
    summarized: {
      icon: <Info className="h-3.5 w-3.5" />,
      text: 'Summarized',
      tooltip: 'This transcript has been processed and summarized',
      badgeVariant: 'statusSummarized' as const,
      animation: 'none' as const
    },
    failed: {
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      text: 'Failed',
      tooltip: 'Processing this transcript encountered an error',
      badgeVariant: 'statusFailed' as const,
      animation: 'none' as const
    },
    empty: {
      icon: <FileText className="h-3.5 w-3.5" />,
      text: 'Empty',
      tooltip: 'This transcript has no content',
      badgeVariant: 'statusFailed' as const,
      animation: 'none' as const
    },
    stuck: {
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      text: 'Stuck',
      tooltip: 'This transcript appears to be stuck in processing',
      badgeVariant: 'statusFailed' as const,
      animation: animateIcon ? 'pulse' as const : 'none' as const
    }
  };

  const config = statusConfig[status];
  
  const indicator = (
    <Badge 
      variant={config.badgeVariant}
      size={size}
      className={cn(
        "whitespace-nowrap",
        onClick ? "cursor-pointer" : "",
        className
      )}
      animation={config.animation}
      icon={config.icon}
      onClick={onClick}
    >
      {showText && config.text}
    </Badge>
  );

  // Wrap in tooltip if needed
  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {indicator}
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return indicator;
};

export default TranscriptStatusIndicator;