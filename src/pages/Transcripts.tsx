import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Tag, Upload, X, RefreshCw, Search, Filter, AlertTriangle, Trash2, Info, BarChart, Sparkles, CheckCircle, HelpCircle, Clock, Loader2 } from "lucide-react";
import TranscriptStatusIndicator, { TranscriptStatus } from "@/components/TranscriptStatusIndicator";
import TranscriptDetailProgress from "@/components/TranscriptDetailProgress";
import TagFilter from "@/components/TagFilter";
import BulkTranscriptManager from "@/components/BulkTranscriptManager";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/contexts/auth/AuthContext';
import { useAdmin } from '@/contexts/admin/AdminContext';
import { showSuccess, showError, showWarning } from "@/utils/toastUtils";
import { useTranscriptSummaries } from "@/hooks/transcripts/useTranscriptSummaries";
import { getTranscriptCounts, getSourceCategories, formatTagForDisplay, suggestTagsFromContent, Transcript as TranscriptType } from "@/utils/transcriptUtils";
import TranscriptUploader from "@/components/TranscriptUploader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import DeleteTranscriptDialog from "@/components/DeleteTranscriptDialog";
import { Json } from '@/integrations/supabase/types';

// Update the Transcript interface to match the one from transcriptUtils
interface Transcript extends TranscriptType {
  // Any additional properties specific to this file can be added here
}

interface TranscriptSummary {
  id: string;
  summary: string;
  key_points?: any;
  created_at: string;
}

// Helper function to convert Supabase response to Transcript type
const mapSupabaseResponseToTranscript = (data: any[]): Transcript[] => {
  return data.map(item => ({
    id: item.id,
    title: item.title,
    source: item.source,
    created_at: item.created_at,
    content: item.content,
    file_path: item.file_path,
    file_type: item.file_type,
    tags: item.tags,
    is_processed: item.is_processed,
    is_summarized: item.is_summarized,
    updated_at: item.updated_at,
    user_id: item.user_id,
    metadata: item.metadata as Record<string, any>
  }));
};

const TranscriptsPage = () => {
  // Use the useAuth hook instead of UserContext
  const {
    user,
    isLoading: authLoading
  } = useAuth();
  const {
    isAdmin,
    isLoading: adminLoading
  } = useAdmin();
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [filteredTranscripts, setFilteredTranscripts] = useState<Transcript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [transcriptSummary, setTranscriptSummary] = useState<TranscriptSummary | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showBulkTagDialog, setShowBulkTagDialog] = useState(false);
  const [selectedTranscripts, setSelectedTranscripts] = useState<string[]>([]);
  const [bulkTags, setBulkTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [processingStatus, setProcessingStatus] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transcriptToDelete, setTranscriptToDelete] = useState<Transcript | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReprocessingAll, setIsReprocessingAll] = useState(false);
  const [reprocessingProgress, setReprocessingProgress] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    inProgress: false
  });
  const {
    progress,
    batchSummarizeTranscripts,
    cancelBatchProcessing
  } = useTranscriptSummaries({
    userId: user?.id || '',
    maxConcurrent: 2
  });

  // Add more detailed logging to help diagnose issues
  useEffect(() => {
    console.log("Auth state:", {
      user,
      authLoading
    });
    console.log("Admin state:", {
      isAdmin,
      adminLoading
    });

    // Wait for auth to be ready before fetching data
    if (!authLoading) {
      if (user) {
        console.log("User authenticated, fetching transcripts for user:", user.id);
        fetchTranscripts();
      } else {
        console.log("No authenticated user found");
        setIsLoading(false);
        setError("Authentication required. Please log in to view your transcripts.");
      }
    }
  }, [user, authLoading]);
  useEffect(() => {
    filterTranscripts();
  }, [searchQuery, selectedSource, transcripts, activeTab]);
  const fetchTranscripts = async () => {
    if (!user) {
      console.log("No user available for fetching transcripts");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      console.log("Starting transcript fetch for user:", user.id);

      // If user is admin, fetch all transcripts
      let query = supabase.from("transcripts").select("*");

      // Only filter by user_id if not admin
      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      }
      const {
        data,
        error
      } = await query.order("created_at", {
        ascending: false
      });
      if (error) {
        console.error("Error fetching transcripts:", error);
        throw error;
      }
      console.log(`Successfully fetched ${data?.length || 0} transcripts`);
      
      // Convert Supabase response to our Transcript type
      setTranscripts(data ? mapSupabaseResponseToTranscript(data) : []);
      
    } catch (error: any) {
      console.error("Error in fetchTranscripts:", error);
      setError(`Failed to load transcripts: ${error.message || "Unknown error"}`);
      showError("Failed to load transcripts", error.message);
    } finally {
      setIsLoading(false);
    }
  };
  const refreshTranscripts = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      console.log("Refreshing transcripts for user:", user.id);

      // If user is admin, fetch all transcripts
      let query = supabase.from("transcripts").select("*");

      // Only filter by user_id if not admin
      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      }
      const {
        data,
        error
      } = await query.order("created_at", {
        ascending: false
      });
      if (error) throw error;
      console.log(`Refresh complete. Found ${data?.length || 0} transcripts`);
      
      // Convert Supabase response to our Transcript type
      setTranscripts(data ? mapSupabaseResponseToTranscript(data) : []);
      
    } catch (error: any) {
      console.error("Error refreshing transcripts:", error);
      setError(`Failed to refresh transcripts: ${error.message || "Unknown error"}`);
      showError("Failed to refresh transcripts", error.message);
    } finally {
      setIsLoading(false);
    }
  };
  const filterTranscripts = () => {
    // If we're on the bulk tab, don't filter anything
    if (activeTab === "bulk") {
      return;
    }
    
    let filtered = [...transcripts];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => t.title.toLowerCase().includes(query) || t.tags && t.tags.some(tag => tag.toLowerCase().includes(query)));
    }

    // Filter by source
    if (selectedSource !== "all") {
      filtered = filtered.filter(t => t.source === selectedSource);
    }

    // Filter by tab
    if (activeTab === "unprocessed") {
      filtered = filtered.filter(t => t.is_processed === false);
    } else if (activeTab === "processed") {
      filtered = filtered.filter(t => t.is_processed === true);
    } else if (activeTab === "summarized") {
      filtered = filtered.filter(t => t.is_summarized === true);
    }
    setFilteredTranscripts(filtered);
  };
  const fetchTranscriptSummary = async (transcriptId: string) => {
    if (!transcriptId) return;
    setIsSummaryLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.from("transcript_summaries").select("*").eq("transcript_id", transcriptId).single();
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      setTranscriptSummary(data || null);
    } catch (error: any) {
      console.error("Error fetching summary:", error);
    } finally {
      setIsSummaryLoading(false);
    }
  };
  const handleTranscriptSelect = async (transcript: Transcript) => {
    setSelectedTranscript(transcript);
    await fetchTranscriptSummary(transcript.id);
  };
  const handleTagAdd = async (transcriptId: string, tag: string) => {
    if (!tag.trim()) return;
    const transcript = transcripts.find(t => t.id === transcriptId);
    if (!transcript) return;
    const currentTags = transcript.tags || [];
    if (currentTags.includes(tag)) return;
    const updatedTags = [...currentTags, tag];
    try {
      const {
        error
      } = await supabase.from("transcripts").update({
        tags: updatedTags
      }).eq("id", transcriptId);
      if (error) throw error;

      // Update local state
      setTranscripts(prev => prev.map(t => t.id === transcriptId ? {
        ...t,
        tags: updatedTags
      } : t));
      if (selectedTranscript?.id === transcriptId) {
        setSelectedTranscript({
          ...selectedTranscript,
          tags: updatedTags
        });
      }
      showSuccess("Tag added", `Added tag "${tag}" to transcript`);
    } catch (error: any) {
      console.error("Error adding tag:", error);
      showError("Failed to add tag", error.message);
    }
  };
  const handleTagRemove = async (transcriptId: string, tagToRemove: string) => {
    const transcript = transcripts.find(t => t.id === transcriptId);
    if (!transcript || !transcript.tags) return;
    const updatedTags = transcript.tags.filter(tag => tag !== tagToRemove);
    try {
      const {
        error
      } = await supabase.from("transcripts").update({
        tags: updatedTags
      }).eq("id", transcriptId);
      if (error) throw error;

      // Update local state
      setTranscripts(prev => prev.map(t => t.id === transcriptId ? {
        ...t,
        tags: updatedTags
      } : t));
      if (selectedTranscript?.id === transcriptId) {
        setSelectedTranscript({
          ...selectedTranscript,
          tags: updatedTags
        });
      }
      showSuccess("Tag removed", `Removed tag "${tagToRemove}" from transcript`);
    } catch (error: any) {
      console.error("Error removing tag:", error);
      showError("Failed to remove tag", error.message);
    }
  };
  const handleBulkTagsSubmit = async () => {
    if (!bulkTags.length || !selectedTranscripts.length) {
      showWarning("No action taken", "Please select both transcripts and tags");
      return;
    }
    try {
      let successCount = 0;
      for (const transcriptId of selectedTranscripts) {
        const transcript = transcripts.find(t => t.id === transcriptId);
        if (!transcript) continue;
        const currentTags = transcript.tags || [];
        const newTags = [...new Set([...currentTags, ...bulkTags])];
        const {
          error
        } = await supabase.from("transcripts").update({
          tags: newTags
        }).eq("id", transcriptId);
        if (error) throw error;
        successCount++;
      }

      // Update local state
      await fetchTranscripts();
      showSuccess("Tags applied", `Applied ${bulkTags.length} tags to ${successCount} transcripts`);
      setShowBulkTagDialog(false);
      setSelectedTranscripts([]);
      setBulkTags([]);
    } catch (error: any) {
      console.error("Error applying bulk tags:", error);
      showError("Failed to apply tags", error.message);
    }
  };
  const handleBulkSummarize = async () => {
    if (!selectedTranscripts.length) {
      showWarning("No transcripts selected", "Please select at least one transcript to summarize");
      return;
    }
    await batchSummarizeTranscripts(selectedTranscripts);
  };
  const handleTranscriptSelection = (transcriptId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedTranscripts(prev => [...prev, transcriptId]);
    } else {
      setSelectedTranscripts(prev => prev.filter(id => id !== transcriptId));
    }
  };
  const handleSelectAllTranscripts = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedTranscripts(filteredTranscripts.map(t => t.id));
    } else {
      setSelectedTranscripts([]);
    }
  };
  const handleTagSuggestions = async (transcriptId: string) => {
    const transcript = transcripts.find(t => t.id === transcriptId);
    if (!transcript || !transcript.content) {
      showWarning("Cannot suggest tags", "No content available for analysis");
      return;
    }
    const suggestedTags = suggestTagsFromContent(transcript.content);
    if (!suggestedTags.length) {
      showWarning("No tags suggested", "Could not identify relevant tags from content");
      return;
    }
    const currentTags = transcript.tags || [];
    const newTags = [...new Set([...currentTags, ...suggestedTags])];
    try {
      const {
        error
      } = await supabase.from("transcripts").update({
        tags: newTags
      }).eq("id", transcriptId);
      if (error) throw error;

      // Update local state
      setTranscripts(prev => prev.map(t => t.id === transcriptId ? {
        ...t,
        tags: newTags
      } : t));
      if (selectedTranscript?.id === transcriptId) {
        setSelectedTranscript({
          ...selectedTranscript,
          tags: newTags
        });
      }
      showSuccess("Tags suggested", `Added ${newTags.length - currentTags.length} suggested tags`);
    } catch (error: any) {
      console.error("Error adding suggested tags:", error);
      showError("Failed to add tags", error.message);
    }
  };

  // New function to handle transcript deletion
  const handleDeleteTranscript = (transcript: Transcript, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    if (!isAdmin) {
      showError("Permission Denied", "Only administrators can delete transcripts.");
      return;
    }
    setTranscriptToDelete(transcript);
    setDeleteDialogOpen(true);
  };

  // Function to perform the actual deletion
  const confirmDeleteTranscript = async () => {
    if (!transcriptToDelete || !isAdmin) return;
    setIsDeleting(true);
    try {
      console.log(`Deleting transcript ${transcriptToDelete.id} and related data`);

      // First, delete any associated summaries
      const {
        error: summaryError
      } = await supabase.from('transcript_summaries').delete().eq('transcript_id', transcriptToDelete.id);
      if (summaryError) {
        console.error("Error deleting transcript summaries:", summaryError);
        throw summaryError;
      }

      // Then delete the transcript itself
      const {
        error: transcriptError
      } = await supabase.from('transcripts').delete().eq('id', transcriptToDelete.id);
      if (transcriptError) {
        console.error("Error deleting transcript:", transcriptError);
        throw transcriptError;
      }

      // If the transcript has a file path, delete the file from storage
      if (transcriptToDelete.file_path) {
        const filePath = transcriptToDelete.file_path.replace('transcripts/', '');
        const {
          error: storageError
        } = await supabase.storage.from('transcripts').remove([filePath]);
        if (storageError) {
          console.warn("Could not delete associated file:", storageError);
          // We continue even if file deletion fails
        }
      }

      // Remove the transcript from local state
      setTranscripts(prev => prev.filter(t => t.id !== transcriptToDelete.id));

      // If the deleted transcript was selected, clear the selection
      if (selectedTranscript?.id === transcriptToDelete.id) {
        setSelectedTranscript(null);
        setTranscriptSummary(null);
      }
      showSuccess("Transcript Deleted", `Successfully deleted "${transcriptToDelete.title}"`);

      // Close the dialog and reset the transcript to delete
      setDeleteDialogOpen(false);
      setTranscriptToDelete(null);
    } catch (error: any) {
      console.error("Error deleting transcript:", error);
      showError("Delete Failed", error.message || "An unknown error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  // Add a new function to trigger hierarchical chunking for a transcript
  const triggerHierarchicalChunking = async (transcriptId: string) => {
    try {
      // Use the reprocessTranscript utility function which has proper implementation
      // and error handling for hierarchical chunking
      const { reprocessTranscript } = await import('@/utils/diagnostics/reprocessTranscripts');
      
      const result = await reprocessTranscript(transcriptId);
      
      if (result) {
        showSuccess("Processing started", "Transcript is now being processed with hierarchical chunking");
        
        // Wait a bit and then fetch the updated transcript
        setTimeout(() => {
          refreshTranscripts();
        }, 3000);
      } else {
        throw new Error("Processing failed");
      }
    } catch (error: any) {
      console.error('Error triggering hierarchical chunking:', error);
      showError("Processing failed", error.message || "An unknown error occurred");
    }
  };

  // Function to reprocess all unprocessed transcripts
  const reprocessAllTranscripts = async () => {
    // Get all unprocessed transcripts
    const unprocessedTranscripts = transcripts.filter(t => !t.is_processed);
    
    if (unprocessedTranscripts.length === 0) {
      showWarning("No unprocessed transcripts", "All transcripts have already been processed");
      return;
    }

    setIsReprocessingAll(true);
    setReprocessingProgress({
      total: unprocessedTranscripts.length,
      completed: 0,
      failed: 0,
      inProgress: true
    });

    const { reprocessTranscript } = await import('@/utils/diagnostics/reprocessTranscripts');
    
    let successCount = 0;
    let failCount = 0;

    // Process transcripts one by one to avoid overwhelming the server
    for (const transcript of unprocessedTranscripts) {
      try {
        const result = await reprocessTranscript(transcript.id);
        
        if (result) {
          successCount++;
          setReprocessingProgress(prev => ({
            ...prev,
            completed: prev.completed + 1
          }));
        } else {
          failCount++;
          setReprocessingProgress(prev => ({
            ...prev,
            failed: prev.failed + 1
          }));
        }
      } catch (error) {
        console.error(`Error reprocessing transcript ${transcript.id}:`, error);
        failCount++;
        setReprocessingProgress(prev => ({
          ...prev,
          failed: prev.failed + 1
        }));
      }

      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsReprocessingAll(false);
    setReprocessingProgress(prev => ({
      ...prev,
      inProgress: false
    }));

    // Show completion message
    if (successCount > 0) {
      showSuccess(
        "Reprocessing complete", 
        `Successfully processed ${successCount} transcripts` + 
        (failCount > 0 ? ` (${failCount} failed)` : '')
      );
    } else {
      showError("Reprocessing failed", "Failed to process any transcripts");
    }

    // Refresh the transcript list
    await refreshTranscripts();
  };

  const getTranscriptStatus = (transcript: Transcript): TranscriptStatus => {
    // Check for empty content
    if (!transcript.content || transcript.content.trim() === '') {
      return 'empty';
    }

    // Check for processing failure
    if (transcript.metadata && typeof transcript.metadata === 'object' && 
        (transcript.metadata.processing_failed || transcript.metadata.processing_error)) {
      return 'failed';
    }

    // Check for stuck transcripts
    if (!transcript.is_processed && transcript.metadata && typeof transcript.metadata === 'object' && 
        transcript.metadata.processing_started_at) {
      const startedAt = new Date(transcript.metadata.processing_started_at as string);
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
      
      if (startedAt < fiveMinutesAgo) {
        return 'stuck';
      }
      return 'processing';
    }
    
    // Normal status flow
    if (!transcript.is_processed) {
      return 'unprocessed';
    } else if (!transcript.is_summarized) {
      return 'processed';
    } else {
      return 'summarized';
    }
  };
  const transcriptCounts = getTranscriptCounts(transcripts);
  const sourceCategories = getSourceCategories();

  // Render a different UI when there's an error
  if (error) {
    return <div className="container py-6 max-w-6xl">
        <h1 className="text-3xl font-bold mb-6">Transcripts</h1>
        
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <div className="flex justify-between">
          <Button onClick={() => setError(null)} variant="outline">
            Try Again
          </Button>
          
          <Button onClick={refreshTranscripts}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>;
  }

  // Enhanced loading state with more information
  if (authLoading || adminLoading || isLoading && !error) {
    return <div className="container py-6 max-w-6xl">
        <h1 className="text-3xl font-bold mb-6">Transcripts</h1>
        <div className="space-y-4">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-full">
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="w-64">
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          
          {[1, 2, 3].map(i => <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardContent>
            </Card>)}
          
          <div className="text-center text-sm text-muted-foreground mt-4">
            {authLoading ? 'Authenticating user...' : 'Loading transcripts...'}
          </div>
        </div>
      </div>;
  }
  return <div className="container py-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold mb-6">Transcripts</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={refreshTranscripts}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowBulkTagDialog(true)}>
            <Tag className="h-4 w-4 mr-2" />
            Bulk Tag
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.href = '/transcript-diagnostics'}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Diagnostics
          </Button>
        </div>
      </div>

      {/* Fix: Changed from rendering the User object directly to showing user info safely */}
      {user && <div className="text-sm text-muted-foreground mb-4">Logged in as: {user.email}</div>}

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search transcripts..." className="pl-8" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <TagFilter 
            onTagAdded={(tag) => setSearchQuery(tag)}
            title="Filter by tag"
          />
          <div className="w-48">
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {getSourceCategories().map(category => <SelectItem key={category.id} value={category.id}>
                    {category.label}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Reprocessing Progress Bar */}
      {reprocessingProgress.inProgress && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Reprocessing Transcripts</h3>
                <span className="text-sm text-muted-foreground">
                  {reprocessingProgress.completed + reprocessingProgress.failed} / {reprocessingProgress.total}
                </span>
              </div>
              <Progress 
                value={(reprocessingProgress.completed + reprocessingProgress.failed) / reprocessingProgress.total * 100} 
              />
              <div className="flex justify-between text-sm">
                <span className="text-green-600">
                  {reprocessingProgress.completed} completed
                </span>
                {reprocessingProgress.failed > 0 && (
                  <span className="text-red-600">
                    {reprocessingProgress.failed} failed
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reprocess All Button for unprocessed transcripts */}
      {transcripts.filter(t => !t.is_processed).length > 0 && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              You have {transcripts.filter(t => !t.is_processed).length} unprocessed transcripts.
            </span>
            <Button 
              size="sm" 
              onClick={reprocessAllTranscripts}
              disabled={isReprocessingAll}
            >
              {isReprocessingAll ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reprocess All Transcripts
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">
            All ({transcripts.length})
          </TabsTrigger>
          <TabsTrigger value="unprocessed">
            Unprocessed ({transcripts.filter(t => !t.is_processed).length})
          </TabsTrigger>
          <TabsTrigger value="processed">
            Processed ({transcripts.filter(t => t.is_processed).length})
          </TabsTrigger>
          <TabsTrigger value="summarized">
            Summarized ({transcripts.filter(t => t.is_summarized).length})
          </TabsTrigger>
          <TabsTrigger value="bulk">
            Bulk Management
          </TabsTrigger>
        </TabsList>

        <div className="grid md:grid-cols-[1fr_2fr] gap-6 mt-6">
          <div className="space-y-6">
            <div className="border rounded-lg p-4">
              {user && <TranscriptUploader userId={user.id} onUploadComplete={id => {
              refreshTranscripts();
            }} />}
            </div>
            
            {selectedTranscript && <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium">Selected Transcript</h3>
                  {isAdmin && <Button variant="destructive" size="sm" onClick={e => handleDeleteTranscript(selectedTranscript, e)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Title</p>
                  <p className="text-sm text-muted-foreground">{selectedTranscript.title}</p>
                  
                  <p className="text-sm font-medium">Source</p>
                  <p className="text-sm text-muted-foreground">
                    {sourceCategories.find(s => s.id === selectedTranscript.source)?.label || selectedTranscript.source || 'Unknown'}
                  </p>
                  
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedTranscript.created_at).toLocaleString()}
                  </p>
                  
                  <TranscriptDetailProgress
                    transcriptId={selectedTranscript.id}
                    metadata={selectedTranscript.metadata as Record<string, any>}
                    isProcessed={selectedTranscript.is_processed}
                    isSummarized={selectedTranscript.is_summarized}
                    onRefresh={() => handleTranscriptSelect(selectedTranscript)}
                    className="mt-4 mb-2"
                  />
                  
                  {/* Add Hierarchical Chunking Button */}
                  <div className="flex justify-between items-center pt-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => triggerHierarchicalChunking(selectedTranscript.id)}
                    >
                      Process with Hierarchical Chunking
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.location.href = `/transcript-diagnostics?id=${selectedTranscript.id}`}>
                      View Diagnostics
                    </Button>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mt-4">
                      <p className="text-sm font-medium">Tags</p>
                      <Button variant="ghost" size="sm" onClick={() => handleTagSuggestions(selectedTranscript.id)}>
                        Suggest
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedTranscript.tags && selectedTranscript.tags.length > 0 ? selectedTranscript.tags.map(tag => <Badge key={tag} variant="outline" className="flex items-center gap-1">
                            {formatTagForDisplay(tag)}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => handleTagRemove(selectedTranscript.id, tag)} />
                          </Badge>) : <p className="text-sm text-muted-foreground">No tags</p>}
                    </div>
                    <div className="flex items-center mt-2">
                      <Input placeholder="Add tag..." value={newTag} onChange={e => setNewTag(e.target.value)} className="text-sm h-8" onKeyDown={e => {
                    if (e.key === 'Enter' && newTag) {
                      handleTagAdd(selectedTranscript.id, newTag);
                      setNewTag('');
                    }
                  }} />
                      <Button size="sm" variant="ghost" onClick={() => {
                    if (newTag) {
                      handleTagAdd(selectedTranscript.id, newTag);
                      setNewTag('');
                    }
                  }}>
                        Add
                      </Button>
                    </div>
                  </div>
                  
                  {/* ... keep existing code (summary section) */}
                </div>
              </div>}
          </div>

          <div>
            {filteredTranscripts.length === 0 ? <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No transcripts found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || selectedSource !== "all" ? "Try adjusting your filters" : "Upload a transcript to get started"}
                </p>
              </div> : <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <Checkbox id="select-all" checked={selectedTranscripts.length === filteredTranscripts.length && filteredTranscripts.length > 0} onCheckedChange={handleSelectAllTranscripts} />
                    <Label htmlFor="select-all" className="ml-2">
                      Select All ({filteredTranscripts.length})
                    </Label>
                  </div>
                  
                  {selectedTranscripts.length > 0 && <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {selectedTranscripts.length} selected
                      </span>
                      <Button size="sm" variant="outline" onClick={handleBulkSummarize} disabled={progress.inProgress}>
                        Summarize Selected
                      </Button>
                    </div>}
                </div>
                
                {progress.inProgress && <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Processing {progress.completed} of {progress.total}</span>
                      <Button variant="ghost" size="sm" onClick={cancelBatchProcessing}>
                        Cancel
                      </Button>
                    </div>
                    <Progress value={progress.completed / progress.total * 100} />
                  </div>}
                
                {filteredTranscripts.map(transcript => <Card 
                    key={transcript.id} 
                    className={`cursor-pointer transition-colors ${selectedTranscript?.id === transcript.id ? 'border-primary' : ''} ${!transcript.is_processed ? 'bg-amber-50/30 dark:bg-amber-950/10' : transcript.is_summarized ? 'bg-blue-50/30 dark:bg-blue-950/10' : ''}`} 
                    onClick={() => handleTranscriptSelect(transcript)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Checkbox checked={selectedTranscripts.includes(transcript.id)} onCheckedChange={checked => {
                        handleTranscriptSelection(transcript.id, !!checked);
                      }} onClick={e => e.stopPropagation()} />
                            {transcript.title}
                            <TranscriptStatusIndicator status={getTranscriptStatus(transcript)} showText={false} size="sm" />
                          </CardTitle>
                          <CardDescription>
                            {sourceCategories.find(s => s.id === transcript.source)?.label || transcript.source || 'Unknown'} • 
                            {new Date(transcript.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        
                        {isAdmin && <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={e => handleDeleteTranscript(transcript, e)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>}
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex flex-wrap gap-1">
                        {transcript.tags && transcript.tags.map(tag => <Badge key={tag} variant="outline">
                            {formatTagForDisplay(tag)}
                          </Badge>)}
                        {(!transcript.tags || transcript.tags.length === 0) && <span className="text-sm text-muted-foreground">No tags</span>}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <div className="flex justify-between w-full text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5 opacity-70" />
                          {transcript.content?.length ? `${Math.round(transcript.content.length / 1000)}K chars` : 'No content'}
                        </span>
                        <span>
                          <TranscriptStatusIndicator 
                            status={getTranscriptStatus(transcript)} 
                            showText={true} 
                            showTooltip={false} 
                            size="sm" 
                          />
                        </span>
                      </div>
                    </CardFooter>
                  </Card>)}
              </div>}
          </div>
        </div>
        
        {activeTab === "bulk" && (
          <div className="mt-6">
            <BulkTranscriptManager
              transcripts={transcripts}
              onUpdate={refreshTranscripts}
              isAdmin={isAdmin}
              userId={user?.id || ''}
            />
          </div>
        )}
      </Tabs>
      
      {/* Delete Transcript Dialog */}
      {transcriptToDelete && <DeleteTranscriptDialog isOpen={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirmDelete={confirmDeleteTranscript} title={transcriptToDelete.title} isDeleting={isDeleting} />}
      
      {showBulkTagDialog && <Dialog open={showBulkTagDialog} onOpenChange={setShowBulkTagDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Tag Transcripts</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Selected Transcripts ({selectedTranscripts.length})</Label>
                <div className="mt-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  {selectedTranscripts.length === 0 ? <p className="text-sm text-muted-foreground">No transcripts selected</p> : selectedTranscripts.map(id => {
                const transcript = transcripts.find(t => t.id === id);
                return <div key={id} className="text-sm flex justify-between items-center py-1">
                          <span>{transcript?.title || id}</span>
                          <X className="h-4 w-4 cursor-pointer" onClick={() => handleTranscriptSelection(id, false)} />
                        </div>;
              })}
                </div>
              </div>
              
              <div>
                <Label>Tags to Apply</Label>
                <div className="flex flex-wrap gap-1 mt-2">
                  {bulkTags.map(tag => <Badge key={tag} variant="outline" className="flex items-center gap-1">
                      {formatTagForDisplay(tag)}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setBulkTags(prev => prev.filter(t => t !== tag))} />
                    </Badge>)}
                </div>
                <div className="flex items-center mt-2">
                  <Input placeholder="Add tag..." value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => {
                if (e.key === 'Enter' && newTag) {
                  setBulkTags(prev => [...new Set([...prev, newTag])]);
                  setNewTag('');
                }
              }} />
                  <Button className="ml-2" variant="outline" onClick={() => {
                if (newTag) {
                  setBulkTags(prev => [...new Set([...prev, newTag])]);
                  setNewTag('');
                }
              }}>
                    Add
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowBulkTagDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkTagsSubmit} disabled={bulkTags.length === 0 || selectedTranscripts.length === 0}>
                  Apply Tags
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>}
    </div>;
};
export default TranscriptsPage;
