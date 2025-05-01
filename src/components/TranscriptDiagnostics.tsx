
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, FileCheck, Settings } from 'lucide-react';
import { toast } from "sonner";
import { Separator } from '@/components/ui/separator';
import DiagnosticCard from '@/components/diagnostics/DiagnosticCard';
import DiagnosticCardSimple from '@/components/diagnostics/DiagnosticCardSimple';
import IssuesSummary from '@/components/diagnostics/IssuesSummary';
import UnprocessedTranscripts from '@/components/diagnostics/UnprocessedTranscripts';
import StuckTranscripts from '@/components/diagnostics/StuckTranscripts';
import EmptyContentTranscripts from '@/components/diagnostics/EmptyContentTranscripts';
import PotentialSummitTranscripts from '@/components/diagnostics/PotentialSummitTranscripts';
import MaintenanceTab from '@/components/diagnostics/MaintenanceTab';

import { 
  checkForTranscriptIssues,
  fixTranscriptIssues
} from '@/utils/diagnostics';
import { DiagnosticTranscript } from '@/utils/diagnostics/transcriptIssues';

const TranscriptDiagnostics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState<any>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  
  // Selected transcripts state
  const [selectedUnprocessed, setSelectedUnprocessed] = useState<string[]>([]);
  const [selectedEmptyContent, setSelectedEmptyContent] = useState<string[]>([]);
  const [processingUnprocessed, setProcessingUnprocessed] = useState(false);
  const [processingEmpty, setProcessingEmpty] = useState(false);
  const [processingStuck, setProcessingStuck] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const diagnosticsResults = await checkForTranscriptIssues();
      setIssues(diagnosticsResults);
      toast.success("Diagnostics completed successfully");
    } catch (error) {
      toast.error(`Error running diagnostics: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error("Diagnostics error:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkSystemHealth = async () => {
    try {
      const health = await fetch('/api/check-system-health');
      const healthData = await health.json();
      setHealthStatus(healthData);
      
      if (healthData.healthy) {
        toast.success("System appears to be healthy");
      } else {
        toast.warning(`Found ${healthData.issues?.length || 0} system health issues`);
      }
    } catch (error) {
      toast.error(`Error checking system health: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error("Health check error:", error);
    }
  };

  // Handle transcript selection
  const handleSelectTranscript = (id: string, isSelected: boolean, type: 'unprocessed' | 'empty') => {
    if (type === 'unprocessed') {
      setSelectedUnprocessed(prev => 
        isSelected ? [...prev, id] : prev.filter(item => item !== id)
      );
    } else {
      setSelectedEmptyContent(prev => 
        isSelected ? [...prev, id] : prev.filter(item => item !== id)
      );
    }
  };

  // Handle select all
  const handleSelectAll = (transcripts: DiagnosticTranscript[], isSelected: boolean, type: 'unprocessed' | 'empty') => {
    if (type === 'unprocessed') {
      setSelectedUnprocessed(isSelected ? transcripts.map(t => t.id) : []);
    } else {
      setSelectedEmptyContent(isSelected ? transcripts.map(t => t.id) : []);
    }
  };

  // Handle force processing
  const handleForceProcess = async () => {
    if (selectedUnprocessed.length === 0) {
      toast.warning("No transcripts selected to process");
      return;
    }

    setProcessingUnprocessed(true);
    setProcessingProgress(0);
    
    try {
      // Process in batches for better UX
      const batchSize = 5;
      let processed = 0;
      
      for (let i = 0; i < selectedUnprocessed.length; i += batchSize) {
        const batch = selectedUnprocessed.slice(i, i + batchSize);
        await Promise.all(batch.map(id => fetch(`/api/force-process-transcript?id=${id}`)));
        
        processed += batch.length;
        setProcessingProgress(Math.round((processed / selectedUnprocessed.length) * 100));
      }
      
      toast.success(`Successfully processed ${processed} transcripts`);
      runDiagnostics(); // Refresh the data
    } catch (error) {
      toast.error(`Error processing transcripts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessingUnprocessed(false);
      setSelectedUnprocessed([]);
    }
  };

  // Handle fix empty content
  const handleFixEmptyContent = async () => {
    if (selectedEmptyContent.length === 0) {
      toast.warning("No transcripts selected to fix");
      return;
    }

    setProcessingEmpty(true);
    setProcessingProgress(0);
    
    try {
      const result = await fixTranscriptIssues(selectedEmptyContent);
      
      toast.success(`Fixed ${result.success} transcripts`);
      
      if (result.errors.length > 0) {
        console.error("Errors fixing transcripts:", result.errors);
        toast.error(`${result.errors.length} errors occurred. Check console for details.`);
      }
      
      runDiagnostics(); // Refresh the data
    } catch (error) {
      toast.error(`Error fixing transcripts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessingEmpty(false);
      setSelectedEmptyContent([]);
    }
  };

  // Handle retry stuck transcripts
  const handleRetryStuck = async () => {
    if (!issues?.stuckInProcessing?.length) {
      toast.warning("No stuck transcripts to retry");
      return;
    }

    setProcessingStuck(true);
    setProcessingProgress(0);
    
    try {
      const stuckIds = issues.stuckInProcessing.map((t: DiagnosticTranscript) => t.id);
      
      // Process in batches
      const batchSize = 5;
      let processed = 0;
      
      for (let i = 0; i < stuckIds.length; i += batchSize) {
        const batch = stuckIds.slice(i, i + batchSize);
        await Promise.all(batch.map(id => fetch(`/api/retry-transcript?id=${id}`)));
        
        processed += batch.length;
        setProcessingProgress(Math.round((processed / stuckIds.length) * 100));
      }
      
      toast.success(`Successfully retried ${processed} transcripts`);
      runDiagnostics(); // Refresh the data
    } catch (error) {
      toast.error(`Error retrying transcripts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessingStuck(false);
    }
  };

  // Handle update transcript source
  const handleUpdateSource = async (transcriptId: string, sourceType: string) => {
    try {
      const response = await fetch('/api/update-transcript-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: transcriptId, source: sourceType })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update transcript source: ${response.statusText}`);
      }
      
      toast.success(`Successfully updated transcript source to ${sourceType}`);
      runDiagnostics(); // Refresh the data
    } catch (error) {
      toast.error(`Error updating source: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Transcript Diagnostics</h1>
          <p className="text-muted-foreground mt-1">
            Troubleshoot and fix issues with transcript processing
          </p>
        </div>
        <div className="space-x-2">
          <Button 
            variant="outline"
            onClick={checkSystemHealth} 
            disabled={loading}
          >
            <Settings className="h-4 w-4 mr-2" />
            Check System Health
          </Button>
          <Button 
            onClick={runDiagnostics} 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <FileCheck className="h-4 w-4 mr-2" />
                Run Diagnostics
              </>
            )}
          </Button>
        </div>
      </div>
      
      {healthStatus && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center">
              System Health
              {healthStatus.healthy ? (
                <span className="text-green-500 ml-2">(Healthy)</span>
              ) : (
                <span className="text-amber-500 ml-2">(Issues Detected)</span>
              )}
            </CardTitle>
            <CardDescription>Status of the transcript processing system</CardDescription>
          </CardHeader>
          <CardContent>
            {healthStatus.issues && healthStatus.issues.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-3 mb-4">
                <h3 className="flex items-center text-amber-800 dark:text-amber-300 font-medium">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Issues Detected
                </h3>
                <ul className="list-disc pl-5 mt-2 text-amber-700 dark:text-amber-400">
                  {healthStatus.issues.map((issue: string, i: number) => (
                    <li key={i} className="text-sm">{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {healthStatus.details && healthStatus.details.statistics && (
              <div>
                <h3 className="font-medium mb-2">System Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <DiagnosticCardSimple 
                    title="Total Transcripts" 
                    value={healthStatus.details.statistics.total} 
                  />
                  <DiagnosticCardSimple 
                    title="Processed" 
                    value={`${healthStatus.details.statistics.processed} (${healthStatus.details.statistics.processedPercent}%)`} 
                  />
                  <DiagnosticCardSimple 
                    title="Unprocessed" 
                    value={healthStatus.details.statistics.unprocessed}
                    variant={healthStatus.details.statistics.unprocessed > 0 ? "warning" : "default"}
                  />
                  <DiagnosticCardSimple 
                    title="Summarized" 
                    value={healthStatus.details.statistics.summarized} 
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Detailed Issues</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          {issues ? (
            <div className="space-y-6">
              <IssuesSummary stats={issues.stats} />
              
              <Separator className="my-6" />
              
              {issues.unprocessedTranscripts.length > 0 && (
                <>
                  <h2 className="text-xl font-semibold">Unprocessed Transcripts</h2>
                  <p className="text-muted-foreground mb-4">
                    The following transcripts need to be processed.
                  </p>
                  <UnprocessedTranscripts 
                    transcripts={issues.unprocessedTranscripts} 
                    selectedTranscripts={selectedUnprocessed}
                    onSelectAll={(transcripts, isSelected) => handleSelectAll(transcripts, isSelected, 'unprocessed')}
                    onSelectTranscript={(id, isSelected) => handleSelectTranscript(id, isSelected, 'unprocessed')}
                    onProcess={handleForceProcess}
                    isProcessing={processingUnprocessed}
                    processingProgress={processingProgress}
                  />
                </>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-6">
                  <p className="text-muted-foreground">
                    Run diagnostics to check for transcript issues
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="details">
          {issues ? (
            <div className="space-y-6">
              {issues.emptyContentTranscripts?.length > 0 && (
                <>
                  <h2 className="text-xl font-semibold">Empty Content Transcripts</h2>
                  <EmptyContentTranscripts 
                    transcripts={issues.emptyContentTranscripts}
                    selectedTranscripts={selectedEmptyContent}
                    onSelectAll={(transcripts, isSelected) => handleSelectAll(transcripts, isSelected, 'empty')}
                    onSelectTranscript={(id, isSelected) => handleSelectTranscript(id, isSelected, 'empty')}
                    onFix={handleFixEmptyContent}
                    isProcessing={processingEmpty}
                    processingProgress={processingProgress}
                  />
                </>
              )}
              
              {issues.stuckInProcessing?.length > 0 && (
                <>
                  <h2 className="text-xl font-semibold mt-6">Stuck in Processing</h2>
                  <StuckTranscripts 
                    transcripts={issues.stuckInProcessing}
                    onRetry={handleRetryStuck}
                    isProcessing={processingStuck}
                    processingProgress={processingProgress}
                  />
                </>
              )}
              
              {issues.potentialSummitTranscripts?.length > 0 && (
                <>
                  <h2 className="text-xl font-semibold mt-6">Potential Summit Transcripts</h2>
                  <PotentialSummitTranscripts 
                    transcripts={issues.potentialSummitTranscripts}
                    onUpdateSource={handleUpdateSource}
                  />
                </>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-6">
                  <p className="text-muted-foreground">
                    Run diagnostics to see detailed issues
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="maintenance">
          <MaintenanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TranscriptDiagnostics;
