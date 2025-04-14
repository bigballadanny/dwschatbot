
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const VERTEX_AI_SERVICE_ACCOUNT = Deno.env.get('VERTEX_AI_SERVICE_ACCOUNT');
const VERTEX_LOCATION = "us-central1";
const VERTEX_MODEL_ID = "gemini-1.5-pro";
const VERTEX_API_VERSION = "v1";
const REQUEST_TIMEOUT_MS = 10000;

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

// Create JWT token for Google OAuth
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
      console.error("Error during JWT crypto operations:", cryptoError);
      throw new Error(`JWT creation failed: ${cryptoError.message}`);
    }
  } catch (error) {
    console.error("Error creating JWT token:", error);
    throw error;
  }
}

// Get access token from Google OAuth
async function getAccessToken(serviceAccount) {
  try {
    const jwtToken = await createJWT(serviceAccount);
    
    if (!jwtToken) {
      throw new Error("Failed to create JWT token");
    }
    
    // Exchange JWT for Google OAuth token
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
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", tokenResponse.status, errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      throw new Error("No access token in response");
    }
    
    return tokenData.access_token;
  } catch (error) {
    throw error;
  }
}

// Test API access with the token
async function testAPIAccess(serviceAccount) {
  try {
    const accessToken = await getAccessToken(serviceAccount);
    
    const projectId = serviceAccount.project_id;
    if (!projectId) {
      throw new Error("No project_id in service account");
    }
    
    const VERTEX_API_BASE_URL = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/${VERTEX_API_VERSION}`;
    const endpoint = `${VERTEX_API_BASE_URL}/projects/${projectId}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_MODEL_ID}`;
    
    // Just check if the model is accessible
    const response = await fetchWithTimeout(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }, REQUEST_TIMEOUT_MS);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API access failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return true;
  } catch (error) {
    console.error("API access test failed:", error);
    throw error;
  }
}

// Main validation function
async function validateServiceAccount(serviceAccountJSON) {
  const errors = [];
  const results = {
    success: false,
    errors: [],
    fields: {},
    permissions: {
      authentication: false,
      modelAccess: false
    },
    serviceAccount: null
  };
  
  try {
    // 1. Check required fields
    const requiredFields = [
      'type', 'project_id', 'private_key_id', 'private_key', 
      'client_email', 'client_id', 'auth_uri', 'token_uri', 
      'auth_provider_x509_cert_url', 'client_x509_cert_url'
    ];
    
    for (const field of requiredFields) {
      const hasField = field in serviceAccountJSON && serviceAccountJSON[field];
      results.fields[field] = hasField;
      if (!hasField) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // 2. Check if type is service_account
    if (serviceAccountJSON.type !== 'service_account') {
      errors.push(`Invalid account type: ${serviceAccountJSON.type}. Must be "service_account"`);
    }
    
    // 3. Test authentication
    try {
      await getAccessToken(serviceAccountJSON);
      results.permissions.authentication = true;
    } catch (authError) {
      errors.push(`Authentication failed: ${authError.message}`);
    }
    
    // 4. Test API access (only if authentication succeeded)
    if (results.permissions.authentication) {
      try {
        await testAPIAccess(serviceAccountJSON);
        results.permissions.modelAccess = true;
      } catch (apiError) {
        errors.push(`API access failed: ${apiError.message}`);
      }
    }
    
    // Set overall success
    results.success = errors.length === 0;
    results.errors = errors;
    
    // Include non-sensitive parts of service account for reference
    results.serviceAccount = {
      project_id: serviceAccountJSON.project_id,
      client_email: serviceAccountJSON.client_email,
      type: serviceAccountJSON.type
    };
    
    return results;
  } catch (error) {
    console.error("Validation error:", error);
    return {
      success: false,
      errors: [`Validation error: ${error.message}`],
      fields: results.fields,
      permissions: results.permissions
    };
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log("Starting service account validation");
    
    if (!VERTEX_AI_SERVICE_ACCOUNT) {
      console.error("No service account configured");
      return new Response(JSON.stringify({
        success: false,
        message: "No Vertex AI service account configured",
        errors: ["Service account not found in environment variables"]
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(VERTEX_AI_SERVICE_ACCOUNT);
      console.log("Successfully parsed service account");
    } catch (parseError) {
      console.error("Failed to parse service account:", parseError);
      return new Response(JSON.stringify({
        success: false,
        message: "Invalid service account format",
        errors: ["Failed to parse service account JSON"]
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Validate the service account
    const validationResult = await validateServiceAccount(serviceAccount);
    
    if (validationResult.success) {
      console.log("Service account validation successful");
      return new Response(JSON.stringify({
        success: true,
        message: "Service account is valid and has required permissions",
        ...validationResult
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      console.error("Service account validation failed");
      return new Response(JSON.stringify({
        success: false,
        message: "Service account validation failed",
        ...validationResult
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error("Unhandled error in validate-service-account:", error);
    return new Response(JSON.stringify({
      success: false,
      message: `Internal error: ${error.message}`,
      errors: [error.message]
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
