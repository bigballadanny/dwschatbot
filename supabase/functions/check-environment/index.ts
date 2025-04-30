
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

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
    // Check if required environment variables exist
    const variables = {
      PYTHON_BACKEND_URL: !!Deno.env.get('PYTHON_BACKEND_URL'),
      PYTHON_BACKEND_KEY: !!Deno.env.get('PYTHON_BACKEND_KEY'),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      SUPABASE_URL: !!Deno.env.get('SUPABASE_URL')
    };
    
    // Check if we can connect to the Python backend
    let backendConnectivity = false;
    if (variables.PYTHON_BACKEND_URL) {
      try {
        const pythonBackendUrl = Deno.env.get('PYTHON_BACKEND_URL');
        const response = await fetch(`${pythonBackendUrl}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('PYTHON_BACKEND_KEY') || ''}`,
          },
        });
        
        backendConnectivity = response.ok;
      } catch (error) {
        console.error('Failed to connect to Python backend:', error);
      }
    }
    
    console.log('Environment variables check:', variables);
    console.log('Python backend connectivity:', backendConnectivity);

    return new Response(
      JSON.stringify({ 
        success: true,
        variables,
        backendConnectivity
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error checking environment variables:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})
