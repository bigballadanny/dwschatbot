
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

    // Call the Python ingest pipeline via HTTP request to a serverless function
    // This is a placeholder - you'll need to add the actual endpoint for your Python backend
    const response = await fetch(Deno.env.get('PYTHON_BACKEND_URL') ?? '', {
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
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Error from Python backend:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to process transcript', details: errorData }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    const result = await response.json()

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in process-transcript function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
