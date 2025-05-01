
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Import our new diagnostic components
import IssuesSummary from './diagnostics/IssuesSummary';
import PotentialSummitTranscripts from './diagnostics/PotentialSummitTranscripts';
import UnprocessedTranscripts from './diagnostics/UnprocessedTranscripts';
import StuckTranscripts from './diagnostics/StuckTranscripts';
import EmptyContentTranscripts from './diagnostics/EmptyContentTranscripts';
import MaintenanceTab from './diagnostics/MaintenanceTab';

// Import all utilities from the new diagnostics index
import { 
  checkForTranscriptIssues,
  fixTranscriptIssues,
  manuallyProcessTranscripts,
  updateTranscriptSourceType,
  markTranscriptAsProcessed,
  retryStuckTranscripts
} from "@/utils/diagnostics";

import { showSuccess, showError, showWarning } from "@/utils/toastUtils";

const TranscriptDiagnostics = () => {
  const [activeTab, setActiveTab] = useState("issues");
  const [transcriptIssues, setTranscriptIssues] = useState<any>(null);
  const [isTranscriptIssuesLoading, setIsTranscriptIssuesLoading] = useState(false);
  const [selectedTranscripts, setSelectedTranscripts] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // Check transcript issues on mount
  useEffect(() => {
    checkIssues();
  }, []);
  
  const checkIssues = async () => {
    setIsTranscriptIssuesLoading(true);
    try {
      const issues = await checkForTranscriptIssues();
      setTranscriptIssues(issues);
      setSelectedTranscripts([]);
    } catch (error) {
      console.error("Failed to check transcript issues:", error);
      showError("Error", "Failed to check transcript issues");
    } finally {
      setIsTranscriptIssuesLoading(false);
    }
  };
  
  const handleFixSelectedTranscripts = async () => {
    if (!selectedTranscripts.length) return;
    
    setIsProcessing(true);
    setProcessingProgress(0);
    
    try {
      const result = await fixTranscriptIssues(selectedTranscripts);
      
      if (result.errors.length) {
        showWarning(
          "Process Completed with Errors", 
          `Fixed ${result.success} transcripts, but encountered ${result.errors.length} errors.`
        );
      } else {
        showSuccess(
          "Process Completed", 
          `Successfully fixed ${result.success} transcripts.`
        );
      }
      
      // Refresh the issues list
      checkIssues();
    } catch (error) {
      console.error("Failed to fix transcripts:", error);
      showError("Error", "Failed to fix selected transcripts");
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleProcessSelectedTranscripts = async () => {
    if (!selectedTranscripts.length) return;
    
    setIsProcessing(true);
    setProcessingProgress(0);
    
    try {
      const result = await manuallyProcessTranscripts(selectedTranscripts);
      
      if (result.errors.length) {
        showWarning(
          "Process Completed with Errors", 
          `Processed ${result.success} transcripts, but encountered ${result.errors.length} errors.`
        );
      } else {
        showSuccess(
          "Process Completed", 
          `Successfully processed ${result.success} transcripts.`
        );
      }
      
      // Refresh the issues list
      checkIssues();
    } catch (error) {
      console.error("Failed to process transcripts:", error);
      showError("Error", "Failed to process selected transcripts");
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleRetryStuckTranscripts = async () => {
    if (!transcriptIssues?.stuckInProcessing.length) return;
    
    const stuckIds = transcriptIssues.stuckInProcessing.map((t: any) => t.id);
    
    setIsProcessing(true);
    setProcessingProgress(0);
    
    try {
      const result = await retryStuckTranscripts(stuckIds);
      
      if (result.errors.length) {
        showWarning(
          "Retry Completed with Errors", 
          `Retried ${result.success} transcripts, but encountered ${result.errors.length} errors.`
        );
      } else {
        showSuccess(
          "Retry Completed", 
          `Successfully reset and retried ${result.success} stuck transcripts.`
        );
      }
      
      // Refresh the issues list
      checkIssues();
    } catch (error) {
      console.error("Failed to retry stuck transcripts:", error);
      showError("Error", "Failed to retry stuck transcripts");
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleUpdateSourceType = async (transcriptId: string, sourceType: string) => {
    try {
      await updateTranscriptSourceType(transcriptId, sourceType);
      showSuccess("Source Updated", "Successfully updated transcript source");
      
      // Refresh the issues list
      checkIssues();
    } catch (error) {
      console.error("Failed to update source type:", error);
      showError("Error", "Failed to update transcript source type");
    }
  };
  
  const handleMarkAsProcessed = async (transcriptId: string) => {
    try {
      await markTranscriptAsProcessed(transcriptId);
      showSuccess("Transcript Updated", "Successfully marked transcript as processed");
      
      // Refresh the issues list
      checkIssues();
    } catch (error) {
      console.error("Failed to mark as processed:", error);
      showError("Error", "Failed to mark transcript as processed");
    }
  };
  
  const handleSelectTranscript = (transcriptId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedTranscripts(prev => [...prev, transcriptId]);
    } else {
      setSelectedTranscripts(prev => prev.filter(id => id !== transcriptId));
    }
  };
  
  const handleSelectAll = (transcripts: any[], isSelected: boolean) => {
    if (isSelected) {
      setSelectedTranscripts(transcripts.map(t => t.id));
    } else {
      setSelectedTranscripts([]);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-2">Transcript Processing Diagnostics</h2>
        <p className="text-muted-foreground mb-4">
          Troubleshoot and manage transcript processing issues
        </p>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="issues">Transcript Issues</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="issues">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Transcript Issues</h3>
                <Button variant="outline" size="sm" onClick={checkIssues} disabled={isTranscriptIssuesLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isTranscriptIssuesLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              
              {isTranscriptIssuesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Checking for transcript issues...</span>
                </div>
              ) : transcriptIssues ? (
                <div className="space-y-4">
                  <IssuesSummary stats={transcriptIssues.stats} />
                  
                  <PotentialSummitTranscripts 
                    transcripts={transcriptIssues.potentialSummitTranscripts} 
                    onUpdateSource={handleUpdateSourceType} 
                  />
                  
                  <UnprocessedTranscripts 
                    transcripts={transcriptIssues.unprocessedTranscripts}
                    selectedTranscripts={selectedTranscripts}
                    onSelectAll={handleSelectAll}
                    onSelectTranscript={handleSelectTranscript}
                    onProcess={handleProcessSelectedTranscripts}
                    isProcessing={isProcessing}
                    processingProgress={processingProgress}
                  />
                  
                  <StuckTranscripts 
                    transcripts={transcriptIssues.stuckInProcessing}
                    onRetry={handleRetryStuckTranscripts}
                    isProcessing={isProcessing}
                    processingProgress={processingProgress}
                  />
                  
                  {transcriptIssues.stats.emptyContent > 0 && (
                    <EmptyContentTranscripts 
                      transcripts={transcriptIssues.unprocessedTranscripts}
                      selectedTranscripts={selectedTranscripts}
                      onSelectAll={handleSelectAll}
                      onSelectTranscript={handleSelectTranscript}
                      onFix={handleFixSelectedTranscripts}
                      isProcessing={isProcessing}
                      processingProgress={processingProgress}
                    />
                  )}
                </div>
              ) : (
                <Alert className="bg-red-50 text-red-800 border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to check transcript issues. Please try again.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="maintenance">
            {transcriptIssues && (
              <MaintenanceTab 
                unprocessedTranscripts={transcriptIssues.unprocessedTranscripts}
                onMarkAsProcessed={handleMarkAsProcessed}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TranscriptDiagnostics;
