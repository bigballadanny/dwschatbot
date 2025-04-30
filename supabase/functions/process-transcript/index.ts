
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create a Supabase client with the Auth context of the function
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get request body
    const { transcript_id } = await req.json()

    if (!transcript_id) {
      return new Response(
        JSON.stringify({ error: 'Missing transcript_id parameter' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log(`Processing transcript: ${transcript_id}`)

    // Fetch transcript details from the database
    const { data: transcript, error: fetchError } = await supabaseAdmin
      .from('transcripts')
      .select('*')
      .eq('id', transcript_id)
      .single()

    if (fetchError || !transcript) {
      console.error('Error fetching transcript:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Transcript not found', details: fetchError }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    // Update the transcript to indicate processing has started
    const { error: updateError } = await supabaseAdmin
      .from('transcripts')
      .update({
        metadata: {
          ...transcript.metadata,
          processing_started_at: new Date().toISOString()
        }
      })
      .eq('id', transcript_id);
    
    if (updateError) {
      console.error('Error updating transcript processing status:', updateError);
    }

    // Get the content from storage if file_path is available but content is empty
    if (transcript.file_path && (!transcript.content || transcript.content.trim() === '')) {
      try {
        // Get the file from storage
        const { data: fileData, error: fileError } = await supabaseAdmin.storage
          .from('transcripts')
          .download(transcript.file_path);
        
        if (fileError) {
          throw fileError;
        }
        
        // Convert file to text
        const fileContent = await fileData.text();
        
        // Update the transcript with the content
        if (fileContent) {
          const { error: contentUpdateError } = await supabaseAdmin
            .from('transcripts')
            .update({ content: fileContent })
            .eq('id', transcript_id);
          
          if (contentUpdateError) {
            throw contentUpdateError;
          }
          
          // Update our local copy of the transcript
          transcript.content = fileContent;
        }
      } catch (error) {
        console.error('Error extracting content from file:', error);
        // Continue processing even if we couldn't extract content
      }
    }

    // Check if Python backend URL is configured
    const pythonBackendUrl = Deno.env.get('PYTHON_BACKEND_URL');
    let processedByBackend = false;
    let backendResult = null;
    
    if (pythonBackendUrl) {
      try {
        // Call the Python ingest pipeline via HTTP request
        const response = await fetch(pythonBackendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('PYTHON_BACKEND_KEY') ?? ''}`,
          },
          body: JSON.stringify({
            transcript_id: transcript.id,
            file_path: transcript.file_path,
            user_id: transcript.user_id,
            topic: transcript.source || null,
          }),
          // Add a timeout to prevent hanging if backend is slow
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        if (response.ok) {
          backendResult = await response.json();
          processedByBackend = true;
        } else {
          const errorData = await response.text();
          console.error('Error from Python backend:', errorData);
        }
      } catch (error) {
        console.error('Error connecting to Python backend:', error);
      }
    } else {
      console.log('PYTHON_BACKEND_URL environment variable not set, skipping backend processing');
    }

    // Always mark the transcript as processed, even if backend processing failed
    await supabaseAdmin
      .from('transcripts')
      .update({ 
        is_processed: true,
        metadata: {
          ...transcript.metadata,
          processing_completed_at: new Date().toISOString(),
          processed_by_backend: processedByBackend,
          processing_error: !processedByBackend && pythonBackendUrl ? 'Failed to process with Python backend' : null
        }
      })
      .eq('id', transcript_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: processedByBackend ? 
          'Transcript successfully processed by backend' : 
          'Transcript marked as processed (backend skipped)',
        processed_by_backend: processedByBackend,
        result: backendResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in process-transcript function:', error);
    
    // Try to mark the transcript as processed with error to prevent it from being stuck
    try {
      const { transcript_id } = await req.json();
      if (transcript_id) {
        await supabaseAdmin
          .from('transcripts')
          .update({ 
            is_processed: true,
            metadata: {
              processing_error: `Error: ${error.message}`,
              processing_completed_at: new Date().toISOString(),
              processing_failed: true
            }
          })
          .eq('id', transcript_id);
      }
    } catch (markError) {
      console.error('Failed to mark transcript as failed:', markError);
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})
