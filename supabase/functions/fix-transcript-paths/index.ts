
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
    console.log("[PATH-FIX] Starting transcript path standardization process");
    
    // Create Supabase client with the service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    
    // Get all transcripts with file_path
    console.log("[PATH-FIX] Fetching all transcripts with file paths");
    const { data: transcripts, error } = await supabase
      .from('transcripts')
      .select('id, file_path')
      .not('file_path', 'is', null);
      
    if (error) {
      throw error;
    }
    
    console.log(`[PATH-FIX] Found ${transcripts?.length || 0} transcripts with file paths`);
    
    // Track results
    const results = {
      total: transcripts?.length || 0,
      standardized: 0,
      errors: [] as {id: string, error: string}[]
    };
    
    // Process each transcript
    for (const transcript of transcripts || []) {
      try {
        if (!transcript.file_path) continue;
        
        // Standardize path: remove "transcripts/" prefix if present
        let normalizedPath = transcript.file_path;
        if (normalizedPath.startsWith('transcripts/')) {
          console.log(`[PATH-FIX] Standardizing path for ${transcript.id}: ${normalizedPath} -> ${normalizedPath.slice('transcripts/'.length)}`);
          normalizedPath = normalizedPath.slice('transcripts/'.length);
          
          // Update the transcript with standardized path
          const { error: updateError } = await supabase
            .from('transcripts')
            .update({ file_path: normalizedPath })
            .eq('id', transcript.id);
            
          if (updateError) {
            throw updateError;
          }
          
          results.standardized++;
        }
      } catch (err) {
        console.error(`[PATH-FIX] Error processing transcript ${transcript.id}:`, err);
        results.errors.push({
          id: transcript.id,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
    
    console.log(`[PATH-FIX] Path standardization complete: ${results.standardized} paths standardized, ${results.errors.length} errors`);
    
    // Now run content extraction for transcripts without content
    console.log("[PATH-FIX] Checking for transcripts with file paths but no content");
    const { data: emptyTranscripts, error: emptyError } = await supabase
      .from('transcripts')
      .select('id, file_path')
      .not('file_path', 'is', null)
      .or('content.is.null,content.eq.');
    
    if (emptyError) {
      throw emptyError;
    }
    
    const extractionResults = {
      total: emptyTranscripts?.length || 0,
      extracted: 0,
      errors: [] as {id: string, error: string}[]
    };
    
    console.log(`[PATH-FIX] Found ${extractionResults.total} transcripts with file paths but no content`);
    
    // Process each empty transcript
    for (const transcript of emptyTranscripts || []) {
      try {
        if (!transcript.file_path) continue;
        
        console.log(`[PATH-FIX] Extracting content for transcript ${transcript.id} from path ${transcript.file_path}`);
        
        // Get file content
        const { data } = supabase.storage
          .from('transcripts')
          .getPublicUrl(transcript.file_path);
          
        if (!data || !data.publicUrl) {
          throw new Error("Failed to generate public URL");
        }
        
        // Fetch file content
        const response = await fetch(data.publicUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }
        
        const content = await response.text();
        
        // Update transcript with content
        const { error: updateError } = await supabase
          .from('transcripts')
          .update({ 
            content,
            metadata: {
              content_extracted_at: new Date().toISOString(),
              extraction_method: 'fix-transcript-paths',
              content_length: content.length
            }
          })
          .eq('id', transcript.id);
          
        if (updateError) {
          throw updateError;
        }
        
        extractionResults.extracted++;
        console.log(`[PATH-FIX] Successfully extracted content (${content.length} chars) for transcript ${transcript.id}`);
      } catch (err) {
        console.error(`[PATH-FIX] Error extracting content for transcript ${transcript.id}:`, err);
        extractionResults.errors.push({
          id: transcript.id,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
    
    console.log(`[PATH-FIX] Content extraction complete: ${extractionResults.extracted} of ${extractionResults.total} transcripts processed, ${extractionResults.errors.length} errors`);
    
    // Return combined results
    return new Response(JSON.stringify({
      paths: results,
      extraction: extractionResults,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[PATH-FIX] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
