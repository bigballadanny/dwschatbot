
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

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
    console.log("[HEALTH] Starting transcript processing health check");
    
    // Create Supabase client with the service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    
    // Check 1: Storage bucket exists and is configured correctly
    console.log("[HEALTH] Checking storage bucket configuration");
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      throw new Error(`Storage bucket check failed: ${bucketsError.message}`);
    }
    
    const transcriptsBucket = buckets?.find(bucket => bucket.name === 'transcripts');
    const bucketStatus = {
      exists: !!transcriptsBucket,
      isPublic: transcriptsBucket?.public ?? false,
      error: null
    };
    
    // Check 2: Transcript table statistics
    console.log("[HEALTH] Gathering transcript statistics");
    const { data: transcripts, error: transcriptsError } = await supabase
      .from('transcripts')
      .select('id, is_processed, content, file_path, metadata, created_at');
    
    if (transcriptsError) {
      throw new Error(`Transcript table check failed: ${transcriptsError.message}`);
    }
    
    // Calculate statistics
    const now = new Date();
    const total = transcripts?.length || 0;
    const processed = transcripts?.filter(t => t.is_processed).length || 0;
    const unprocessed = total - processed;
    const withContent = transcripts?.filter(t => t.content && t.content.trim() !== '').length || 0;
    const withoutContent = total - withContent;
    const withFilePath = transcripts?.filter(t => t.file_path).length || 0;
    const withoutFilePath = total - withFilePath;
    
    // Check for stuck transcripts
    const stuckTranscripts = transcripts?.filter(t => {
      if (t.is_processed) return false;
      
      const processingStartedAt = t.metadata?.processing_started_at;
      if (!processingStartedAt) return false;
      
      try {
        const startedTime = new Date(processingStartedAt);
        const elapsedMinutes = (now.getTime() - startedTime.getTime()) / (1000 * 60);
        return elapsedMinutes > 5; // Stuck for more than 5 minutes
      } catch (e) {
        return false;
      }
    }) || [];
    
    // Check 3: Verify edge functions
    console.log("[HEALTH] Checking edge functions");
    let webhookStatus = "unknown";
    let processStatus = "unknown";
    let triggerStatus = "unknown";

    try {
      const { error: webhookError } = await supabase.functions.invoke('transcript-webhook', {
        body: { type: 'HEALTH_CHECK' }
      });
      webhookStatus = webhookError ? "error" : "healthy";
    } catch (e) {
      webhookStatus = "error";
    }
    
    try {
      const { error: processError } = await supabase.functions.invoke('process-transcript', {
        body: { health_check: true }
      });
      processStatus = processError ? "error" : "healthy";
    } catch (e) {
      processStatus = "error";
    }
    
    try {
      const { error: triggerError } = await supabase.functions.invoke('trigger-transcript-processing', {
        body: { health_check: true }
      });
      triggerStatus = triggerError ? "error" : "healthy";
    } catch (e) {
      triggerStatus = "error";
    }
    
    // Compile the health report
    const healthReport = {
      timestamp: now.toISOString(),
      storage: bucketStatus,
      transcripts: {
        total,
        processed,
        unprocessed,
        withContent,
        withoutContent,
        withFilePath,
        withoutFilePath,
        stuck: stuckTranscripts.length
      },
      edgeFunctions: {
        webhookStatus,
        processStatus,
        triggerStatus
      },
      issues: [] as string[],
      recommendations: [] as string[]
    };
    
    // Add issues and recommendations
    if (!bucketStatus.exists) {
      healthReport.issues.push("Storage bucket 'transcripts' does not exist");
      healthReport.recommendations.push("Create storage bucket 'transcripts' with public access");
    } else if (!bucketStatus.isPublic) {
      healthReport.issues.push("Storage bucket 'transcripts' is not public");
      healthReport.recommendations.push("Make storage bucket 'transcripts' public for content access");
    }
    
    if (withoutContent > 0 && withFilePath > 0) {
      healthReport.issues.push(`${withoutContent} transcripts have no content but ${withFilePath} have file paths`);
      healthReport.recommendations.push("Run batch content extraction to extract content from file paths");
    }
    
    if (stuckTranscripts.length > 0) {
      healthReport.issues.push(`${stuckTranscripts.length} transcripts are stuck in processing`);
      healthReport.recommendations.push("Retry stuck transcripts with the retry function");
    }
    
    if (webhookStatus === "error" || processStatus === "error" || triggerStatus === "error") {
      healthReport.issues.push("One or more edge functions are not responding correctly");
      healthReport.recommendations.push("Check edge function logs and environment variables");
    }
    
    console.log(`[HEALTH] Health check complete: ${healthReport.issues.length} issues found`);
    
    return new Response(JSON.stringify(healthReport), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[HEALTH] Error during health check:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error during health check',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
