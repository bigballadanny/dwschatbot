
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
    // Get essential environment variables
    const pythonBackendUrl = Deno.env.get('PYTHON_BACKEND_URL');
    const pythonBackendKey = Deno.env.get('PYTHON_BACKEND_KEY');
    
    // Check if we can connect to the Python backend
    let backendConnectivity = false;
    let backendError = null;
    
    if (pythonBackendUrl) {
      try {
        // Try a basic health check endpoint
        const response = await fetch(`${pythonBackendUrl}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': pythonBackendKey ? `Bearer ${pythonBackendKey}` : '',
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        backendConnectivity = response.ok;
        console.log(`Backend connectivity test: ${backendConnectivity ? 'SUCCESS' : 'FAILED'} (Status: ${response.status})`);
        
        if (!response.ok) {
          backendError = `HTTP status ${response.status}`;
        }
      } catch (error) {
        backendError = error.message;
        console.error('Failed to connect to Python backend:', error);
      }
    } else {
      backendError = 'PYTHON_BACKEND_URL not configured';
      console.log('PYTHON_BACKEND_URL not set, skipping connectivity test');
    }
    
    // Create simple status object
    const status = {
      backendConfigured: !!pythonBackendUrl,
      backendUrlSet: !!pythonBackendUrl,
      backendKeySet: !!pythonBackendKey,
      backendConnectivity,
      backendError: backendError,
      supabaseConfigured: true // We're running in Supabase, so this is always true
    };
    
    console.log('Environment status:', status);

    return new Response(
      JSON.stringify({ 
        success: true,
        status
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
