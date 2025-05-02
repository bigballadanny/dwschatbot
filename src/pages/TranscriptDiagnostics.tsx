
import React, { useState, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UnprocessedTranscripts from "@/components/diagnostics/UnprocessedTranscripts";
import StuckTranscripts from "@/components/diagnostics/StuckTranscripts";
import PotentialSummitTranscripts from "@/components/diagnostics/PotentialSummitTranscripts";
import { ReprocessingTab } from '@/components/diagnostics/ReprocessingTab';
import MaintenanceTab from '@/components/diagnostics/MaintenanceTab';
import DiagnosticCard from '@/components/diagnostics/DiagnosticCard';
import DiagnosticCardSimple from "@/components/diagnostics/DiagnosticCardSimple";
import IssuesSummary from '@/components/diagnostics/IssuesSummary';
import EmptyContentTranscripts from '@/components/diagnostics/EmptyContentTranscripts';
import { TranscriptDetailsView } from "@/components/diagnostics/TranscriptDetailsView";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/context/AdminContext";
import { checkEnvironmentStatus } from '@/utils/diagnostics/environmentCheck';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, HelpCircle } from "lucide-react";

/**
 * Get basic counts of transcript issues in the system
 */
const getTranscriptIssues = async () => {
  try {
    // Get count of unprocessed transcripts
    const { data: unprocessed, error: unprocessedError } = await supabase
      .from('transcripts')
      .select('id')
      .eq('is_processed', false);
      
    // Get count of stuck transcripts (unprocessed but with processing started)
    const { data: stuck, error: stuckError } = await supabase
      .from('transcripts')
      .select('id')
      .eq('is_processed', false)
      .not('metadata->processing_started_at', 'is', null);
      
    // Get count of transcripts with empty content
    const { data: empty, error: emptyError } = await supabase
      .from('transcripts')
      .select('id')
      .or('content.is.null,content.eq.');
      
    // Sample count for potential summit transcripts
    const { data: summits, error: summitsError } = await supabase
      .from('transcripts')
      .select('id')
      .containedBy('source', ['summit']);
      
    if (unprocessedError || stuckError || emptyError || summitsError) {
      console.error('Error fetching transcript issues');
      return {
        unprocessed: 0,
        stuck: 0,
        emptyContent: 0,
        potentialSummits: 0
      };
    }

    return {
      unprocessed: unprocessed?.length || 0,
      stuck: stuck?.length || 0,
      emptyContent: empty?.length || 0,
      potentialSummits: summits?.length || 0
    };
  } catch (error) {
    console.error('Error fetching transcript issues:', error);
    return {
      unprocessed: 0,
      stuck: 0,
      emptyContent: 0,
      potentialSummits: 0
    };
  }
};

// Define the interface for environment status
interface EnvironmentStatus {
  database: boolean;
  storage: boolean;
  edgeFunctions: boolean;
}

// Define the interface for issues summary
interface IssuesSummary {
  unprocessed: number;
  stuck: number;
  emptyContent: number;
  potentialSummits: number;
}

export default function TranscriptDiagnostics() {
  const [selectedTranscriptId, setSelectedTranscriptId] = useState<string | null>(null);
  const [environmentStatus, setEnvironmentStatus] = useState<EnvironmentStatus>({
    database: false,
    storage: false,
    edgeFunctions: false,
  });
  const [issuesSummary, setIssuesSummary] = useState<IssuesSummary>({
    unprocessed: 0,
    stuck: 0,
    emptyContent: 0,
    potentialSummits: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();
  const { toast } = useToast();

  const fetchEnvironmentStatus = useCallback(async () => {
    try {
      const status = await checkEnvironmentStatus();
      setEnvironmentStatus(status);
    } catch (error) {
      console.error("Failed to fetch environment status:", error);
      toast({
        title: "Error",
        description: "Failed to check environment status",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchIssuesSummary = useCallback(async () => {
    try {
      const issues = await getTranscriptIssues();
      setIssuesSummary(issues);
    } catch (error) {
      console.error("Failed to fetch issues summary:", error);
      toast({
        title: "Error",
        description: "Failed to load issues summary",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchTranscripts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setTranscripts(data || []);
    } catch (error) {
      console.error("Failed to fetch transcripts:", error);
      toast({
        title: "Error",
        description: "Failed to load transcripts",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const transcriptId = urlParams.get('id');
    setSelectedTranscriptId(transcriptId);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchEnvironmentStatus(), fetchIssuesSummary(), fetchTranscripts()]);
      } catch (error) {
        console.error("Failed to load diagnostics data:", error);
        toast({
          title: "Error",
          description: "Failed to load diagnostics data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (!isAdminLoading) {
      fetchData();
    }
  }, [isAdminLoading, fetchEnvironmentStatus, fetchIssuesSummary, fetchTranscripts, toast]);

  const handleCloseDetails = () => {
    setSelectedTranscriptId(null);
  };

  const handleRefreshDetails = () => {
    setSelectedTranscriptId(null);
    const urlParams = new URLSearchParams(window.location.search);
    const transcriptId = urlParams.get('id');
    setSelectedTranscriptId(transcriptId);
  };

  // Handlers for component props
  const handleSelectTranscript = (id: string) => {
    setSelectedTranscriptId(id);
  };

  const handleSelectAll = (selected: boolean) => {
    // Placeholder for select all functionality
    console.log('Select all transcripts:', selected);
  };

  const handleRetryProcessing = (id: string) => {
    // Placeholder for retry processing functionality
    console.log('Retry processing transcript:', id);
  };

  const handleUpdateSource = (id: string, source: string) => {
    // Placeholder for update source functionality
    console.log('Update source for transcript:', id, source);
  };

  if (!isAdmin && !isAdminLoading) {
    return <div className="container py-6">
      <h1 className="text-3xl font-bold mb-4">Transcript Diagnostics</h1>
      <p className="text-red-500">Access denied. You must be an admin to view this page.</p>
    </div>;
  }

  if (isLoading || isAdminLoading) {
    return <div className="container py-6">
      <h1 className="text-3xl font-bold mb-4">Transcript Diagnostics</h1>
      <p>Loading diagnostics data...</p>
    </div>;
  }

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Transcript Diagnostics</h1>
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/transcripts'}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Transcripts
          </Button>
          <Button variant="ghost" size="sm">
            <HelpCircle className="h-4 w-4 mr-2" />
            Help
          </Button>
        </div>
      </div>

      {selectedTranscriptId ? (
        <div className="border rounded-lg p-4">
          <TranscriptDetailsView 
            transcriptId={selectedTranscriptId} 
            onClose={handleCloseDetails}
            onRefresh={handleRefreshDetails}
          />
        </div>
      ) : (
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="unprocessed">Unprocessed</TabsTrigger>
            <TabsTrigger value="stuck">Stuck</TabsTrigger>
            <TabsTrigger value="empty">Empty Content</TabsTrigger>
            <TabsTrigger value="summits">Potential Summits</TabsTrigger>
            <TabsTrigger value="reprocessing">Reprocessing</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DiagnosticCardSimple
                title="Database Status"
                isSuccess={environmentStatus.database}
                successMessage="Database is operational"
                errorMessage="Database connection failed"
              />
              <DiagnosticCardSimple
                title="Storage Status"
                isSuccess={environmentStatus.storage}
                successMessage="Storage is operational"
                errorMessage="Storage connection failed"
              />
              <DiagnosticCardSimple
                title="Edge Functions Status"
                isSuccess={environmentStatus.edgeFunctions}
                successMessage="Edge functions are operational"
                errorMessage="Edge functions are not responding"
              />
            </div>

            <IssuesSummary 
              unprocessedCount={issuesSummary.unprocessed} 
              stuckCount={issuesSummary.stuck}
              emptyCount={issuesSummary.emptyContent}
              summitCount={issuesSummary.potentialSummits}
            />
          </TabsContent>

          <TabsContent value="unprocessed">
            <UnprocessedTranscripts 
              transcripts={transcripts.filter(t => !t.is_processed)}
              selectedTranscripts={[]}
              onSelectAll={handleSelectAll}
              onSelectTranscript={handleSelectTranscript}
              onViewTranscript={handleSelectTranscript}
              onProcessTranscript={handleRetryProcessing}
              isProcessing={false}
            />
          </TabsContent>

          <TabsContent value="stuck">
            <StuckTranscripts 
              transcripts={transcripts.filter(t => !t.is_processed && t.metadata?.processing_started_at)}
              onRetry={handleRetryProcessing} 
              isProcessing={false}
              processingProgress={0}
            />
          </TabsContent>

          <TabsContent value="empty">
            <EmptyContentTranscripts 
              transcripts={transcripts.filter(t => !t.content || t.content === '')}
              selectedTranscripts={[]}
              onSelectAll={handleSelectAll}
              onSelectTranscript={handleSelectTranscript}
              onViewTranscript={handleSelectTranscript}
              onFixTranscript={handleRetryProcessing}
              isProcessing={false}
            />
          </TabsContent>

          <TabsContent value="summits">
            <PotentialSummitTranscripts 
              transcripts={transcripts.filter(t => t.source?.includes('summit'))}
              onUpdateSource={handleUpdateSource} 
            />
          </TabsContent>

          <TabsContent value="reprocessing">
            <ReprocessingTab />
          </TabsContent>

          <TabsContent value="maintenance">
            <MaintenanceTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
