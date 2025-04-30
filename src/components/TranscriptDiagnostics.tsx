
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, Settings, Wrench } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { showSuccess, showError, showWarning } from "@/utils/toastUtils";
import { 
  checkForTranscriptIssues, 
  fixTranscriptIssues, 
  manuallyProcessTranscripts,
  markTranscriptAsProcessed,
  checkEnvironmentVariables
} from '@/utils/transcriptDiagnostics';

const TranscriptDiagnostics = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [selectedTranscripts, setSelectedTranscripts] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [operationProgress, setOperationProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('unprocessed');
  const [envVars, setEnvVars] = useState<{[key: string]: boolean}>({});

  const runDiagnostics = async () => {
    setIsLoading(true);
    setSelectedTranscripts([]);
    try {
      // Check environment variables
      const envResults = await checkEnvironmentVariables();
      setEnvVars(envResults);
      
      // Check for transcript issues
      const results = await checkForTranscriptIssues();
      setDiagnosticResults(results);
    } catch (error: any) {
      console.error('Error running diagnostics:', error);
      showError('Diagnostics Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const handleTranscriptSelection = (transcriptId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedTranscripts(prev => [...prev, transcriptId]);
    } else {
      setSelectedTranscripts(prev => prev.filter(id => id !== transcriptId));
    }
  };

  const handleSelectAllTranscripts = (transcripts: any[], isSelected: boolean) => {
    if (isSelected) {
      setSelectedTranscripts(transcripts.map(t => t.id));
    } else {
      setSelectedTranscripts([]);
    }
  };

  const handleFixSelectedTranscripts = async () => {
    if (selectedTranscripts.length === 0) {
      showWarning('No Selection', 'Please select at least one transcript to fix');
      return;
    }

    setProcessing(true);
    setOperationProgress(0);

    try {
      const results = await fixTranscriptIssues(selectedTranscripts);
      
      if (results.errors.length > 0) {
        showWarning('Fix Completed With Issues', `Fixed ${results.success} transcripts with ${results.errors.length} errors`);
      } else {
        showSuccess('Fix Completed', `Successfully fixed ${results.success} transcripts`);
      }
      
      // Refresh diagnostics
      await runDiagnostics();
    } catch (error: any) {
      showError('Fix Failed', error.message);
    } finally {
      setProcessing(false);
      setOperationProgress(100);
    }
  };

  const handleManuallyProcessSelectedTranscripts = async () => {
    if (selectedTranscripts.length === 0) {
      showWarning('No Selection', 'Please select at least one transcript to process');
      return;
    }

    setProcessing(true);
    setOperationProgress(0);

    try {
      const results = await manuallyProcessTranscripts(selectedTranscripts);
      
      if (results.errors.length > 0) {
        showWarning('Processing Completed With Issues', `Processed ${results.success} transcripts with ${results.errors.length} errors`);
      } else {
        showSuccess('Processing Completed', `Successfully processed ${results.success} transcripts`);
      }
      
      // Refresh diagnostics
      await runDiagnostics();
    } catch (error: any) {
      showError('Processing Failed', error.message);
    } finally {
      setProcessing(false);
      setOperationProgress(100);
    }
  };

  const handleMarkAsProcessed = async () => {
    if (selectedTranscripts.length === 0) {
      showWarning('No Selection', 'Please select at least one transcript to mark as processed');
      return;
    }

    setProcessing(true);
    setOperationProgress(0);
    const totalCount = selectedTranscripts.length;
    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < selectedTranscripts.length; i++) {
        const transcriptId = selectedTranscripts[i];
        const { success } = await markTranscriptAsProcessed(transcriptId);
        
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
        
        setOperationProgress(Math.floor((i + 1) / totalCount * 100));
      }
      
      if (errorCount > 0) {
        showWarning('Marking Completed With Issues', `Marked ${successCount} transcripts as processed with ${errorCount} errors`);
      } else {
        showSuccess('Marking Completed', `Successfully marked ${successCount} transcripts as processed`);
      }
      
      // Refresh diagnostics
      await runDiagnostics();
    } catch (error: any) {
      showError('Operation Failed', error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getTranscriptsForActiveTab = () => {
    if (!diagnosticResults) return [];
    
    switch (activeTab) {
      case 'unprocessed':
        return diagnosticResults.unprocessedTranscripts || [];
      case 'recent':
        return diagnosticResults.recentTranscripts || [];
      case 'potential-summit':
        return diagnosticResults.potentialSummitTranscripts || [];
      default:
        return [];
    }
  };

  return (
    <div className="container py-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold mb-6">Transcript Diagnostics</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={runDiagnostics} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Environment Check */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Environment Configuration Check
          </CardTitle>
          <CardDescription>
            Check if required environment variables are set for transcript processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EnvVariableCheck
              name="PYTHON_BACKEND_URL"
              value={!!envVars.PYTHON_BACKEND_URL}
              description="URL for the transcript processing backend"
              required
            />
            <EnvVariableCheck
              name="PYTHON_BACKEND_KEY"
              value={!!envVars.PYTHON_BACKEND_KEY}
              description="Authentication key for the backend"
              required={false}
            />
            <EnvVariableCheck
              name="SUPABASE_SERVICE_ROLE_KEY"
              value={!!envVars.SUPABASE_SERVICE_ROLE_KEY}
              description="Required for edge function authentication"
              required
            />
            <EnvVariableCheck
              name="SUPABASE_URL"
              value={!!envVars.SUPABASE_URL}
              description="Required for edge function database access"
              required
            />
          </div>
          <Alert variant="info" className="mt-4">
            <AlertTitle>Setup Instructions</AlertTitle>
            <AlertDescription className="text-sm">
              Please ensure that all required environment variables are set in your Supabase project settings. 
              For development, these should be set in your Functions environment variables. 
              Missing environment variables will cause transcript processing to fail.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Statistics */}
      {diagnosticResults && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Transcript Statistics</CardTitle>
            <CardDescription>
              Overview of transcript status across your database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Total Transcripts"
                value={diagnosticResults.stats.total}
                icon="document"
              />
              <StatCard
                title="Unprocessed"
                value={diagnosticResults.stats.unprocessedTranscripts || 0}
                icon="warning"
              />
              <StatCard
                title="Empty Content"
                value={diagnosticResults.stats.emptyContent}
                icon="error"
              />
              <StatCard
                title="Recent Uploads"
                value={diagnosticResults.stats.recentlyUploaded}
                icon="recent"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transcript Lists */}
      <Tabs defaultValue="unprocessed" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="unprocessed">
            Unprocessed ({diagnosticResults?.stats.unprocessedTranscripts || 0})
          </TabsTrigger>
          <TabsTrigger value="recent">
            Recent Uploads ({diagnosticResults?.stats.recentlyUploaded || 0})
          </TabsTrigger>
          <TabsTrigger value="potential-summit">
            Potential Summit ({diagnosticResults?.stats.potentialSummitTranscripts || 0})
          </TabsTrigger>
        </TabsList>
        
        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === 'unprocessed' && 'Unprocessed Transcripts'}
              {activeTab === 'recent' && 'Recently Uploaded Transcripts'}
              {activeTab === 'potential-summit' && 'Potential Summit Transcripts'}
            </CardTitle>
            <CardDescription>
              {activeTab === 'unprocessed' && 'Transcripts that have not been processed yet'}
              {activeTab === 'recent' && 'Transcripts uploaded in the last hour'}
              {activeTab === 'potential-summit' && 'Transcripts that might be from the Business Acquisitions Summit'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {processing && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Processing...</span>
                  <span>{operationProgress}%</span>
                </div>
                <Progress value={operationProgress} className="h-2" />
              </div>
            )}
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Checkbox 
                    id="select-all" 
                    checked={
                      getTranscriptsForActiveTab().length > 0 && 
                      selectedTranscripts.length === getTranscriptsForActiveTab().length
                    } 
                    onCheckedChange={(checked) => 
                      handleSelectAllTranscripts(getTranscriptsForActiveTab(), !!checked)
                    }
                    disabled={processing || getTranscriptsForActiveTab().length === 0}
                  />
                  <Label htmlFor="select-all" className="ml-2">
                    Select All ({getTranscriptsForActiveTab().length})
                  </Label>
                </div>
                
                {selectedTranscripts.length > 0 && (
                  <div className="flex gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedTranscripts.length} selected
                    </span>
                    {activeTab === 'unprocessed' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={handleManuallyProcessSelectedTranscripts}
                          disabled={processing}
                        >
                          <Wrench className="h-4 w-4 mr-2" />
                          Process Selected
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={handleMarkAsProcessed}
                          disabled={processing}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Mark as Processed
                        </Button>
                      </>
                    )}
                    {activeTab !== 'unprocessed' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={handleFixSelectedTranscripts}
                        disabled={processing}
                      >
                        <Wrench className="h-4 w-4 mr-2" />
                        Fix Selected
                      </Button>
                    )}
                  </div>
                )}
              </div>
              
              {getTranscriptsForActiveTab().length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No transcripts found in this category.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto p-2">
                  {getTranscriptsForActiveTab().map((transcript: any) => (
                    <Card key={transcript.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedTranscripts.includes(transcript.id)}
                          onCheckedChange={(checked) => 
                            handleTranscriptSelection(transcript.id, !!checked)
                          }
                          disabled={processing}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <h4 className="font-medium">{transcript.title}</h4>
                            <Badge variant={transcript.is_processed ? "outline" : "outline"} 
                              className={transcript.is_processed ? "bg-green-100 text-green-800" : ""}
                            >
                              {transcript.is_processed ? "Processed" : "Unprocessed"}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Source: {transcript.source || 'Unknown'} • 
                            Created: {new Date(transcript.created_at).toLocaleString()}
                          </div>
                          {transcript.metadata && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Metadata: {JSON.stringify(transcript.metadata)}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
};

// Helper components
const StatCard = ({ title, value, icon }: { title: string, value: number, icon: string }) => {
  return (
    <div className="bg-muted rounded-lg p-4 flex flex-col items-center justify-center">
      {icon === 'document' && <FileIcon className="h-10 w-10 mb-2 text-primary" />}
      {icon === 'warning' && <Clock className="h-10 w-10 mb-2 text-yellow-500" />}
      {icon === 'error' && <AlertTriangle className="h-10 w-10 mb-2 text-destructive" />}
      {icon === 'recent' && <RefreshCw className="h-10 w-10 mb-2 text-blue-500" />}
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{title}</div>
    </div>
  );
};

const FileIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

const EnvVariableCheck = ({ name, value, description, required }: { 
  name: string, 
  value: boolean, 
  description: string, 
  required: boolean 
}) => {
  return (
    <div className="flex items-center justify-between p-3 border rounded-md">
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
      <Badge 
        variant={value ? "outline" : required ? "destructive" : "outline"} 
        className={value ? "bg-green-100 text-green-800" : ""}
      >
        {value ? "Set" : required ? "Missing" : "Optional"}
      </Badge>
    </div>
  );
};

export default TranscriptDiagnostics;
