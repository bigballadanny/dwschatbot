
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label"; // Added missing import
import { 
  checkEnvironmentVariables,
  checkForTranscriptIssues,
  fixTranscriptIssues,
  manuallyProcessTranscripts,
  updateTranscriptSourceType,
  markTranscriptAsProcessed,
  retryStuckTranscripts
} from "@/utils/transcriptDiagnostics";
import { showSuccess, showError, showWarning } from "@/utils/toastUtils";

const TranscriptDiagnostics = () => {
  const [activeTab, setActiveTab] = useState("issues");
  const [environmentStatus, setEnvironmentStatus] = useState<any>(null);
  const [isEnvironmentLoading, setIsEnvironmentLoading] = useState(false);
  const [transcriptIssues, setTranscriptIssues] = useState<any>(null);
  const [isTranscriptIssuesLoading, setIsTranscriptIssuesLoading] = useState(false);
  const [selectedTranscripts, setSelectedTranscripts] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // Check transcript issues on mount instead of environment
  useEffect(() => {
    checkIssues();
  }, []);
  
  const checkEnvironment = async () => {
    setIsEnvironmentLoading(true);
    try {
      const status = await checkEnvironmentVariables();
      setEnvironmentStatus(status);
    } catch (error) {
      console.error("Failed to check environment:", error);
    } finally {
      setIsEnvironmentLoading(false);
    }
  };
  
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
      <Card>
        <CardHeader>
          <CardTitle>Transcript Processing Diagnostics</CardTitle>
          <CardDescription>
            Troubleshoot and manage transcript processing issues
          </CardDescription>
        </CardHeader>
        
        <CardContent>
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
                    <Card className="border rounded-lg overflow-hidden">
                      <CardHeader>
                        <CardTitle>Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
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
                              <TableCell className="text-right">{transcriptIssues.stats.total}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Empty Content</TableCell>
                              <TableCell className="text-right">{transcriptIssues.stats.emptyContent}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Missing File Path</TableCell>
                              <TableCell className="text-right">{transcriptIssues.stats.missingFilePath}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Recently Uploaded (last hour)</TableCell>
                              <TableCell className="text-right">{transcriptIssues.stats.recentlyUploaded}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Business Summit Transcripts</TableCell>
                              <TableCell className="text-right">{transcriptIssues.stats.businessSummitTranscripts}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Potential Summit Transcripts</TableCell>
                              <TableCell className="text-right">{transcriptIssues.stats.potentialSummitTranscripts}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Unprocessed Transcripts</TableCell>
                              <TableCell className="text-right">{transcriptIssues.stats.unprocessedTranscripts}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Processing Failures</TableCell>
                              <TableCell className="text-right">{transcriptIssues.stats.processingFailures}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Stuck In Processing</TableCell>
                              <TableCell className="text-right">{transcriptIssues.stats.stuckInProcessing}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                    
                    {transcriptIssues.potentialSummitTranscripts.length > 0 && (
                      <Card className="border rounded-lg overflow-hidden">
                        <CardHeader>
                          <CardTitle>Potential Summit Transcripts</CardTitle>
                          <CardDescription>Transcripts uploaded on the 27th but not marked as summit</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {transcriptIssues.potentialSummitTranscripts.map((transcript: any) => (
                                <TableRow key={transcript.id}>
                                  <TableCell>{transcript.title}</TableCell>
                                  <TableCell>{new Date(transcript.created_at).toLocaleDateString()}</TableCell>
                                  <TableCell>
                                    <Select onValueChange={(value) => handleUpdateSourceType(transcript.id, value)}>
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
                        </CardContent>
                      </Card>
                    )}
                    
                    {transcriptIssues.unprocessedTranscripts.length > 0 && (
                      <Card className="border rounded-lg overflow-hidden">
                        <CardHeader>
                          <CardTitle>Unprocessed Transcripts</CardTitle>
                          <CardDescription>Transcripts that have not been processed yet</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center mb-2">
                            <Checkbox
                              id="select-all-unprocessed"
                              checked={selectedTranscripts.length === transcriptIssues.unprocessedTranscripts.length && transcriptIssues.unprocessedTranscripts.length > 0}
                              onCheckedChange={(checked) => handleSelectAll(transcriptIssues.unprocessedTranscripts, !!checked)}
                            />
                            <Label htmlFor="select-all-unprocessed" className="ml-2">
                              Select All
                            </Label>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>
                                  <Checkbox
                                    id="select-all-header"
                                    checked={selectedTranscripts.length === transcriptIssues.unprocessedTranscripts.length && transcriptIssues.unprocessedTranscripts.length > 0}
                                    onCheckedChange={(checked) => handleSelectAll(transcriptIssues.unprocessedTranscripts, !!checked)}
                                  />
                                </TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Created At</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {transcriptIssues.unprocessedTranscripts.map((transcript: any) => (
                                <TableRow key={transcript.id}>
                                  <TableCell>
                                    <Checkbox
                                      id={`transcript-${transcript.id}`}
                                      checked={selectedTranscripts.includes(transcript.id)}
                                      onCheckedChange={(checked) => handleSelectTranscript(transcript.id, !!checked)}
                                    />
                                  </TableCell>
                                  <TableCell>{transcript.title}</TableCell>
                                  <TableCell>{new Date(transcript.created_at).toLocaleDateString()}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                        <CardFooter>
                          <Button variant="default" onClick={handleProcessSelectedTranscripts} disabled={isProcessing}>
                            {isProcessing ? (
                              <>
                                Processing...
                                <Progress value={processingProgress} className="ml-2 w-24" />
                              </>
                            ) : (
                              "Process Selected"
                            )}
                          </Button>
                        </CardFooter>
                      </Card>
                    )}
                    
                    {transcriptIssues.stuckInProcessing.length > 0 && (
                      <Card className="border rounded-lg overflow-hidden">
                        <CardHeader>
                          <CardTitle>Stuck In Processing</CardTitle>
                          <CardDescription>Transcripts that have been processing for more than 5 minutes</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Started At</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {transcriptIssues.stuckInProcessing.map((transcript: any) => (
                                <TableRow key={transcript.id}>
                                  <TableCell>{transcript.title}</TableCell>
                                  <TableCell>{new Date(transcript.metadata.processing_started_at).toLocaleTimeString()}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                        <CardFooter>
                          <Button variant="destructive" onClick={handleRetryStuckTranscripts} disabled={isProcessing}>
                            {isProcessing ? (
                              <>
                                Retrying...
                                <Progress value={processingProgress} className="ml-2 w-24" />
                              </>
                            ) : (
                              "Retry Stuck Transcripts"
                            )}
                          </Button>
                        </CardFooter>
                      </Card>
                    )}
                    
                    {transcriptIssues.stats.emptyContent > 0 && (
                      <Card className="border rounded-lg overflow-hidden">
                        <CardHeader>
                          <CardTitle>Fix Empty Content</CardTitle>
                          <CardDescription>Transcripts with missing content</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center mb-2">
                            <Checkbox
                              id="select-all-empty"
                              checked={selectedTranscripts.length === transcriptIssues.unprocessedTranscripts.length && transcriptIssues.unprocessedTranscripts.length > 0}
                              onCheckedChange={(checked) => handleSelectAll(transcriptIssues.unprocessedTranscripts, !!checked)}
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
                                    id="select-all-header"
                                    checked={selectedTranscripts.length === transcriptIssues.unprocessedTranscripts.length && transcriptIssues.unprocessedTranscripts.length > 0}
                                    onCheckedChange={(checked) => handleSelectAll(transcriptIssues.unprocessedTranscripts, !!checked)}
                                  />
                                </TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Created At</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {transcriptIssues.unprocessedTranscripts.map((transcript: any) => (
                                <TableRow key={transcript.id}>
                                  <TableCell>
                                    <Checkbox
                                      id={`transcript-${transcript.id}`}
                                      checked={selectedTranscripts.includes(transcript.id)}
                                      onCheckedChange={(checked) => handleSelectTranscript(transcript.id, !!checked)}
                                    />
                                  </TableCell>
                                  <TableCell>{transcript.title}</TableCell>
                                  <TableCell>{new Date(transcript.created_at).toLocaleDateString()}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                        <CardFooter>
                          <Button variant="default" onClick={handleFixSelectedTranscripts} disabled={isProcessing}>
                            {isProcessing ? (
                              <>
                                Processing...
                                <Progress value={processingProgress} className="ml-2 w-24" />
                              </>
                            ) : (
                              "Fix Selected"
                            )}
                          </Button>
                        </CardFooter>
                      </Card>
                    )}
                  </div>
                ) : (
                  <Alert className="bg-red-50 text-red-800 border-red-200">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Failed to check transcript issues. Please try again.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="maintenance">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Maintenance</h3>
                
                <Card className="border rounded-lg overflow-hidden">
                  <CardHeader>
                    <CardTitle>Mark as Processed</CardTitle>
                    <CardDescription>Manually mark a transcript as processed</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Created At</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transcriptIssues?.unprocessedTranscripts.map((transcript: any) => (
                          <TableRow key={transcript.id}>
                            <TableCell>{transcript.title}</TableCell>
                            <TableCell>{new Date(transcript.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" onClick={() => handleMarkAsProcessed(transcript.id)}>
                                Mark as Processed
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default TranscriptDiagnostics;
