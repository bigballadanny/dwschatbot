
import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import DiagnosticCard from './DiagnosticCard';
import { Transcript } from '@/utils/transcriptUtils';

interface UnprocessedTranscriptsProps {
  transcripts: Transcript[];
  selectedTranscripts: string[];
  onSelectAll: (transcripts: Transcript[], isSelected: boolean) => void;
  onSelectTranscript: (transcriptId: string, isSelected: boolean) => void;
  onProcess: () => void;
  isProcessing: boolean;
  processingProgress: number;
}

/**
 * Displays and allows management of unprocessed transcripts
 */
const UnprocessedTranscripts = ({
  transcripts,
  selectedTranscripts,
  onSelectAll,
  onSelectTranscript,
  onProcess,
  isProcessing,
  processingProgress
}: UnprocessedTranscriptsProps) => {
  if (!transcripts.length) {
    return null;
  }

  const allSelected = transcripts.length > 0 && selectedTranscripts.length === transcripts.length;

  return (
    <DiagnosticCard
      title="Unprocessed Transcripts"
      description="Transcripts that have not been processed yet"
      footer={
        <Button variant="default" onClick={onProcess} disabled={isProcessing}>
          {isProcessing ? (
            <>
              Processing...
              <Progress value={processingProgress} className="ml-2 w-24" />
            </>
          ) : (
            "Process Selected"
          )}
        </Button>
      }
    >
      <div className="flex items-center mb-2">
        <Checkbox
          id="select-all-unprocessed"
          checked={allSelected}
          onCheckedChange={(checked) => onSelectAll(transcripts, !!checked)}
        />
        <Label htmlFor="select-all-unprocessed" className="ml-2">
          Select All
        </Label>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Checkbox
                id="select-all-header"
                checked={allSelected}
                onCheckedChange={(checked) => onSelectAll(transcripts, !!checked)}
              />
            </TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Created At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transcripts.map((transcript) => (
            <TableRow key={transcript.id}>
              <TableCell>
                <Checkbox
                  id={`transcript-${transcript.id}`}
                  checked={selectedTranscripts.includes(transcript.id)}
                  onCheckedChange={(checked) => onSelectTranscript(transcript.id, !!checked)}
                />
              </TableCell>
              <TableCell>{transcript.title}</TableCell>
              <TableCell>{new Date(transcript.created_at).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DiagnosticCard>
  );
};

export default UnprocessedTranscripts;
