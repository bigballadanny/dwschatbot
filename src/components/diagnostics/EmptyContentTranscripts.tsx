
import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import DiagnosticCard from './DiagnosticCard';
import { DiagnosticTranscript } from '@/utils/diagnostics/transcriptIssues';

interface EmptyContentTranscriptsProps {
  transcripts: DiagnosticTranscript[];
  selectedTranscripts: string[];
  onSelectAll: (transcripts: DiagnosticTranscript[], isSelected: boolean) => void;
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
  if (!transcripts.length) {
    return null;
  }

  const allSelected = transcripts.length > 0 && 
    selectedTranscripts.length === transcripts.length;

  return (
    <DiagnosticCard
      title="Fix Empty Content"
      description="Transcripts with missing content"
      footer={
        <Button variant="default" onClick={onFix} disabled={isProcessing || selectedTranscripts.length === 0}>
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
          onCheckedChange={(checked) => onSelectAll(transcripts, !!checked)}
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
                onCheckedChange={(checked) => onSelectAll(transcripts, !!checked)}
              />
            </TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Has File Path</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transcripts.map((transcript) => (
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
              <TableCell>{transcript.file_path ? 'Yes' : 'No'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DiagnosticCard>
  );
};

export default EmptyContentTranscripts;
