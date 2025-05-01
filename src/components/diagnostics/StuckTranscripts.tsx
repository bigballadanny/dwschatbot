
import React, { useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import DiagnosticCard from './DiagnosticCard';
import { DiagnosticTranscript } from '@/utils/diagnostics/transcriptIssues';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StuckTranscriptsProps {
  transcripts: DiagnosticTranscript[];
  onRetry: () => void;
  isProcessing: boolean;
  processingProgress: number;
}

/**
 * Displays and allows management of transcripts stuck in processing
 */
const StuckTranscripts = ({
  transcripts,
  onRetry,
  isProcessing,
  processingProgress
}: StuckTranscriptsProps) => {
  const [currentStatus, setCurrentStatus] = useState<string>('');

  if (!transcripts.length) {
    return null;
  }

  // Helper function to determine status badge color
  const getStatusColor = (status: string): "destructive" | "secondary" | "default" | "outline" | "warning" => {
    if (status.includes('Failed')) return 'destructive';
    if (status.includes('Retried')) return 'warning';
    return 'secondary';
  };

  // Calculate total time stuck for all transcripts
  const totalStuckTime = transcripts.reduce((total, transcript) => {
    const metadata = transcript.metadata && 
      typeof transcript.metadata === 'object' && 
      !Array.isArray(transcript.metadata) 
        ? transcript.metadata as Record<string, any>
        : {};
    
    if (metadata.processing_started_at) {
      const startTime = new Date(metadata.processing_started_at as string);
      const stuckMs = Date.now() - startTime.getTime();
      return total + stuckMs;
    }
    return total;
  }, 0);
  
  const avgStuckTime = transcripts.length > 0 
    ? formatDistanceToNow(new Date(Date.now() - (totalStuckTime / transcripts.length)))
    : 'Unknown';

  const handleRetry = () => {
    setCurrentStatus('Starting retry process...');
    onRetry();
  };

  return (
    <DiagnosticCard
      title="Stuck In Processing"
      description={
        <div className="space-y-2">
          <p>Transcripts that have been processing for more than 5 minutes</p>
          <div className="flex text-sm items-center gap-2 text-muted-foreground">
            <span>Average stuck time: {avgStuckTime}</span>
            <span>•</span>
            <span>Total transcripts: {transcripts.length}</span>
          </div>
        </div>
      }
      footer={
        <div className="space-y-2 w-full">
          {currentStatus && (
            <div className="text-sm text-muted-foreground">{currentStatus}</div>
          )}
          <div className="flex items-center gap-2 w-full">
            <Button 
              variant="destructive" 
              onClick={handleRetry} 
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? "Retrying..." : "Retry Stuck Transcripts"}
            </Button>
            
            {isProcessing && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex-1">
                      <Progress 
                        value={processingProgress} 
                        className="w-full h-2"
                        // Use inline style instead of indicatorClassName
                        style={{
                          '--progress-indicator-color': processingProgress < 30 ? 'var(--red-500)' : 
                                                      processingProgress < 70 ? 'var(--yellow-500)' : 
                                                      'var(--green-500)'
                        } as React.CSSProperties}
                      />
                      <div className="text-xs mt-1 text-right text-muted-foreground">
                        {Math.round(processingProgress)}% complete
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Retrying {transcripts.length} transcript(s)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Started At</TableHead>
            <TableHead>Time Stuck</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transcripts.map((transcript) => {
            // Calculate how long the transcript has been stuck
            let timeStuck = '';
            let startTime: Date | null = null;
            let status = 'Unknown';
            
            // Safely check if metadata is a Record (object) and not an array
            const metadata = transcript.metadata && 
              typeof transcript.metadata === 'object' && 
              !Array.isArray(transcript.metadata) 
                ? transcript.metadata as Record<string, any>
                : {};
            
            // Now safely access properties from the metadata object
            const processingStartedAt = metadata.processing_started_at as string | undefined;
            
            if (processingStartedAt) {
              startTime = new Date(processingStartedAt);
              timeStuck = formatDistanceToNow(startTime, { addSuffix: false });
              
              // Determine processing status - safely access metadata properties
              const retryCount = metadata.retry_count as number | undefined || 0;
              const processingFailed = !!metadata.processing_failed;
              
              if (processingFailed) {
                status = `Failed${retryCount > 0 ? ` (${retryCount} retries)` : ''}`;
              } else if (retryCount > 0) {
                status = `Retried ${retryCount} times`;
              } else {
                status = 'Stuck';
              }
            }
            
            const statusColor = getStatusColor(status);
            
            return (
              <TableRow key={transcript.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{transcript.title}</TableCell>
                <TableCell>
                  {startTime 
                    ? startTime.toLocaleString()
                    : 'Unknown'}
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        {timeStuck || 'Unknown'}
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Processing started: {startTime?.toLocaleString() || 'Unknown'}</p>
                        {metadata.retry_triggered_at && (
                          <p>Last retry: {new Date(metadata.retry_triggered_at as string).toLocaleString()}</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>
                  <Badge variant={statusColor}>{status}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </DiagnosticCard>
  );
};

export default StuckTranscripts;
