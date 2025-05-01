
import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DiagnosticCard from './DiagnosticCard';
import { Transcript } from '@/utils/transcriptUtils';

interface PotentialSummitTranscriptsProps {
  transcripts: Transcript[];
  onUpdateSource: (transcriptId: string, sourceType: string) => void;
}

/**
 * Displays and allows management of potential summit transcripts
 */
const PotentialSummitTranscripts = ({ transcripts, onUpdateSource }: PotentialSummitTranscriptsProps) => {
  if (!transcripts.length) {
    return null;
  }

  return (
    <DiagnosticCard 
      title="Potential Summit Transcripts" 
      description="Transcripts uploaded on the 27th but not marked as summit"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transcripts.map((transcript) => (
            <TableRow key={transcript.id}>
              <TableCell>{transcript.title}</TableCell>
              <TableCell>{new Date(transcript.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <Select onValueChange={(value) => onUpdateSource(transcript.id, value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Update Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business_acquisitions_summit">Business Summit</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DiagnosticCard>
  );
};

export default PotentialSummitTranscripts;
