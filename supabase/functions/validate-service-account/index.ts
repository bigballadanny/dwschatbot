
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const VERTEX_AI_SERVICE_ACCOUNT = Deno.env.get('VERTEX_AI_SERVICE_ACCOUNT');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!VERTEX_AI_SERVICE_ACCOUNT) {
      throw new Error("VERTEX_AI_SERVICE_ACCOUNT environment variable is not set");
    }
    
    // Try parsing the service account JSON
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(VERTEX_AI_SERVICE_ACCOUNT);
    } catch (parseError) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Invalid JSON format: " + parseError.message,
        suggestion: "Ensure the service account JSON is properly formatted without extra escape characters."
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Verify required fields existence
    const requiredFields = [
      'type', 
      'project_id', 
      'private_key_id', 
      'private_key', 
      'client_email', 
      'client_id', 
      'auth_uri', 
      'token_uri'
    ];
    
    const missingFields = requiredFields.filter(field => !serviceAccount[field]);
    if (missingFields.length > 0) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: `Missing required fields: ${missingFields.join(', ')}`,
        suggestion: "Ensure the service account JSON contains all required fields."
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Check private_key format
    if (!serviceAccount.private_key.includes("BEGIN PRIVATE KEY") || 
        !serviceAccount.private_key.includes("END PRIVATE KEY")) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Invalid private key format",
        suggestion: "Private key should contain '-----BEGIN PRIVATE KEY-----' and '-----END PRIVATE KEY-----' and preserve newlines."
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Check if private_key has escaped newlines instead of actual newlines
    if (serviceAccount.private_key.includes("\\n") && !serviceAccount.private_key.includes("\n")) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: "Private key contains escaped newlines (\\n) instead of actual newlines",
        suggestion: "Replace '\\n' with actual newlines in the private_key field."
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // If we got here, the JSON format seems valid
    return new Response(JSON.stringify({ 
      valid: true, 
      project_id: serviceAccount.project_id,
      client_email_domain: serviceAccount.client_email.split('@')[1],
      message: "Service account JSON format appears valid"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      valid: false, 
      error: error.message,
      suggestion: "Unknown error occurred during validation."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
