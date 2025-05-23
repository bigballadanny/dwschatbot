import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const VERTEX_AI_SERVICE_ACCOUNT = Deno.env.get('VERTEX_AI_SERVICE_ACCOUNT');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to proper format a PEM key with improved base64 validation
function formatPEMKey(base64Content) {
  // Clean the base64 content first (remove any whitespace)
  let cleanBase64 = base64Content.replace(/\s/g, '');
  
  // Remove any non-base64 characters that might have been introduced
  cleanBase64 = cleanBase64.replace(/[^A-Za-z0-9+/=]/g, '');
  
  // Ensure the base64 string length is valid (must be divisible by 4)
  while (cleanBase64.length % 4 !== 0) {
    cleanBase64 += '=';
  }
  
  // Format with 64 characters per line
  let formattedContent = '-----BEGIN PRIVATE KEY-----\n';
  for (let i = 0; i < cleanBase64.length; i += 64) {
    formattedContent += cleanBase64.slice(i, i + 64) + '\n';
  }
  formattedContent += '-----END PRIVATE KEY-----';
  
  return formattedContent;
}

// Create JWT token for Google OAuth with enhanced error handling and base64 validation
async function createJWT(serviceAccount) {
  try {
    console.log("Starting JWT creation process");
    
    // Validate service account format
    if (!serviceAccount.client_email || !serviceAccount.private_key || !serviceAccount.private_key_id) {
      throw new Error("Service account missing required fields");
    }
    
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
    const encodedHeader = btoa(JSON.stringify(header))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
      
    const encodedPayload = btoa(JSON.stringify(payload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    // Create signature input
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    
    // Process private key for consistent formatting
    console.log("Processing private key");
    let privateKey = serviceAccount.private_key;
    
    try {
      // Handle escaped newlines and standardize format
      if (privateKey.includes('\\n')) {
        console.log("Converting escaped newlines to actual newlines");
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      
      // Check if key has proper markers
      const hasBeginMarker = privateKey.includes("-----BEGIN PRIVATE KEY-----");
      const hasEndMarker = privateKey.includes("-----END PRIVATE KEY-----");
      
      // If the key doesn't have proper format, reformat it
      if (!hasBeginMarker || !hasEndMarker) {
        console.log("Key is missing markers, reformatting");
        
        // Extract just the base64 content, removing any existing formatting
        const baseContent = privateKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
        privateKey = formatPEMKey(baseContent);
        
        console.log("Key reformatted with proper PEM structure");
      }
      
      // Ensure there's a trailing newline after the END marker
      if (!privateKey.endsWith('\n')) {
        privateKey += '\n';
      }

      // Extract base64 content between the markers for debugging
      const cleanKey = privateKey
        .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, '')
        .replace(/\s/g, '');
      
      console.log(`Clean key length: ${cleanKey.length}`);
      
      // Additional validation to ensure the key has valid base64 content
      if (cleanKey.length === 0) {
        throw new Error("Private key is empty after cleaning");
      }
      
      // Remove any non-base64 characters that might have been introduced
      const validBase64Key = cleanKey.replace(/[^A-Za-z0-9+/=]/g, '');
      
      // Ensure the base64 string length is valid
      let paddedKey = validBase64Key;
      while (paddedKey.length % 4 !== 0) {
        paddedKey += '=';
      }
      
      // Convert PEM encoded key to binary
      let binaryKey;
      try {
        // Important fix: Use different approach for the binary conversion
        console.log("Attempting direct binary key import from base64");
        
        try {
          // Try direct crypto key import from raw key material
          const keyBuffer = Uint8Array.from(atob(paddedKey), c => c.charCodeAt(0));
          
          // Create a crypto key from the binary
          const cryptoKey = await crypto.subtle.importKey(
            "pkcs8",
            keyBuffer,
            {
              name: "RSASSA-PKCS1-v1_5",
              hash: { name: "SHA-256" }
            },
            false,
            ["sign"]
          );
          
          console.log("Crypto key created successfully via direct import, signing JWT");
          
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
          
          console.log("JWT token creation completed successfully");
          return `${signatureInput}.${encodedSignature}`;
          
        } catch (directImportError) {
          console.error("Direct key import failed:", directImportError);
          
          // Fallback to original approach
          console.log("Falling back to traditional PEM decoding");
          
          binaryKey = atob(paddedKey);
          console.log(`Binary key length: ${binaryKey.length}`);
          
          // Additional validation - if binary key is too short, there's likely an encoding issue
          if (binaryKey.length < 100) {
            throw new Error(`Binary key is suspiciously short (${binaryKey.length} bytes). Possible base64 decoding issue.`);
          }
          
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
          
          console.log("Crypto key created successfully via fallback method, signing JWT");
          
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
          
          console.log("JWT token creation completed successfully");
          return `${signatureInput}.${encodedSignature}`;
        }
      } catch (base64Error) {
        console.error("Base64 decoding error:", base64Error);
        throw new Error(`Failed to decode private key: ${base64Error.message}. Please check the key format.`);
      }
    } catch (keyProcessingError) {
      console.error("Error processing private key:", keyProcessingError);
      throw new Error(`Private key processing error: ${keyProcessingError.message}`);
    }
  } catch (error) {
    console.error("Error creating JWT token:", error);
    throw error;
  }
}

// A test mode that just validates the structure of the service account without making API calls
async function validateServiceAccount(serviceAccount) {
  const results = {
    isValid: false,
    issues: [],
    privateKeyAnalysis: {}
  };
  
  try {
    // Check required fields
    const requiredFields = ["type", "project_id", "private_key_id", "private_key", "client_email"];
    const missingFields = requiredFields.filter(field => !serviceAccount[field]);
    
    if (missingFields.length > 0) {
      results.issues.push(`Missing required fields: ${missingFields.join(", ")}`);
    }
    
    // Check private key format
    if (serviceAccount.private_key) {
      const privateKey = serviceAccount.private_key;
      const hasBeginMarker = privateKey.includes("-----BEGIN PRIVATE KEY-----");
      const hasEndMarker = privateKey.includes("-----END PRIVATE KEY-----");
      const hasNewlines = privateKey.includes("\n");
      const containsEscapedNewlines = privateKey.includes('\\n');
      
      results.privateKeyAnalysis = {
        length: privateKey.length,
        hasBeginMarker,
        hasEndMarker, 
        hasNewlines,
        containsEscapedNewlines
      };
      
      if (!hasBeginMarker || !hasEndMarker) {
        results.issues.push("Private key is missing BEGIN/END markers");
      }
      
      if (containsEscapedNewlines && !hasNewlines) {
        results.issues.push("Private key has escaped newlines (\\n) but no actual newlines");
      }
    } else {
      results.issues.push("Private key is missing");
    }
    
    // Basic validation is successful if we have all required fields
    results.isValid = missingFields.length === 0;
    
    return results;
  } catch (error) {
    return {
      isValid: false,
      issues: [`Validation error: ${error.message}`],
      privateKeyAnalysis: {}
    };
  }
}

serve(async (req) => {
  console.log("=== test-auth-jwt function called ===");
  
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
    
    // Check if validation-only mode was requested
    if (requestBody.validateOnly === true) {
      console.log("Running in validation-only mode");
      
      // Use either provided service account or system service account
      let serviceAccount;
      if (requestBody.serviceAccount) {
        console.log("Using provided service account for validation");
        serviceAccount = requestBody.serviceAccount;
      } else if (VERTEX_AI_SERVICE_ACCOUNT) {
        console.log("Using environment service account for validation");
        try {
          serviceAccount = JSON.parse(VERTEX_AI_SERVICE_ACCOUNT);
        } catch (parseError) {
          return new Response(JSON.stringify({
            success: false,
            message: "Could not parse service account from environment variable",
            error: `Parse error: ${parseError.message}`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } else {
        return new Response(JSON.stringify({
          success: false,
          message: "No service account provided"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const validationResult = await validateServiceAccount(serviceAccount);
      return new Response(JSON.stringify({
        success: validationResult.isValid,
        message: validationResult.isValid ? "Service account structure is valid" : "Service account has issues",
        issues: validationResult.issues,
        privateKeyAnalysis: validationResult.privateKeyAnalysis
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Use either provided service account or system service account
    let serviceAccount;
    if (requestBody.serviceAccount) {
      console.log("Using service account from request body");
      serviceAccount = requestBody.serviceAccount;
    } else if (VERTEX_AI_SERVICE_ACCOUNT) {
      console.log("Using service account from environment");
      try {
        serviceAccount = JSON.parse(VERTEX_AI_SERVICE_ACCOUNT);
      } catch (parseError) {
        return new Response(JSON.stringify({
          success: false,
          message: "Could not parse service account from environment variable",
          error: `Parse error: ${parseError.message}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: "No service account provided"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    try {
      const jwtToken = await createJWT(serviceAccount);
      
      // Optionally test authentication if requested
      if (requestBody.testAuth) {
        console.log("Testing authentication with JWT token");
        try {
          // Exchange JWT for Google OAuth token
          const tokenResponse = await fetch(
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
            }
          );
          
          const tokenData = await tokenResponse.json();
          
          if (tokenData.access_token) {
            return new Response(JSON.stringify({
              success: true,
              message: "Authentication successful",
              tokenType: tokenData.token_type,
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } else {
            return new Response(JSON.stringify({
              success: false,
              message: "Authentication failed: " + (tokenData.error_description || tokenData.error || "No access token received")
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        } catch (authError) {
          console.error("Authentication test error:", authError);
          return new Response(JSON.stringify({
            success: false,
            message: `Authentication test failed: ${authError.message}`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
      
      // Return success with token length for JWT test
      return new Response(JSON.stringify({
        success: true,
        message: "JWT token created successfully",
        tokenLength: jwtToken.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (jwtError) {
      console.error("JWT creation failed:", jwtError);
      return new Response(JSON.stringify({
        success: false,
        message: `JWT creation failed: ${jwtError.message}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(JSON.stringify({
      success: false,
      message: `Error: ${error.message}`
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
