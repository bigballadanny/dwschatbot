
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { 
  checkTranscriptStorageBucket, 
  createTranscriptsBucket,
  standardizeTranscriptFilePaths, 
  batchExtractTranscriptContent 
} from '@/utils/diagnostics/transcriptManagement';
import { 
  batchProcessUnprocessedTranscripts,
  checkTranscriptProcessingHealth
} from '@/utils/diagnostics/transcriptProcessing';

/**
 * MaintenanceTab provides utilities for system maintenance and repair
 */
const MaintenanceTab: React.FC = () => {
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  
  const [isFixingStorage, setIsFixingStorage] = useState(false);
  const [storageStatus, setStorageStatus] = useState<any>(null);
  
  const [isStandardizingPaths, setIsStandardizingPaths] = useState(false);
  const [standardizeStatus, setStandardizeStatus] = useState<any>(null);
  
  const [isExtractingContent, setIsExtractingContent] = useState(false);
  const [extractStatus, setExtractStatus] = useState<any>(null);
  
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchStatus, setBatchStatus] = useState<any>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // Function to check system health
  const handleCheckHealth = async () => {
    setIsCheckingHealth(true);
    setHealthStatus(null);
    
    try {
      const result = await checkTranscriptProcessingHealth();
      setHealthStatus(result);
    } catch (error: any) {
      setHealthStatus({
        healthy: false,
        issues: [error.message],
        details: { error: error.message }
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };
  
  // Function to fix storage bucket issues
  const handleFixStorage = async () => {
    setIsFixingStorage(true);
    setStorageStatus(null);
    
    try {
      // Check bucket status
      const { exists, isPublic } = await checkTranscriptStorageBucket();
      
      if (!exists) {
        const createResult = await createTranscriptsBucket();
        setStorageStatus({
          action: 'created',
          success: createResult.success,
          error: createResult.error
        });
      } else if (!isPublic) {
        setStorageStatus({
          action: 'exists',
          isPublic: false,
          message: 'Storage bucket exists but is not public. Consider recreating it as public.'
        });
      } else {
        setStorageStatus({
          action: 'no_action',
          message: 'Storage bucket exists and is configured correctly.'
        });
      }
    } catch (error: any) {
      setStorageStatus({
        action: 'error',
        error: error.message
      });
    } finally {
      setIsFixingStorage(false);
    }
  };
  
  // Function to standardize file paths
  const handleStandardizePaths = async () => {
    setIsStandardizingPaths(true);
    setStandardizeStatus(null);
    
    try {
      const result = await standardizeTranscriptFilePaths();
      setStandardizeStatus(result);
    } catch (error: any) {
      setStandardizeStatus({
        success: false,
        standardized: 0,
        errors: { general: error.message }
      });
    } finally {
      setIsStandardizingPaths(false);
    }
  };
  
  // Function to extract content from files
  const handleExtractContent = async () => {
    setIsExtractingContent(true);
    setExtractStatus(null);
    
    try {
      const result = await batchExtractTranscriptContent();
      setExtractStatus(result);
    } catch (error: any) {
      setExtractStatus({
        success: false,
        processed: 0,
        errors: { general: error.message }
      });
    } finally {
      setIsExtractingContent(false);
    }
  };
  
  // Function to batch process all unprocessed transcripts
  const handleBatchProcess = async () => {
    setIsBatchProcessing(true);
    setBatchStatus(null);
    setProcessingProgress(0);
    
    try {
      // First check health to ensure the system is ready
      const health = await checkTranscriptProcessingHealth();
      
      if (!health.healthy) {
        setBatchStatus({
          success: false,
          message: 'System health check failed. Please fix issues before batch processing.',
          details: health
        });
        setIsBatchProcessing(false);
        return;
      }
      
      const result = await batchProcessUnprocessedTranscripts({
        prepareFirst: true,
        batchSize: 5,
        maxRetries: 2
      });
      
      // Calculate progress
      if (result.total > 0) {
        setProcessingProgress(Math.round((result.processed / result.total) * 100));
      }
      
      setBatchStatus(result);
    } catch (error: any) {
      setBatchStatus({
        success: false,
        message: error.message,
        total: 0,
        processed: 0,
        errors: { general: error.message }
      });
    } finally {
      setIsBatchProcessing(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">System Maintenance</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* System Health Card */}
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Check the health of the transcript processing system</CardDescription>
          </CardHeader>
          <CardContent>
            {healthStatus && (
              <div className="space-y-4">
                <div className="flex items-center">
                  <span className="mr-2">Status:</span>
                  {healthStatus.healthy ? (
                    <span className="text-green-500 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" /> Healthy
                    </span>
                  ) : (
                    <span className="text-amber-500 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" /> Issues Detected
                    </span>
                  )}
                </div>
                
                {healthStatus.issues && healthStatus.issues.length > 0 && (
                  <Alert variant="warning">
                    <AlertDescription>
                      <ul className="list-disc pl-4 space-y-1">
                        {healthStatus.issues.map((issue: string, i: number) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                
                {healthStatus.details && healthStatus.details.statistics && (
                  <div className="space-y-2">
                    <p>Transcript Statistics:</p>
                    <ul className="list-disc pl-4">
                      <li>Total: {healthStatus.details.statistics.total}</li>
                      <li>Processed: {healthStatus.details.statistics.processed} ({healthStatus.details.statistics.processedPercent}%)</li>
                      <li>Unprocessed: {healthStatus.details.statistics.unprocessed}</li>
                      <li>Summarized: {healthStatus.details.statistics.summarized}</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleCheckHealth} disabled={isCheckingHealth}>
              {isCheckingHealth ? "Checking..." : "Check Health"}
            </Button>
          </CardFooter>
        </Card>
        
        {/* Storage Bucket Card */}
        <Card>
          <CardHeader>
            <CardTitle>Storage Bucket</CardTitle>
            <CardDescription>Verify and fix storage bucket configuration</CardDescription>
          </CardHeader>
          <CardContent>
            {storageStatus && (
              <div className="space-y-4">
                {storageStatus.action === 'created' ? (
                  <Alert variant={storageStatus.success ? "default" : "destructive"}>
                    <AlertDescription>
                      {storageStatus.success 
                        ? "Storage bucket created successfully" 
                        : `Failed to create storage bucket: ${storageStatus.error}`}
                    </AlertDescription>
                  </Alert>
                ) : storageStatus.action === 'exists' ? (
                  <Alert variant={storageStatus.isPublic ? "default" : "warning"}>
                    <AlertDescription>
                      {storageStatus.message}
                    </AlertDescription>
                  </Alert>
                ) : storageStatus.action === 'no_action' ? (
                  <Alert>
                    <AlertDescription>
                      {storageStatus.message}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertDescription>
                      Error: {storageStatus.error}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleFixStorage} disabled={isFixingStorage}>
              {isFixingStorage ? "Verifying..." : "Verify Storage"}
            </Button>
          </CardFooter>
        </Card>
        
        {/* Standardize Paths Card */}
        <Card>
          <CardHeader>
            <CardTitle>Standardize File Paths</CardTitle>
            <CardDescription>Ensure consistent file paths in the database</CardDescription>
          </CardHeader>
          <CardContent>
            {standardizeStatus && (
              <div className="space-y-4">
                <Alert variant={standardizeStatus.success ? "default" : "warning"}>
                  <AlertDescription>
                    {standardizeStatus.success 
                      ? `Standardized ${standardizeStatus.standardized} file paths successfully` 
                      : `Standardized ${standardizeStatus.standardized} paths with some errors`}
                  </AlertDescription>
                </Alert>
                
                {Object.keys(standardizeStatus.errors || {}).length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <p>{Object.keys(standardizeStatus.errors).length} errors occurred</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleStandardizePaths} disabled={isStandardizingPaths}>
              {isStandardizingPaths ? "Standardizing..." : "Standardize Paths"}
            </Button>
          </CardFooter>
        </Card>
        
        {/* Extract Content Card */}
        <Card>
          <CardHeader>
            <CardTitle>Extract File Content</CardTitle>
            <CardDescription>Extract content from stored files into transcript records</CardDescription>
          </CardHeader>
          <CardContent>
            {extractStatus && (
              <div className="space-y-4">
                <Alert variant={extractStatus.success ? "default" : "warning"}>
                  <AlertDescription>
                    {extractStatus.success 
                      ? `Extracted content for ${extractStatus.processed} transcripts successfully` 
                      : `Extracted ${extractStatus.processed} transcripts with some errors`}
                  </AlertDescription>
                </Alert>
                
                {Object.keys(extractStatus.errors || {}).length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <p>{Object.keys(extractStatus.errors).length} errors occurred</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleExtractContent} disabled={isExtractingContent}>
              {isExtractingContent ? "Extracting..." : "Extract Content"}
            </Button>
          </CardFooter>
        </Card>
        
        {/* Batch Processing Card */}
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Batch Process Transcripts</CardTitle>
            <CardDescription>Process all unprocessed transcripts in a batch operation</CardDescription>
          </CardHeader>
          <CardContent>
            {batchStatus && (
              <div className="space-y-4">
                <Alert variant={batchStatus.success ? "default" : "warning"}>
                  <AlertDescription>
                    {batchStatus.success 
                      ? `Successfully processed ${batchStatus.processed} of ${batchStatus.total} transcripts` 
                      : batchStatus.message || `Processed ${batchStatus.processed} of ${batchStatus.total} transcripts with some errors`}
                  </AlertDescription>
                </Alert>
                
                {batchStatus.prepared > 0 && (
                  <div className="text-sm">
                    <p>Preparation steps: fixed {batchStatus.prepared} issues before processing</p>
                  </div>
                )}
                
                {Object.keys(batchStatus.errors || {}).length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <p>{Object.keys(batchStatus.errors).length} errors occurred</p>
                  </div>
                )}
              </div>
            )}
            
            {isBatchProcessing && (
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Processing...</span>
                  <span>{processingProgress}%</span>
                </div>
                <Progress value={processingProgress} />
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleBatchProcess} 
              disabled={isBatchProcessing}
              variant="default"
              className="w-full"
            >
              {isBatchProcessing ? "Processing..." : "Process All Unprocessed Transcripts"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default MaintenanceTab;
