
import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import DiagnosticCard from './DiagnosticCard';
import { DiagnosticTranscript } from '@/utils/diagnostics/transcriptIssues';

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
          </TableRow>
        </TableHeader>
        <TableBody>
          {transcripts.map((transcript) => {
            // Calculate how long the transcript has been stuck
            let timeStuck = '';
            const processingStartedAt = transcript.metadata?.processing_started_at;
            
            if (processingStartedAt) {
              const startTime = new Date(processingStartedAt);
              const now = new Date();
              const diffMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
              timeStuck = `${diffMinutes} mins`;
            }
            
            return (
              <TableRow key={transcript.id}>
                <TableCell>{transcript.title}</TableCell>
                <TableCell>
                  {processingStartedAt 
                    ? new Date(processingStartedAt).toLocaleTimeString()
                    : 'Unknown'}
                </TableCell>
                <TableCell>{timeStuck || 'Unknown'}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </DiagnosticCard>
  );
};

export default StuckTranscripts;
