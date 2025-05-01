
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
    const requestData = await req.json()
    const { transcript_id } = requestData

    console.log(`[PROCESS] Starting transcript processing for ID: ${transcript_id}`, {
      request_data: requestData
    });

    if (!transcript_id) {
      console.error('[PROCESS] Missing transcript_id parameter');
      return new Response(
        JSON.stringify({ error: 'Missing transcript_id parameter' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log(`[PROCESS] Fetching transcript details: ${transcript_id}`);

    // Fetch transcript details from the database
    const { data: transcript, error: fetchError } = await supabaseAdmin
      .from('transcripts')
      .select('*')
      .eq('id', transcript_id)
      .single()

    if (fetchError || !transcript) {
      console.error('[PROCESS] Error fetching transcript:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Transcript not found', details: fetchError }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    console.log(`[PROCESS] Successfully retrieved transcript: ${transcript_id}`, {
      title: transcript.title,
      has_content: !!transcript.content,
      content_length: transcript.content ? transcript.content.length : 0,
      has_file_path: !!transcript.file_path,
      file_path: transcript.file_path,
      is_processed: transcript.is_processed
    });

    // Update the transcript to indicate processing has started
    console.log(`[PROCESS] Updating transcript ${transcript_id} to mark as processing in progress`);
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
      console.error('[PROCESS] Error updating transcript processing status:', updateError);
    }

    // Get the content from storage if file_path is available but content is empty
    if (transcript.file_path && (!transcript.content || transcript.content.trim() === '')) {
      try {
        console.log(`[PROCESS] Transcript ${transcript_id} has empty content but has file_path: ${transcript.file_path}`);
        
        // Get the file from storage
        console.log(`[PROCESS] Downloading file from storage path: ${transcript.file_path}`);
        const { data: fileData, error: fileError } = await supabaseAdmin.storage
          .from('transcripts')
          .download(transcript.file_path);
        
        if (fileError) {
          console.error('[PROCESS] Error downloading file from storage:', fileError);
          throw fileError;
        }
        
        // Convert file to text
        console.log(`[PROCESS] Converting file to text for transcript ${transcript_id}`);
        const fileContent = await fileData.text();
        
        // Update the transcript with the content
        if (fileContent) {
          console.log(`[PROCESS] Updating transcript ${transcript_id} with content from file (${fileContent.length} characters)`);
          const { error: contentUpdateError } = await supabaseAdmin
            .from('transcripts')
            .update({ content: fileContent })
            .eq('id', transcript_id);
          
          if (contentUpdateError) {
            console.error('[PROCESS] Error updating transcript with file content:', contentUpdateError);
            throw contentUpdateError;
          }
          
          // Update our local copy of the transcript
          transcript.content = fileContent;
          console.log(`[PROCESS] Updated transcript content from file (${fileContent.length} characters)`);
        } else {
          console.warn(`[PROCESS] File content was empty for transcript ${transcript_id}`);
        }
      } catch (error) {
        console.error('[PROCESS] Error extracting content from file:', error);
      }
    }

    // Process transcript directly here
    try {
      console.log(`[PROCESS] Starting content processing for transcript ${transcript_id}`);
      // Perform any necessary processing on the transcript content
      // For example: compute word count, extract metadata, etc.
      const wordCount = transcript.content ? transcript.content.split(/\s+/).length : 0;
      const charCount = transcript.content ? transcript.content.length : 0;
      
      console.log(`[PROCESS] Calculated metrics for transcript ${transcript_id}: ${wordCount} words, ${charCount} characters`);
      
      // Mark the transcript as processed with computed metrics
      console.log(`[PROCESS] Marking transcript ${transcript_id} as processed`);
      const { error: processedError } = await supabaseAdmin
        .from('transcripts')
        .update({
          is_processed: true,
          metadata: {
            ...transcript.metadata,
            processing_completed_at: new Date().toISOString(),
            word_count: wordCount,
            char_count: charCount
          }
        })
        .eq('id', transcript_id);
        
      if (processedError) {
        console.error('[PROCESS] Error marking transcript as processed:', processedError);
        throw processedError;
      }

      console.log(`[PROCESS] Successfully processed transcript: ${transcript_id}`);
    } catch (processingError) {
      console.error('[PROCESS] Error processing transcript content:', processingError);
      
      // Mark as processed but with error
      console.log(`[PROCESS] Marking transcript ${transcript_id} as processed with error`);
      await supabaseAdmin
        .from('transcripts')
        .update({
          is_processed: true,
          metadata: {
            ...transcript.metadata,
            processing_completed_at: new Date().toISOString(),
            processing_error: `Error: ${processingError.message}`,
            processing_failed: true
          }
        })
        .eq('id', transcript_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Transcript successfully processed',
        metadata: {
          id: transcript_id,
          title: transcript.title,
          processed_at: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[PROCESS] Error in process-transcript function:', error);
    
    // Try to mark the transcript as processed with error to prevent it from being stuck
    try {
      const { transcript_id } = await req.json();
      if (transcript_id) {
        console.log(`[PROCESS] Marking transcript ${transcript_id} as failed due to unhandled error`);
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
      console.error('[PROCESS] Failed to mark transcript as failed:', markError);
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
