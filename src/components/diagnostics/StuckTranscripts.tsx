
import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import DiagnosticCard from './DiagnosticCard';
import { DiagnosticTranscript } from '@/utils/diagnostics/transcriptIssues';
import { formatDistanceToNow } from 'date-fns';

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
  if (!transcripts.length) {
    return null;
  }

  return (
    <DiagnosticCard
      title="Stuck In Processing"
      description="Transcripts that have been processing for more than 5 minutes"
      footer={
        <Button variant="destructive" onClick={onRetry} disabled={isProcessing}>
          {isProcessing ? (
            <>
              Retrying...
              <Progress value={processingProgress} className="ml-2 w-24" />
            </>
          ) : (
            "Retry Stuck Transcripts"
          )}
        </Button>
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
            
            // Safe access to metadata properties using type guards
            const metadata = transcript.metadata || {};
            const processingStartedAt = typeof metadata === 'object' 
              ? metadata.processing_started_at as string || null 
              : null;
            
            if (processingStartedAt) {
              startTime = new Date(processingStartedAt);
              timeStuck = formatDistanceToNow(startTime, { addSuffix: false });
              
              // Determine processing status - safely access metadata properties
              const retryCount = typeof metadata === 'object' 
                ? (metadata.retry_count as number) || 0 
                : 0;
              const processingFailed = typeof metadata === 'object' 
                ? !!metadata.processing_failed 
                : false;
              
              if (processingFailed) {
                status = `Failed${retryCount > 0 ? ` (${retryCount} retries)` : ''}`;
              } else if (retryCount > 0) {
                status = `Retried ${retryCount} times`;
              } else {
                status = 'Stuck';
              }
            }
            
            return (
              <TableRow key={transcript.id}>
                <TableCell>{transcript.title}</TableCell>
                <TableCell>
                  {startTime 
                    ? startTime.toLocaleString()
                    : 'Unknown'}
                </TableCell>
                <TableCell>{timeStuck || 'Unknown'}</TableCell>
                <TableCell>{status}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </DiagnosticCard>
  );
};

export default StuckTranscripts;
