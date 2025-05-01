
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    
    console.log("[HEALTH] Starting transcript processing health check");
    
    // Check storage bucket configuration
    console.log("[HEALTH] Checking storage bucket configuration");
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    const transcriptsBucket = buckets?.find(b => b.name === 'transcripts');
    const storageIssues = [];
    
    if (bucketsError) {
      storageIssues.push(`Error accessing storage: ${bucketsError.message}`);
    }
    
    if (!transcriptsBucket) {
      storageIssues.push('Transcripts bucket does not exist');
    }
    
    // Check transcripts table and gather statistics
    console.log("[HEALTH] Gathering transcript statistics");
    const { data: transcripts, error: transcriptsError } = await supabase
      .from('transcripts')
      .select('id, title, content, is_processed, is_summarized, metadata, file_path')
      .order('created_at', { ascending: false });
      
    if (transcriptsError) {
      return new Response(JSON.stringify({ 
        status: 'error',
        message: `Error fetching transcripts: ${transcriptsError.message}`
      }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Calculate statistics
    const stats = {
      total: transcripts?.length || 0,
      processed: 0,
      unprocessed: 0,
      summarized: 0,
      withContent: 0,
      withoutContent: 0,
      stuck: 0,
      withErrors: 0
    };
    
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    
    transcripts?.forEach(transcript => {
      // Count processed/unprocessed transcripts
      if (transcript.is_processed) {
        stats.processed++;
      } else {
        stats.unprocessed++;
      }
      
      // Count summarized transcripts
      if (transcript.is_summarized) {
        stats.summarized++;
      }
      
      // Count transcripts with/without content
      if (transcript.content && transcript.content.trim() !== '') {
        stats.withContent++;
      } else {
        stats.withoutContent++;
      }
      
      // Count stuck transcripts
      const metadata = transcript.metadata || {};
      if (typeof metadata === 'object' && metadata.processing_started_at) {
        const processingStartedAt = new Date(metadata.processing_started_at as string);
        if (processingStartedAt < fiveMinutesAgo && !transcript.is_processed) {
          stats.stuck++;
        }
      }
      
      // Count transcripts with errors
      if (typeof metadata === 'object' && (metadata.processing_error || metadata.processing_failed)) {
        stats.withErrors++;
      }
    });
    
    // Check edge functions
    console.log("[HEALTH] Checking edge functions");
    const requiredFunctions = [
      'trigger-transcript-processing', 
      'process-transcript',
      'fix-transcript-paths',
      'transcript-processing-health'
    ];
    
    const functionIssues = [];
    const edgeFunctionStatus = {};
    
    // Check process-transcript function with a health check
    try {
      const { data: processTranscriptHealth, error: healthError } = await supabase.functions.invoke(
        'process-transcript', 
        { 
          body: { health_check: true }
        }
      );
      
      if (healthError) {
        functionIssues.push(`process-transcript health check failed: ${healthError.message}`);
        edgeFunctionStatus['process-transcript'] = 'error';
      } else {
        edgeFunctionStatus['process-transcript'] = processTranscriptHealth?.status || 'ok';
      }
    } catch (error) {
      functionIssues.push(`process-transcript health check error: ${error.message}`);
      edgeFunctionStatus['process-transcript'] = 'error';
    }
    
    // Compile all issues
    const issues = [...storageIssues, ...functionIssues];
    
    // Prepare recommendations
    const recommendations = [];
    
    if (stats.stuck > 0) {
      recommendations.push(`Retry ${stats.stuck} stuck transcripts using the diagnostic tool`);
    }
    
    if (stats.withoutContent > 0 && stats.withoutContent < 5) {
      recommendations.push(`Extract content for ${stats.withoutContent} transcript(s) with missing content`);
    } else if (stats.withoutContent >= 5) {
      recommendations.push(`Run batch content extraction for ${stats.withoutContent} transcripts with missing content`);
    }
    
    if (stats.unprocessed > 0) {
      recommendations.push(`Process ${stats.unprocessed} unprocessed transcripts`);
    }
    
    console.log("[HEALTH] Health check complete:", issues.length ? `${issues.length} issues found` : 'all systems operational');
    
    return new Response(JSON.stringify({
      status: issues.length ? 'issues_found' : 'healthy',
      timestamp: new Date().toISOString(),
      issues,
      recommendations,
      storage: {
        buckets: {
          transcripts: !!transcriptsBucket
        }
      },
      transcripts: stats,
      edgeFunctions: edgeFunctionStatus
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[HEALTH] Error in health check:', error);
    return new Response(JSON.stringify({ 
      status: 'error',
      message: error.message || 'Unknown error'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
