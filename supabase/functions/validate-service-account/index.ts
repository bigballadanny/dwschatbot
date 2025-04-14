
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

// Create JWT token for Google OAuth - with enhanced debugging
async function createJWT(serviceAccount) {
  try {
    console.log("Starting JWT creation process");
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
    
    // Debug log
    console.log("JWT header and payload prepared");
    
    // Encode header and payload
    const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    // Create signature input
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    
    try {
      // IMPROVED: Enhanced key processing for better reliability
      console.log("Processing private key");
      let privateKey = serviceAccount.private_key;
      
      // Check if key has proper markers
      const hasBeginMarker = privateKey.includes("-----BEGIN PRIVATE KEY-----");
      const hasEndMarker = privateKey.includes("-----END PRIVATE KEY-----");
      
      console.log(`Key format check - contains BEGIN: ${hasBeginMarker}, contains END: ${hasEndMarker}, length: ${privateKey.length}`);
      
      // If the key doesn't have proper format, try to fix it
      if (!hasBeginMarker || !hasEndMarker) {
        console.log("Key is missing markers, attempting to normalize format");
        
        // First remove any existing markers/newlines to get clean base64
        privateKey = privateKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n|\r/g, '');
        
        // Now wrap with proper format: 64 chars per line with proper headers
        const formattedKey = formatPEM(privateKey, "PRIVATE KEY");
        privateKey = formattedKey;
        
        console.log("Key reformatted with proper PEM structure");
      } 
      
      // Ensure the key has proper line breaks 
      if (!privateKey.includes("\n")) {
        console.log("Key missing newlines, reformatting");
        // Remove markers first to get clean base64
        const cleanKey = privateKey
          .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, '')
          .replace(/\s/g, '');
        
        // Reformat with proper PEM structure
        privateKey = formatPEM(cleanKey, "PRIVATE KEY");
      }
      
      // Debug for key format
      console.log(`Private key format after processing - BEGIN marker: ${privateKey.includes("-----BEGIN PRIVATE KEY-----")}, END marker: ${privateKey.includes("-----END PRIVATE KEY-----")}, has newlines: ${privateKey.includes("\n")}`);
      
      try {
        // Extract base64-encoded key content (without headers/footers and newlines)
        const base64Content = privateKey
          .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n|\r/g, '');
        
        console.log(`Extracted base64 content length: ${base64Content.length}`);
        
        // Convert PEM encoded key to binary
        console.log("Converting key to binary");
        const binaryKey = atob(base64Content);
        console.log(`Binary key length: ${binaryKey.length}`);
        
        // Create a crypto key from the binary
        console.log("Importing crypto key");
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
        
        console.log("Crypto key created successfully, signing JWT");
        
        // Sign the data
        const signature = await crypto.subtle.sign(
          { name: "RSASSA-PKCS1-v1_5" },
          cryptoKey,
          new TextEncoder().encode(signatureInput)
        );
        
        console.log("JWT signed successfully, encoding signature");
        const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        
        console.log("JWT token creation completed successfully");
        return `${signatureInput}.${encodedSignature}`;
      } catch (cryptoError) {
        console.error("Error during JWT crypto operations:", cryptoError);
        console.log("Detailed error:", JSON.stringify(cryptoError));
        throw new Error(`JWT creation failed: ${cryptoError.message || "Unknown crypto error"}`);
      }
    } catch (keyError) {
      console.error("Error processing private key:", keyError);
      throw new Error(`Private key processing error: ${keyError.message}`);
    }
  } catch (error) {
    console.error("Error creating JWT token:", error);
    throw error;
  }
}

// Helper function to format a PEM key properly
function formatPEM(base64Content, type) {
  // Clean the base64 content first
  const cleanBase64 = base64Content.replace(/\s/g, '');
  
  // Format with 64 characters per line
  let formattedContent = '';
  for (let i = 0; i < cleanBase64.length; i += 64) {
    formattedContent += cleanBase64.slice(i, i + 64) + '\n';
  }
  
  return `-----BEGIN ${type}-----\n${formattedContent}-----END ${type}-----\n`;
}

// Get access token from Google OAuth
async function getAccessToken(serviceAccount) {
  try {
    console.log("Starting access token acquisition");
    const jwtToken = await createJWT(serviceAccount);
    
    if (!jwtToken) {
      throw new Error("Failed to create JWT token");
    }
    
    console.log("JWT token created, exchanging for OAuth token");
    
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
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText} - ${errorText}`);
    }
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error("No access token in response:", JSON.stringify(tokenData));
      throw new Error("No access token in response");
    }
    
    console.log("Access token acquired successfully");
    return tokenData.access_token;
  } catch (error) {
    console.error("Error getting access token:", error);
    throw error;
  }
}

// Test API access with the token
async function testAPIAccess(serviceAccount) {
  try {
    console.log("Testing API access");
    const accessToken = await getAccessToken(serviceAccount);
    
    const projectId = serviceAccount.project_id;
    if (!projectId) {
      throw new Error("No project_id in service account");
    }
    
    const VERTEX_API_BASE_URL = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/${VERTEX_API_VERSION}`;
    const endpoint = `${VERTEX_API_BASE_URL}/projects/${projectId}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_MODEL_ID}`;
    
    console.log(`Testing API access to endpoint: ${endpoint}`);
    
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
    
    console.log("API access test successful");
    return true;
  } catch (error) {
    console.error("API access test failed:", error);
    throw error;
  }
}

// Main validation function
async function validateServiceAccount(serviceAccountJSON) {
  console.log("Starting service account validation");
  const errors = [];
  const results = {
    success: false,
    errors: [],
    fields: {},
    permissions: {
      authentication: false,
      modelAccess: false
    },
    serviceAccount: null,
    debug: {
      jwtCreationSuccess: false,
      accessTokenSuccess: false
    }
  };
  
  try {
    // 1. Debug dump (safely) - without exposing sensitive details
    console.log("Service account validation - checking structure");
    console.log("Keys present in service account:", Object.keys(serviceAccountJSON).join(", "));
    
    // 2. Check required fields
    const requiredFields = [
      'type', 'project_id', 'private_key_id', 'private_key', 
      'client_email', 'client_id', 'auth_uri', 'token_uri', 
      'auth_provider_x509_cert_url', 'client_x509_cert_url'
    ];
    
    console.log("Checking required fields");
    for (const field of requiredFields) {
      const hasField = field in serviceAccountJSON && serviceAccountJSON[field];
      results.fields[field] = hasField;
      
      // Add additional debug info for private_key
      if (field === 'private_key' && hasField) {
        const privateKey = serviceAccountJSON.private_key;
        results.debug.privateKeyLength = privateKey.length;
        results.debug.hasBeginMarker = privateKey.includes('BEGIN PRIVATE KEY');
        results.debug.hasEndMarker = privateKey.includes('END PRIVATE KEY');
        results.debug.hasNewlines = privateKey.includes('\n');
      }
      
      if (!hasField) {
        console.log(`Missing required field: ${field}`);
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // 3. Check if type is service_account
    if (serviceAccountJSON.type !== 'service_account') {
      console.log(`Invalid account type: ${serviceAccountJSON.type}`);
      errors.push(`Invalid account type: ${serviceAccountJSON.type}. Must be "service_account"`);
    }
    
    // 4. Test JWT creation specifically
    try {
      await createJWT(serviceAccountJSON);
      results.debug.jwtCreationSuccess = true;
      console.log("JWT creation test passed");
    } catch (jwtError) {
      console.error("JWT creation test failed:", jwtError);
      errors.push(`JWT creation failed: ${jwtError.message}`);
    }
    
    // 5. Test authentication
    if (results.debug.jwtCreationSuccess) {
      try {
        await getAccessToken(serviceAccountJSON);
        results.permissions.authentication = true;
        results.debug.accessTokenSuccess = true;
        console.log("Authentication test passed");
      } catch (authError) {
        console.error("Authentication test failed:", authError);
        errors.push(`Authentication failed: ${authError.message}`);
      }
    }
    
    // 6. Test API access (only if authentication succeeded)
    if (results.permissions.authentication) {
      try {
        await testAPIAccess(serviceAccountJSON);
        results.permissions.modelAccess = true;
        console.log("API access test passed");
      } catch (apiError) {
        console.error("API access test failed:", apiError);
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
    
    console.log(`Service account validation completed. Success: ${results.success}`);
    return results;
  } catch (error) {
    console.error("Validation error:", error);
    return {
      success: false,
      errors: [`Validation error: ${error.message}`],
      fields: results.fields,
      permissions: results.permissions,
      debug: results.debug
    };
  }
}

serve(async (req) => {
  // Log start of request for debugging
  console.log("=== validate-service-account function called ===");
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
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
      console.log("Successfully parsed service account JSON");
    } catch (parseError) {
      console.error("Failed to parse service account:", parseError);
      const errorDetail = `Parse error: ${parseError.message}. First 20 chars: "${VERTEX_AI_SERVICE_ACCOUNT?.substring(0, 20)}..."`;
      
      return new Response(JSON.stringify({
        success: false,
        message: "Invalid service account format",
        errors: ["Failed to parse service account JSON", errorDetail],
        rawLength: VERTEX_AI_SERVICE_ACCOUNT?.length || 0
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
        status: 200, // Changed from 400 to 200 to prevent the error in UI
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
      status: 200, // Changed from 500 to 200 to prevent the error in UI
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
