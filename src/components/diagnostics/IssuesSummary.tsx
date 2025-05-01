
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface IssuesSummaryProps {
  stats: {
    total: number;
    emptyContent: number;
    missingFilePath: number;
    recentlyUploaded: number;
    businessSummitTranscripts: number;
    potentialSummitTranscripts: number;
    unprocessedTranscripts: number;
    processingFailures: number;
    stuckInProcessing: number;
  };
  systemHealth?: {
    healthy: boolean;
    issues: string[];
    details: any;
  };
}

const IssuesSummary: React.FC<IssuesSummaryProps> = ({ stats, systemHealth }) => {
  // Calculate percentages for stats cards
  const processedPercent = stats.total > 0 
    ? Math.round(((stats.total - stats.unprocessedTranscripts) / stats.total) * 100) 
    : 0;
  
  const contentReadyPercent = stats.total > 0 
    ? Math.round(((stats.total - stats.emptyContent) / stats.total) * 100) 
    : 0;
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">System Health</h2>
        
        {systemHealth ? (
          <Alert variant={systemHealth.healthy ? "default" : "warning"}>
            {systemHealth.healthy ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            )}
            <AlertTitle>
              {systemHealth.healthy ? "System is healthy" : "System issues detected"}
            </AlertTitle>
            <AlertDescription>
              {systemHealth.healthy ? (
                "All transcript processing systems are operating correctly."
              ) : (
                <div className="mt-1">
                  <p>Issues detected:</p>
                  <ul className="list-disc pl-5 space-y-1 mt-1">
                    {systemHealth.issues.map((issue: string, i: number) => (
                      <li key={i} className="text-sm">{issue}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm">Please check the Maintenance tab for tools to resolve these issues.</p>
                </div>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>System health status unavailable</AlertTitle>
            <AlertDescription>Click Refresh to check system health.</AlertDescription>
          </Alert>
        )}
      </div>
      
      <h2 className="text-xl font-semibold">Transcript Summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Total Transcripts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className={stats.unprocessedTranscripts > 0 ? "border-amber-300" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              Processing Status
              {stats.unprocessedTranscripts > 0 && <AlertTriangle className="h-5 w-5 text-amber-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Processed:</span>
              <span className="font-medium">{stats.total - stats.unprocessedTranscripts} ({processedPercent}%)</span>
            </div>
            <div className="flex justify-between">
              <span>Unprocessed:</span>
              <span className={`font-medium ${stats.unprocessedTranscripts > 0 ? 'text-amber-500' : ''}`}>
                {stats.unprocessedTranscripts}
              </span>
            </div>
            {stats.stuckInProcessing > 0 && (
              <div className="flex justify-between">
                <span>Stuck in processing:</span>
                <span className="font-medium text-amber-500">{stats.stuckInProcessing}</span>
              </div>
            )}
          </CardContent>
          <CardFooter>
            {stats.unprocessedTranscripts > 0 && (
              <p className="text-xs text-muted-foreground">Check the Unprocessed tab to process these transcripts.</p>
            )}
          </CardFooter>
        </Card>

        <Card className={stats.emptyContent > 0 ? "border-amber-300" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              Content Status
              {stats.emptyContent > 0 && <AlertTriangle className="h-5 w-5 text-amber-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Content available:</span>
              <span className="font-medium">{stats.total - stats.emptyContent} ({contentReadyPercent}%)</span>
            </div>
            <div className="flex justify-between">
              <span>Empty content:</span>
              <span className={`font-medium ${stats.emptyContent > 0 ? 'text-amber-500' : ''}`}>
                {stats.emptyContent}
              </span>
            </div>
            {stats.missingFilePath > 0 && (
              <div className="flex justify-between">
                <span>Missing file path:</span>
                <span className="font-medium text-red-500">{stats.missingFilePath}</span>
              </div>
            )}
          </CardContent>
          <CardFooter>
            {stats.emptyContent > 0 && (
              <p className="text-xs text-muted-foreground">Check the Empty Content tab to fix these transcripts.</p>
            )}
          </CardFooter>
        </Card>
      </div>
      
      <div className="mt-6">
        {(stats.unprocessedTranscripts > 0 || stats.emptyContent > 0 || stats.stuckInProcessing > 0) && (
          <Alert variant="warning" className="bg-amber-50">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Action Required</AlertTitle>
            <AlertDescription>
              There are issues that require attention. Please use the tabs above to address them or visit the Maintenance tab for system-level tools.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default IssuesSummary;
