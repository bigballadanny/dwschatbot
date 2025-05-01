
import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import DiagnosticCard from './DiagnosticCard';

interface TranscriptStatistics {
  total: number;
  emptyContent: number;
  missingFilePath: number;
  recentlyUploaded: number;
  businessSummitTranscripts: number;
  potentialSummitTranscripts: number;
  unprocessedTranscripts: number;
  processingFailures: number;
  stuckInProcessing: number;
}

interface IssuesSummaryProps {
  stats: TranscriptStatistics;
}

/**
 * Displays a summary of transcript issues and statistics
 */
const IssuesSummary = ({ stats }: IssuesSummaryProps) => {
  return (
    <DiagnosticCard title="Summary">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Issue</TableHead>
            <TableHead className="text-right">Count</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Total Transcripts</TableCell>
            <TableCell className="text-right">{stats.total}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Empty Content</TableCell>
            <TableCell className="text-right">{stats.emptyContent}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Missing File Path</TableCell>
            <TableCell className="text-right">{stats.missingFilePath}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Recently Uploaded (last hour)</TableCell>
            <TableCell className="text-right">{stats.recentlyUploaded}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Business Summit Transcripts</TableCell>
            <TableCell className="text-right">{stats.businessSummitTranscripts}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Potential Summit Transcripts</TableCell>
            <TableCell className="text-right">{stats.potentialSummitTranscripts}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Unprocessed Transcripts</TableCell>
            <TableCell className="text-right">{stats.unprocessedTranscripts}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Processing Failures</TableCell>
            <TableCell className="text-right">{stats.processingFailures}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Stuck In Processing</TableCell>
            <TableCell className="text-right">{stats.stuckInProcessing}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </DiagnosticCard>
  );
};

export default IssuesSummary;
