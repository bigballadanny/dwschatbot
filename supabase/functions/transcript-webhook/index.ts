
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

// Create a Supabase client with the Auth context of the function
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
  try {
    const { record, type } = await req.json()
    
    // Only process INSERT events
    if (type !== 'INSERT') return new Response('Not an INSERT event, ignoring', { status: 200 })
    
    // Validate record
    if (!record || !record.id) {
      console.error('Invalid record format:', record)
      return new Response('Invalid webhook payload', { status: 400 })
    }
    
    // Don't process if transcript is already being processed
    if (record.is_processed === true) {
      return new Response('Transcript already processed', { status: 200 })
    }
    
    console.log(`Received new transcript, triggering processing: ${record.id}`)
    
    // Call the process-transcript function to start processing
    const { data, error } = await supabaseAdmin.functions.invoke('process-transcript', {
      body: { transcript_id: record.id }
    })
    
    if (error) {
      console.error('Error invoking process-transcript function:', error)
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Processing initiated',
      data
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error in transcript-webhook function:', error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
