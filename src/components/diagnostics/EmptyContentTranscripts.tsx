
import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import DiagnosticCard from './DiagnosticCard';
import { Transcript } from '@/utils/transcriptUtils';

interface EmptyContentTranscriptsProps {
  transcripts: Transcript[];
  selectedTranscripts: string[];
  onSelectAll: (transcripts: Transcript[], isSelected: boolean) => void;
  onSelectTranscript: (transcriptId: string, isSelected: boolean) => void;
  onFix: () => void;
  isProcessing: boolean;
  processingProgress: number;
}

/**
 * Displays and allows management of transcripts with empty content
 */
const EmptyContentTranscripts = ({
  transcripts,
  selectedTranscripts,
  onSelectAll,
  onSelectTranscript,
  onFix,
  isProcessing,
  processingProgress
}: EmptyContentTranscriptsProps) => {
  // Filter only transcripts with empty content
  const emptyContentTranscripts = transcripts.filter(
    t => !t.content || t.content.trim() === ''
  );
  
  if (!emptyContentTranscripts.length) {
    return null;
  }

  const allSelected = emptyContentTranscripts.length > 0 && 
    selectedTranscripts.length === emptyContentTranscripts.length;

  return (
    <DiagnosticCard
      title="Fix Empty Content"
      description="Transcripts with missing content"
      footer={
        <Button variant="default" onClick={onFix} disabled={isProcessing}>
          {isProcessing ? (
            <>
              Processing...
              <Progress value={processingProgress} className="ml-2 w-24" />
            </>
          ) : (
            "Fix Selected"
          )}
        </Button>
      }
    >
      <div className="flex items-center mb-2">
        <Checkbox
          id="select-all-empty"
          checked={allSelected}
          onCheckedChange={(checked) => onSelectAll(emptyContentTranscripts, !!checked)}
        />
        <Label htmlFor="select-all-empty" className="ml-2">
          Select All
        </Label>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Checkbox
                id="select-all-header-empty"
                checked={allSelected}
                onCheckedChange={(checked) => onSelectAll(emptyContentTranscripts, !!checked)}
              />
            </TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Created At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {emptyContentTranscripts.map((transcript) => (
            <TableRow key={transcript.id}>
              <TableCell>
                <Checkbox
                  id={`transcript-empty-${transcript.id}`}
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

export default EmptyContentTranscripts;
