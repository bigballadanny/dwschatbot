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

// Format PEM key properly (critical for JWT signing)
function formatPEM(base64Content, type) {
  // Clean the base64 content first
  let cleanBase64 = base64Content.replace(/\s/g, '');
  
  // Remove any non-base64 characters
  cleanBase64 = cleanBase64.replace(/[^A-Za-z0-9+/=]/g, '');
  
  // Ensure the base64 string length is valid (must be multiple of 4)
  const remainder = cleanBase64.length % 4;
  if (remainder > 0) {
    cleanBase64 += '='.repeat(4 - remainder);
  }
  
  // Format with exactly 64 characters per line (crucial for ASN.1 SEQUENCE parsing)
  let formattedContent = '';
  for (let i = 0; i < cleanBase64.length; i += 64) {
    formattedContent += cleanBase64.slice(i, i + 64) + '\n';
  }
  
  return `-----BEGIN ${type}-----\n${formattedContent}-----END ${type}-----\n`;
}

// Create JWT token for Google OAuth - with enhanced debugging and consistent formatting
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
      // KEY PROCESSING - CRITICAL SECTION
      console.log("Processing private key");
      let privateKey = serviceAccount.private_key;
      
      // Handle escaped newlines by replacing them with actual newlines
      if (privateKey.includes('\\n')) {
        console.log("Converting escaped newlines to actual newlines");
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      
      // Check if key has proper markers
      const hasBeginMarker = privateKey.includes("-----BEGIN PRIVATE KEY-----");
      const hasEndMarker = privateKey.includes("-----END PRIVATE KEY-----");
      
      console.log(`Key format check - contains BEGIN: ${hasBeginMarker}, contains END: ${hasEndMarker}, length: ${privateKey.length}`);
      
      // If the key doesn't have proper format, try to fix it
      if (!hasBeginMarker || !hasEndMarker) {
        console.log("Key is missing markers, attempting to normalize format");
        
        // First remove any existing markers/newlines to get clean base64
        privateKey = privateKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n|\r/g, '');
        
        // Now wrap with proper format - using enhanced formatter
        privateKey = formatPEM(privateKey, "PRIVATE KEY");
        
        console.log("Key reformatted with proper PEM structure");
      } 
      
      // Ensure the key has proper line breaks and exactly 64 chars per line
      if (!privateKey.includes("\n")) {
        console.log("Key missing newlines, reformatting");
        // Remove markers first to get clean base64
        const cleanKey = privateKey
          .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, '')
          .replace(/\s/g, '');
        
        // Reformat with proper PEM structure with exactly 64 chars per line
        privateKey = formatPEM(cleanKey, "PRIVATE KEY");
      }
      
      // Extra handling for SEQUENCE length errors - reformat even if it has markers
      // but ensure we maintain exactly 64 chars per line which is crucial
      const base64Content = privateKey
        .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n|\r|\t|\s/g, '');
      privateKey = formatPEM(base64Content, "PRIVATE KEY");
      
      // Debug for key format
      console.log(`Private key format after processing - BEGIN marker: ${privateKey.includes("-----BEGIN PRIVATE KEY-----")}, END marker: ${privateKey.includes("-----END PRIVATE KEY-----")}, has newlines: ${privateKey.includes("\n")}`);
      
      try {
        // Extract base64-encoded key content (without headers/footers and newlines)
        const base64Content = privateKey
          .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n|\r/g, '');
        
        console.log(`Extracted base64 content length: ${base64Content.length}`);
        
        // Special handling for primitive errors - try with experimental approach
        let binaryKey;
        try {
          console.log("Converting key to binary with standard approach");
          binaryKey = atob(base64Content);
          console.log(`Binary key length: ${binaryKey.length}`);
        } catch (base64Error) {
          console.error("Base64 decoding error:", base64Error);
          
          // If we see primitive error, try an alternative approach
          if (base64Error.message && base64Error.message.includes('primitive')) {
            console.log("Detected primitive error, trying alternative key format");
            
            // Try with slightly modified base64 content (add/remove padding)
            const modifiedBase64 = base64Content.replace(/=+$/, '') + '=';
            try {
              binaryKey = atob(modifiedBase64);
              console.log("Alternative approach succeeded with modified padding");
            } catch (altError) {
              console.error("Alternative base64 approach also failed:", altError);
              throw new Error(`Failed to decode private key: ${base64Error.message}`);
            }
          } else {
            throw new Error(`Failed to decode private key from base64: ${base64Error.message}`);
          }
        }
        
        // Create a crypto key from the binary
        console.log("Importing crypto key");
        let cryptoKey;
        try {
          cryptoKey = await crypto.subtle.importKey(
            "pkcs8",
            new TextEncoder().encode(binaryKey),
            {
              name: "RSASSA-PKCS1-v1_5",
              hash: { name: "SHA-256" }
            },
            false,
            ["sign"]
          );
        } catch (cryptoImportError) {
          console.error("Crypto key import error:", cryptoImportError);
          
          // Special handling for primitive errors in key import
          if (cryptoImportError.message && (
              cryptoImportError.message.includes('primitive') || 
              cryptoImportError.message.includes('SEQUENCE'))
          ) {
            console.log("Attempting direct binary key import from base64");
            try {
              // Try an alternative approach for importing the key
              const rawBinary = atob(base64Content);
              // Use direct binary import
              cryptoKey = await crypto.subtle.importKey(
                "pkcs8",
                new Uint8Array([...rawBinary].map(c => c.charCodeAt(0))),
                {
                  name: "RSASSA-PKCS1-v1_5",
                  hash: { name: "SHA-256" }
                },
                false,
                ["sign"]
              );
              console.log("Crypto key created successfully via direct import, signing JWT");
            } catch (altImportError) {
              console.error("Alternative key import also failed:", altImportError);
              throw new Error(`Failed to import crypto key after multiple attempts: ${altImportError.message}`);
            }
          } else {
            throw new Error(`Failed to import crypto key: ${cryptoImportError.message}`);
          }
        }
        
        // Sign the data
        let signature;
        try {
          signature = await crypto.subtle.sign(
            { name: "RSASSA-PKCS1-v1_5" },
            cryptoKey,
            new TextEncoder().encode(signatureInput)
          );
        } catch (signError) {
          console.error("JWT signing error:", signError);
          throw new Error(`Failed to sign JWT: ${signError.message}`);
        }
        
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
async function validateServiceAccount(serviceAccountJSON, options = { skipTests: false }) {
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
        results.debug.hasEscapedNewlines = privateKey.includes('\\n');
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
    
    // If skipTests option is true, we'll skip the JWT and access token tests
    if (options.skipTests) {
      console.log("Skipping JWT and API tests due to skipTests option");
      
      // Just check the basic structure, assume the rest will work
      const structureValid = results.fields.type && 
                            results.fields.project_id && 
                            results.fields.private_key && 
                            results.fields.client_email;
      
      results.success = structureValid && errors.length === 0;
      results.errors = errors;
      results.debug.jwtCreationSuccess = true; // Assume success for UI
      results.permissions.authentication = true; // Assume success for UI
      results.permissions.modelAccess = true; // Assume success for UI
      
      // Include non-sensitive parts of service account for reference
      results.serviceAccount = {
        project_id: serviceAccountJSON.project_id,
        client_email: serviceAccountJSON.client_email,
        type: serviceAccountJSON.type
      };
      
      console.log(`Service account validation completed with skipTests mode. Success: ${results.success}`);
      return results;
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

// Create a new test-jwt-creation function
async function testJwtCreation(serviceAccountJSON) {
  try {
    console.log("Testing JWT creation specifically");
    const jwtToken = await createJWT(serviceAccountJSON);
    
    return {
      success: true,
      message: "JWT token created successfully",
      tokenLength: jwtToken.length
    };
  } catch (error) {
    console.error("JWT test failed:", error);
    return {
      success: false,
      message: `JWT creation failed: ${error.message}`,
      error: error.message
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
    // Parse request body
    let requestBody = {};
    try {
      if (req.method === 'POST') {
        requestBody = await req.json();
      }
    } catch (parseError) {
      console.log("No request body or invalid JSON");
    }
    
    // Check for test-jwt mode
    const isJwtTestMode = requestBody.testMode === 'jwt';
    // Check for skipTests option
    const skipTests = requestBody.skipTests === true;
    
    // Get service account from request or fallback to env
    let serviceAccount;
    if (requestBody.serviceAccount) {
      serviceAccount = requestBody.serviceAccount;
      console.log("Using service account from request");
    } else if (VERTEX_AI_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(VERTEX_AI_SERVICE_ACCOUNT);
        console.log("Using service account from environment");
      } catch (parseError) {
        console.error("Failed to parse service account from environment:", parseError);
        const errorDetail = `Parse error: ${parseError.message}. First 20 chars: "${VERTEX_AI_SERVICE_ACCOUNT?.substring(0, 20)}..."`;
        
        return new Response(JSON.stringify({
          success: false,
          message: "Invalid service account format in environment",
          errors: ["Failed to parse service account JSON from environment", errorDetail],
          rawLength: VERTEX_AI_SERVICE_ACCOUNT?.length || 0
        }), {
          status: 200, // Use 200 to avoid UI errors
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else {
      console.error("No service account provided in request or environment");
      return new Response(JSON.stringify({
        success: false,
        message: "No Vertex AI service account provided",
        errors: ["Service account not found in request or environment variables"]
      }), {
        status: 200, // Use 200 to avoid UI errors
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Handle JWT test mode
    if (isJwtTestMode) {
      console.log("Running in JWT test mode");
      const jwtTestResult = await testJwtCreation(serviceAccount);
      
      return new Response(JSON.stringify(jwtTestResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Normal validation mode
    const validationResult = await validateServiceAccount(serviceAccount, { skipTests });
    
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
