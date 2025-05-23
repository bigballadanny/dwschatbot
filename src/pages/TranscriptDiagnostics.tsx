
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
import { useAdmin } from "@/contexts/admin";
import { checkEnvironmentStatus } from '@/utils/diagnostics/environmentCheck';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, HelpCircle } from "lucide-react";
import { DiagnosticTranscript } from '@/utils/diagnostics/transcriptIssues';

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

  // Updated to match the expected function signature
  const handleSelectAll = (transcripts: DiagnosticTranscript[], selected: boolean) => {
    console.log('Select all transcripts:', selected, transcripts.length);
  };

  // Updated to include the required parameter
  const handleProcessingProgress = () => {
    console.log('Processing progress update');
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
          <Button 
            variant="outlineHover" 
            size="sm" 
            iconLeft={<HelpCircle className="h-4 w-4" />}
          >
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
                value={environmentStatus.database ? "Operational" : "Not Connected"}
                variant={environmentStatus.database ? "success" : "error"}
              />
              <DiagnosticCardSimple
                title="Storage Status"
                value={environmentStatus.storage ? "Operational" : "Not Connected"}
                variant={environmentStatus.storage ? "success" : "error"}
              />
              <DiagnosticCardSimple
                title="Edge Functions Status"
                value={environmentStatus.edgeFunctions ? "Operational" : "Not Connected"}
                variant={environmentStatus.edgeFunctions ? "success" : "error"}
              />
            </div>

            <IssuesSummary 
              stats={{
                total: transcripts.length,
                unprocessedTranscripts: issuesSummary.unprocessed,
                stuckInProcessing: issuesSummary.stuck,
                emptyContent: issuesSummary.emptyContent,
                potentialSummitTranscripts: issuesSummary.potentialSummits,
                missingFilePath: 0,
                recentlyUploaded: 0,
                businessSummitTranscripts: 0,
                processingFailures: 0
              }}
            />
          </TabsContent>

          <TabsContent value="unprocessed">
            <UnprocessedTranscripts 
              transcripts={transcripts.filter(t => !t.is_processed)}
              selectedTranscripts={[]}
              onSelectAll={handleSelectAll}
              onSelectTranscript={(id, isSelected) => console.log('Selected:', id, isSelected)}
              onProcessTranscript={handleSelectTranscript}
              isProcessing={false}
              onProgress={handleProcessingProgress}
            />
          </TabsContent>

          <TabsContent value="stuck">
            <StuckTranscripts 
              transcripts={transcripts.filter(t => !t.is_processed && t.metadata?.processing_started_at)}
              onRetry={handleSelectTranscript} 
              isProcessing={false}
              processingProgress={0}
            />
          </TabsContent>

          <TabsContent value="empty">
            <EmptyContentTranscripts 
              transcripts={transcripts.filter(t => !t.content || t.content === '')}
              selectedTranscripts={[]}
              onSelectAll={handleSelectAll}
              onSelectTranscript={(id, isSelected) => console.log('Selected:', id, isSelected)}
              onFixTranscript={handleSelectTranscript}
              isProcessing={false}
              onProgress={handleProcessingProgress}
            />
          </TabsContent>

          <TabsContent value="summits">
            <PotentialSummitTranscripts 
              transcripts={transcripts.filter(t => t.source?.includes('summit'))}
              onUpdateSource={(id, source) => console.log('Update source:', id, source)} 
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
