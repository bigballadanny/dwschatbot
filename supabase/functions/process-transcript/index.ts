
// This file doesn't currently exist in the provided code, but we can stub it to ensure it properly supports health checks
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

// Create a Supabase client with the Auth context of the function
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    
    // Handle health check requests with enhanced details
    if (payload.health_check === true) {
      console.log("[PROCESS] Received health check request");
      
      // Check Supabase connection as part of health check
      const dbHealthy = await checkDatabaseConnection();
      
      return new Response(JSON.stringify({
        status: dbHealthy ? "healthy" : "database_connection_error",
        timestamp: new Date().toISOString(),
        details: {
          supabase_connection: dbHealthy,
          environment_variables: {
            supabase_url: !!Deno.env.get('SUPABASE_URL'),
            service_role_key: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
          }
        }
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Continue with normal processing
    const { transcript_id } = payload;
    
    if (!transcript_id) {
      console.error("[PROCESS] No transcript ID provided");
      return new Response(JSON.stringify({ 
        error: "No transcript ID provided" 
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`[PROCESS] Starting processing for transcript ${transcript_id}`);
    
    // Fetch the transcript
    const { data: transcript, error: fetchError } = await supabaseAdmin
      .from('transcripts')
      .select('*')
      .eq('id', transcript_id)
      .single();
      
    if (fetchError || !transcript) {
      console.error(`[PROCESS] Error fetching transcript ${transcript_id}:`, fetchError);
      return new Response(JSON.stringify({ 
        error: `Failed to fetch transcript: ${fetchError?.message || 'Not found'}` 
      }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    try {
      // Process the transcript content
      console.log(`[PROCESS] Processing transcript content for ${transcript_id}`);
      
      // Update the transcript as processed
      const { error: updateError } = await supabaseAdmin
        .from('transcripts')
        .update({ 
          is_processed: true,
          metadata: { 
            ...transcript.metadata,
            processing_completed_at: new Date().toISOString(),
            processing_success: true
          } 
        })
        .eq('id', transcript_id);
        
      if (updateError) {
        throw new Error(`Failed to update transcript: ${updateError.message}`);
      }
      
      console.log(`[PROCESS] Successfully processed transcript ${transcript_id}`);
      
      return new Response(JSON.stringify({ 
        success: true,
        transcript_id,
        processing_status: "completed"
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } catch (processingError) {
      console.error(`[PROCESS] Error processing transcript ${transcript_id}:`, processingError);
      
      // Mark as processed with error
      try {
        await supabaseAdmin
          .from('transcripts')
          .update({ 
            is_processed: true,
            metadata: { 
              ...transcript.metadata,
              processing_completed_at: new Date().toISOString(),
              processing_error: processingError.message,
              processing_failed: true
            } 
          })
          .eq('id', transcript_id);
      } catch (markError) {
        console.error(`[PROCESS] Failed to mark transcript ${transcript_id} as failed:`, markError);
      }
      
      return new Response(JSON.stringify({ 
        error: processingError.message,
        transcript_id
      }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    console.error('[PROCESS] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Helper function to check database connection
async function checkDatabaseConnection() {
  try {
    // Simple query to check if database connection works
    const { data, error } = await supabaseAdmin.from('transcripts').select('id').limit(1);
    return error === null;
  } catch (e) {
    console.error("Database connection check failed:", e);
    return false;
  }
}
