
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Import our diagnostic components
import IssuesSummary from './diagnostics/IssuesSummary';
import PotentialSummitTranscripts from './diagnostics/PotentialSummitTranscripts';
import UnprocessedTranscripts from './diagnostics/UnprocessedTranscripts';
import StuckTranscripts from './diagnostics/StuckTranscripts';
import EmptyContentTranscripts from './diagnostics/EmptyContentTranscripts';
import MaintenanceTab from './diagnostics/MaintenanceTab';

// Import all utilities from the diagnostics index
import { 
  checkForTranscriptIssues,
  fixTranscriptIssues,
  manuallyProcessTranscripts,
  updateTranscriptSourceType,
  markTranscriptAsProcessed,
  retryStuckTranscripts,
  forceProcessTranscripts,
  forceProcessTranscriptsWithRetry,
  standardizeTranscriptFilePaths,
  batchExtractTranscriptContent,
  batchProcessUnprocessedTranscripts
} from "@/utils/diagnostics";

import { showSuccess, showError, showWarning } from "@/utils/toastUtils";

const TranscriptDiagnostics = () => {
  const [activeTab, setActiveTab] = useState("issues");
  const [transcriptIssues, setTranscriptIssues] = useState<any>(null);
  const [isTranscriptIssuesLoading, setIsTranscriptIssuesLoading] = useState(false);
  const [selectedTranscripts, setSelectedTranscripts] = useState<string[]>([]);
  const [selectedEmptyTranscripts, setSelectedEmptyTranscripts] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFixingContent, setIsFixingContent] = useState(false);
  const [isRetryingStuck, setIsRetryingStuck] = useState(false);
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
      setSelectedEmptyTranscripts([]);
    } catch (error) {
      console.error("Failed to check transcript issues:", error);
      showError("Error", "Failed to check transcript issues");
    } finally {
      setIsTranscriptIssuesLoading(false);
    }
  };
  
  const handleFixSelectedTranscripts = async () => {
    if (!selectedEmptyTranscripts.length) return;
    
    setIsFixingContent(true);
    setProcessingProgress(0);
    
    try {
      const result = await fixTranscriptIssues(selectedEmptyTranscripts);
      
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
      setIsFixingContent(false);
    }
  };
  
  const handleProcessSelectedTranscripts = async () => {
    if (!selectedTranscripts.length) return;
    
    setIsProcessing(true);
    setProcessingProgress(0);
    
    try {
      // We'll use the enhanced version with retry
      const result = await forceProcessTranscriptsWithRetry(selectedTranscripts);
      
      if (Object.keys(result.errors).length) {
        showWarning(
          "Process Completed with Errors", 
          `Processed ${result.processed} transcripts, but encountered ${Object.keys(result.errors).length} errors.`
        );
      } else {
        showSuccess(
          "Process Completed", 
          `Successfully processed ${result.processed} transcripts.`
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
  
  const handleSelectTranscript = (transcriptId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedTranscripts(prev => [...prev, transcriptId]);
    } else {
      setSelectedTranscripts(prev => prev.filter(id => id !== transcriptId));
    }
  };
  
  const handleSelectEmptyTranscript = (transcriptId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedEmptyTranscripts(prev => [...prev, transcriptId]);
    } else {
      setSelectedEmptyTranscripts(prev => prev.filter(id => id !== transcriptId));
    }
  };
  
  const handleSelectAll = (transcripts: any[], isSelected: boolean) => {
    if (isSelected) {
      setSelectedTranscripts(transcripts.map(t => t.id));
    } else {
      setSelectedTranscripts([]);
    }
  };
  
  const handleSelectAllEmpty = (transcripts: any[], isSelected: boolean) => {
    if (isSelected) {
      setSelectedEmptyTranscripts(transcripts.map(t => t.id));
    } else {
      setSelectedEmptyTranscripts([]);
    }
  };
  
  const handleRetryStuckTranscripts = async () => {
    if (!transcriptIssues?.stuckInProcessing?.length) return;
    
    setIsRetryingStuck(true);
    setProcessingProgress(0);
    
    try {
      const transcriptsToRetry = transcriptIssues.stuckInProcessing.map((t: any) => t.id);
      const result = await retryStuckTranscripts(transcriptsToRetry);
      
      if (result.errors.length) {
        showWarning(
          "Process Completed with Errors", 
          `Retried ${result.success} transcripts, but encountered ${result.errors.length} errors.`
        );
      } else {
        showSuccess(
          "Process Completed", 
          `Successfully retried ${result.success} transcripts.`
        );
      }
      
      // Refresh the issues list
      checkIssues();
    } catch (error) {
      console.error("Failed to retry stuck transcripts:", error);
      showError("Error", "Failed to retry stuck transcripts");
    } finally {
      setIsRetryingStuck(false);
    }
  };
  
  const handleUpdateTranscriptSource = async (transcriptId: string, newSource: string) => {
    try {
      const result = await updateTranscriptSourceType(transcriptId, newSource);
      
      if (result.success) {
        showSuccess("Success", `Updated transcript source to "${newSource}"`);
        checkIssues();
      } else {
        showError("Error", `Failed to update source: ${result.error}`);
      }
    } catch (error: any) {
      console.error("Failed to update transcript source:", error);
      showError("Error", error.message);
    }
  };
  
  if (isTranscriptIssuesLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Transcript Diagnostics</h2>
          <Button variant="outline" disabled>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Checking...
          </Button>
        </div>
        <div className="text-center py-10">
          <p>Checking transcripts for issues...</p>
        </div>
      </div>
    );
  }
  
  if (!transcriptIssues) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Transcript Diagnostics</h2>
          <Button variant="outline" onClick={checkIssues}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Check Issues
          </Button>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No issues check has been performed yet</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Transcript Diagnostics</h2>
        <Button variant="outline" onClick={checkIssues}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="issues">Issues Summary</TabsTrigger>
          <TabsTrigger value="unprocessed">Unprocessed ({transcriptIssues.stats.unprocessedTranscripts})</TabsTrigger>
          <TabsTrigger value="stuck">Stuck ({transcriptIssues.stats.stuckInProcessing})</TabsTrigger>
          <TabsTrigger value="empty">Empty Content ({transcriptIssues.stats.emptyContent})</TabsTrigger>
          <TabsTrigger value="summit">Summit Transcripts ({transcriptIssues.stats.potentialSummitTranscripts})</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="issues">
          <IssuesSummary stats={transcriptIssues.stats} />
        </TabsContent>
        
        <TabsContent value="unprocessed">
          <UnprocessedTranscripts 
            transcripts={transcriptIssues.unprocessedTranscripts} 
            selectedTranscripts={selectedTranscripts}
            onSelectAll={handleSelectAll}
            onSelectTranscript={handleSelectTranscript}
            onProcess={handleProcessSelectedTranscripts}
            isProcessing={isProcessing}
            processingProgress={processingProgress}
          />
        </TabsContent>
        
        <TabsContent value="stuck">
          <StuckTranscripts 
            transcripts={transcriptIssues.stuckInProcessing}
            onRetry={handleRetryStuckTranscripts}
            isProcessing={isRetryingStuck}
            processingProgress={processingProgress}
          />
        </TabsContent>
        
        <TabsContent value="empty">
          <EmptyContentTranscripts 
            transcripts={transcriptIssues.recentTranscripts} 
            selectedTranscripts={selectedEmptyTranscripts}
            onSelectAll={handleSelectAllEmpty}
            onSelectTranscript={handleSelectEmptyTranscript}
            onFix={handleFixSelectedTranscripts}
            isProcessing={isFixingContent}
            processingProgress={processingProgress}
          />
        </TabsContent>
        
        <TabsContent value="summit">
          <PotentialSummitTranscripts 
            transcripts={transcriptIssues.potentialSummitTranscripts}
            onUpdateSource={handleUpdateTranscriptSource}
          />
        </TabsContent>
        
        <TabsContent value="maintenance">
          <MaintenanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TranscriptDiagnostics;
