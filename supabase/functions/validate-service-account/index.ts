
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const VERTEX_AI_SERVICE_ACCOUNT = Deno.env.get('VERTEX_AI_SERVICE_ACCOUNT');
const REQUEST_TIMEOUT_MS = 15000; // 15 seconds

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to fetch with timeout
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}

// Create JWT token for authentication
async function createJWT(serviceAccount) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600; // 1 hour
    
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: serviceAccount.private_key_id
    };
    
    const payload = {
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: expiry,
      scope: 'https://www.googleapis.com/auth/cloud-platform'
    };
    
    // Encode header and payload
    const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    // Create signature
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    
    try {
      // Clean up the private key to ensure it's in the correct format
      const privateKey = serviceAccount.private_key
        .replace(/\\n/g, '\n') // Handle escaped newlines
        .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');
      
      // Convert PEM encoded key to binary
      const binaryKey = atob(privateKey);
      
      // Create a crypto key from the binary
      const cryptoKey = await crypto.subtle.importKey(
        "pkcs8",
        new TextEncoder().encode(binaryKey),
        {
          name: "RSASSA-PKCS1-v1_5",
          hash: { name: "SHA-256" }
        },
        false,
        ["sign"]
      );
      
      // Sign the data
      const signature = await crypto.subtle.sign(
        { name: "RSASSA-PKCS1-v1_5" },
        cryptoKey,
        new TextEncoder().encode(signatureInput)
      );
      
      const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      
      return `${signatureInput}.${encodedSignature}`;
    } catch (cryptoError) {
      throw new Error(`JWT signing failed: ${cryptoError.message}`);
    }
  } catch (error) {
    throw new Error(`JWT creation failed: ${error.message}`);
  }
}

// Test if we can get a valid access token
async function testAccessToken(serviceAccount) {
  try {
    const jwtToken = await createJWT(serviceAccount);
    
    const tokenResponse = await fetchWithTimeout(
      `https://oauth2.googleapis.com/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwtToken
        })
      },
      REQUEST_TIMEOUT_MS
    );
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      return {
        success: false,
        statusCode: tokenResponse.status,
        errors: [`Token exchange failed: ${JSON.stringify(tokenData)}`]
      };
    }
    
    return {
      success: true,
      accessToken: tokenData.access_token,
      expiresIn: tokenData.expires_in,
      tokenType: tokenData.token_type
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Access token generation failed: ${error.message}`]
    };
  }
}

// Test if Vertex AI API is accessible
async function testVertexAIAccess(serviceAccount, accessToken) {
  try {
    const projectId = serviceAccount.project_id;
    const location = "us-central1";
    const modelName = "gemini-1.5-pro";
    
    const VERTEX_API_BASE_URL = `https://${location}-aiplatform.googleapis.com/v1`;
    const endpoint = `${VERTEX_API_BASE_URL}/projects/${projectId}/locations/${location}/publishers/google/models/${modelName}`;
    
    const response = await fetchWithTimeout(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }, REQUEST_TIMEOUT_MS);
    
    const data = await response.json();
    
    if (response.status !== 200) {
      return {
        success: false,
        statusCode: response.status,
        errors: [`Cannot access Vertex AI: ${JSON.stringify(data)}`]
      };
    }
    
    return {
      success: true,
      modelDetails: {
        name: data.name,
        displayName: data.displayName,
        description: data.description
      }
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Vertex AI access test failed: ${error.message}`]
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log("Starting Vertex AI service account validation");
    
    if (!VERTEX_AI_SERVICE_ACCOUNT) {
      return new Response(JSON.stringify({
        success: false,
        message: "Vertex AI service account is not configured",
        errors: ["VERTEX_AI_SERVICE_ACCOUNT environment variable is not set"]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }
    
    // Parse service account JSON
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(VERTEX_AI_SERVICE_ACCOUNT);
      console.log("Successfully parsed service account JSON");
    } catch (e) {
      return new Response(JSON.stringify({
        success: false,
        message: "Invalid service account JSON format",
        errors: ["The service account JSON is not valid JSON format"]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }
    
    // Check for required fields in service account
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
    
    const fieldStatus = {};
    const missingFields = [];
    
    requiredFields.forEach(field => {
      const hasField = serviceAccount[field] && serviceAccount[field].trim() !== '';
      fieldStatus[field] = hasField;
      if (!hasField) {
        missingFields.push(field);
      }
    });
    
    if (missingFields.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        message: `Missing required fields in service account: ${missingFields.join(', ')}`,
        errors: missingFields.map(field => `Missing required field: ${field}`),
        fields: fieldStatus
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }
    
    // Check if service account type is correct
    if (serviceAccount.type !== 'service_account') {
      return new Response(JSON.stringify({
        success: false,
        message: "Invalid service account type",
        errors: [`Expected type 'service_account' but got '${serviceAccount.type}'`],
        fields: fieldStatus
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }
    
    // Test access token generation
    console.log("Testing access token generation");
    const tokenResult = await testAccessToken(serviceAccount);
    
    if (!tokenResult.success) {
      return new Response(JSON.stringify({
        success: false,
        message: "Failed to generate access token",
        errors: tokenResult.errors,
        fields: fieldStatus,
        tokenDetails: tokenResult
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }
    
    // Test Vertex AI access
    console.log("Testing Vertex AI API access");
    const vertexResult = await testVertexAIAccess(serviceAccount, tokenResult.accessToken);
    
    if (!vertexResult.success) {
      return new Response(JSON.stringify({
        success: false,
        message: "Failed to access Vertex AI API",
        errors: vertexResult.errors,
        fields: fieldStatus,
        tokenDetails: { success: true },
        vertexDetails: vertexResult
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }
    
    // All tests passed
    return new Response(JSON.stringify({
      success: true,
      message: "Service account is valid and can access Vertex AI",
      fields: fieldStatus,
      project_id: serviceAccount.project_id,
      client_email: serviceAccount.client_email,
      tokenDetails: { 
        success: true,
        expiresIn: tokenResult.expiresIn,
        tokenType: tokenResult.tokenType
      },
      vertexDetails: vertexResult.modelDetails
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    console.error("Unexpected error during validation:", error);
    return new Response(JSON.stringify({
      success: false,
      message: "Validation failed with an unexpected error",
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
