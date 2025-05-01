
import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import DiagnosticCard from './DiagnosticCard';
import { Transcript } from '@/utils/transcriptUtils';

interface MaintenanceTabProps {
  unprocessedTranscripts: Transcript[];
  onMarkAsProcessed: (transcriptId: string) => void;
}

/**
 * Displays and allows maintenance operations on transcripts
 */
const MaintenanceTab = ({ unprocessedTranscripts, onMarkAsProcessed }: MaintenanceTabProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Maintenance</h3>
      
      <DiagnosticCard 
        title="Mark as Processed" 
        description="Manually mark a transcript as processed"
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
            {unprocessedTranscripts.map((transcript) => (
              <TableRow key={transcript.id}>
                <TableCell>{transcript.title}</TableCell>
                <TableCell>{new Date(transcript.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onMarkAsProcessed(transcript.id)}
                  >
                    Mark as Processed
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DiagnosticCard>
    </div>
  );
};

export default MaintenanceTab;
