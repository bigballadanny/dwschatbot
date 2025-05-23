import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth/AuthContext';
import { useAdmin } from '@/contexts/admin/AdminContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { getTranscriptCounts } from "@/utils/transcriptUtils";
import UnifiedTranscriptManager from "@/components/UnifiedTranscriptManager";
import { Transcript as TranscriptType } from "@/utils/transcriptUtils";

interface Transcript extends TranscriptType {
  // Any additional properties specific to this file can be added here
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

const TranscriptsNew: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth to be ready before fetching data
    if (!authLoading) {
      if (user) {
        fetchTranscripts();
      } else {
        setIsLoading(false);
        setError("Authentication required. Please log in to view your transcripts.");
      }
    }
  }, [user, authLoading]);

  const fetchTranscripts = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // If user is admin, fetch all transcripts
      let query = supabase.from("transcripts").select("*");

      // Only filter by user_id if not admin
      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Convert Supabase response to our Transcript type
      setTranscripts(data ? mapSupabaseResponseToTranscript(data) : []);
    } catch (error: any) {
      console.error("Error fetching transcripts:", error);
      setError(`Failed to load transcripts: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Get counts for different transcript statuses
  const transcriptCounts = getTranscriptCounts(transcripts);

  // Render a different UI when there's an error
  if (error) {
    return (
      <div className="container py-6 max-w-6xl">
        <h1 className="text-3xl font-bold mb-6">Transcripts</h1>
        
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <div className="flex justify-between">
          <Button onClick={() => setError(null)} variant="outline">
            Try Again
          </Button>
          
          <Button onClick={fetchTranscripts}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  // Enhanced loading state with more information
  if (authLoading || adminLoading || isLoading && !error) {
    return (
      <div className="container py-6 max-w-6xl">
        <h1 className="text-3xl font-bold mb-6">Transcripts</h1>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          
          <Skeleton className="h-64 w-full" />
          
          <div className="text-center text-sm text-muted-foreground mt-4">
            {authLoading ? 'Authenticating user...' : 'Loading transcripts...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Transcripts</h1>
        <Button variant="outline" size="sm" onClick={fetchTranscripts}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {user && <div className="text-sm text-muted-foreground mb-4">Logged in as: {user.email}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center gap-2">
              Pending <Badge variant="outline">{transcriptCounts.unprocessed}</Badge>
            </CardTitle>
            <CardDescription>Transcripts waiting to be processed</CardDescription>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center gap-2">
              Processing <Badge variant="outline">{transcriptCounts.processing}</Badge>
            </CardTitle>
            <CardDescription>Transcripts currently being processed</CardDescription>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center gap-2">
              Completed <Badge variant="outline">{transcriptCounts.processed + transcriptCounts.summarized}</Badge>
            </CardTitle>
            <CardDescription>Successfully processed transcripts</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Transcript Management</CardTitle>
          <CardDescription>Upload, process, and manage transcripts in one place</CardDescription>
        </CardHeader>
        <CardContent>
          <UnifiedTranscriptManager 
            transcripts={transcripts}
            onRefresh={fetchTranscripts}
            isAdmin={isAdmin || false}
            userId={user?.id || ''}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default TranscriptsNew;