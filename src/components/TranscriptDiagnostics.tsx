
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, FileCheck, Settings } from 'lucide-react';
import { toast } from "sonner";
import { Separator } from '@/components/ui/separator';
import DiagnosticCard from '@/components/diagnostics/DiagnosticCard';
import IssuesSummary from '@/components/diagnostics/IssuesSummary';
import UnprocessedTranscripts from '@/components/diagnostics/UnprocessedTranscripts';
import StuckTranscripts from '@/components/diagnostics/StuckTranscripts';
import EmptyContentTranscripts from '@/components/diagnostics/EmptyContentTranscripts';
import PotentialSummitTranscripts from '@/components/diagnostics/PotentialSummitTranscripts';
import MaintenanceTab from '@/components/diagnostics/MaintenanceTab';

import { 
  checkForTranscriptIssues, 
  forceProcessTranscripts, 
  checkTranscriptProcessingHealth 
} from '@/utils/diagnostics';

const TranscriptDiagnostics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState<any>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');

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
      const health = await checkTranscriptProcessingHealth();
      setHealthStatus(health);
      if (health.healthy) {
        toast.success("System appears to be healthy");
      } else {
        toast.warning(`Found ${health.issues.length} system health issues`);
      }
    } catch (error) {
      toast.error(`Error checking system health: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error("Health check error:", error);
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
                  <DiagnosticCard 
                    title="Total Transcripts" 
                    value={healthStatus.details.statistics.total} 
                  />
                  <DiagnosticCard 
                    title="Processed" 
                    value={`${healthStatus.details.statistics.processed} (${healthStatus.details.statistics.processedPercent}%)`} 
                  />
                  <DiagnosticCard 
                    title="Unprocessed" 
                    value={healthStatus.details.statistics.unprocessed}
                    variant={healthStatus.details.statistics.unprocessed > 0 ? "warning" : "default"}
                  />
                  <DiagnosticCard 
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
                    onForceProcess={async (ids) => {
                      try {
                        const result = await forceProcessTranscripts(ids);
                        if (result.success) {
                          toast.success(`Successfully forced processing for ${result.processed} transcripts`);
                          runDiagnostics();
                        } else {
                          toast.error(`Error forcing processing: ${result.errors.general || "Unknown error"}`);
                        }
                      } catch (error) {
                        toast.error(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
                      }
                    }}
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
                  <EmptyContentTranscripts transcripts={issues.emptyContentTranscripts} />
                </>
              )}
              
              {issues.stuckInProcessing?.length > 0 && (
                <>
                  <h2 className="text-xl font-semibold mt-6">Stuck in Processing</h2>
                  <StuckTranscripts transcripts={issues.stuckInProcessing} />
                </>
              )}
              
              {issues.potentialSummitTranscripts?.length > 0 && (
                <>
                  <h2 className="text-xl font-semibold mt-6">Potential Summit Transcripts</h2>
                  <PotentialSummitTranscripts transcripts={issues.potentialSummitTranscripts} />
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
