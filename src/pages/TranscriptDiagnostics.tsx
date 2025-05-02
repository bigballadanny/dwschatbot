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
import { TranscriptChunk } from '@/hooks/useTranscriptDetails';

// Since we're missing some utility functions, let's create them:

// A simple function to check environment status
const checkEnvironmentStatus = async () => {
  try {
    // Test database connection
    const { data: dbTest, error: dbError } = await supabase
      .from('transcripts')
      .select('count(*)', { count: 'exact', head: true });

    // Test storage connection
    const { data: storageTest, error: storageError } = await supabase.storage
      .getBucket('transcripts');

    // Test edge functions connection (simplified test)
    const edgeFunctionTest = await fetch(`${process.env.SUPABASE_URL}/functions/v1/health-check`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      },
    }).then(res => res.ok).catch(() => false);

    return {
      database: !dbError,
      storage: !storageError,
      edgeFunctions: edgeFunctionTest,
    };
  } catch (error) {
    console.error('Error checking environment:', error);
    return {
      database: false,
      storage: false,
      edgeFunctions: false,
    };
  }
};

// A simple function to get transcript issues
const getTranscriptIssues = async () => {
  try {
    const { data: unprocessed } = await supabase
      .from('transcripts')
      .select('count(*)', { count: 'exact', head: true })
      .eq('is_processed', false);

    const { data: stuck } = await supabase
      .from('transcripts')
      .select('count(*)', { count: 'exact', head: true })
      .eq('is_processed', false)
      .not('metadata->processing_started_at', 'is', null);

    const { data: empty } = await supabase
      .from('transcripts')
      .select('count(*)', { count: 'exact', head: true })
      .or('content.is.null,content.eq.');

    // Default example data for potential summit transcripts
    const potentialSummits = 0;

    return {
      unprocessed: unprocessed?.count || 0,
      stuck: stuck?.count || 0,
      emptyContent: empty?.count || 0,
      potentialSummits,
    };
  } catch (error) {
    console.error('Error fetching transcript issues:', error);
    return {
      unprocessed: 0,
      stuck: 0,
      emptyContent: 0,
      potentialSummits: 0,
    };
  }
};

interface EnvironmentStatus {
  database: boolean;
  storage: boolean;
  edgeFunctions: boolean;
}

export default function TranscriptDiagnostics() {
  const [selectedTranscriptId, setSelectedTranscriptId] = useState<string | null>(null);
  const [environmentStatus, setEnvironmentStatus] = useState<EnvironmentStatus>({
    database: false,
    storage: false,
    edgeFunctions: false,
  });
  const [issuesSummary, setIssuesSummary] = useState<{
    unprocessed: number;
    stuck: number;
    emptyContent: number;
    potentialSummits: number;
  }>({
    unprocessed: 0,
    stuck: 0,
    emptyContent: 0,
    potentialSummits: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const transcriptId = urlParams.get('id');
    setSelectedTranscriptId(transcriptId);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchEnvironmentStatus(), fetchIssuesSummary()]);
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
  }, [isAdminLoading, fetchEnvironmentStatus, fetchIssuesSummary, toast]);

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

  const handleCloseDetails = () => {
    setSelectedTranscriptId(null);
  };

  const handleRefreshDetails = () => {
    setSelectedTranscriptId(null);
    const urlParams = new URLSearchParams(window.location.search);
    const transcriptId = urlParams.get('id');
    setSelectedTranscriptId(transcriptId);
  };

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
              <DiagnosticCard
                title="Database Status"
                status={environmentStatus.database}
                successMessage="Database is operational"
                errorMessage="Database connection failed"
              />
              <DiagnosticCard
                title="Storage Status"
                status={environmentStatus.storage}
                successMessage="Storage is operational"
                errorMessage="Storage connection failed"
              />
              <DiagnosticCard
                title="Edge Functions Status"
                status={environmentStatus.edgeFunctions}
                successMessage="Edge functions are operational"
                errorMessage="Edge functions are not responding"
              />
            </div>

            <IssuesSummary issues={issuesSummary} />
          </TabsContent>

          <TabsContent value="unprocessed">
            <UnprocessedTranscripts />
          </TabsContent>

          <TabsContent value="stuck">
            <StuckTranscripts />
          </TabsContent>

          <TabsContent value="empty">
            <EmptyContentTranscripts />
          </TabsContent>

          <TabsContent value="summits">
            <PotentialSummitTranscripts />
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
