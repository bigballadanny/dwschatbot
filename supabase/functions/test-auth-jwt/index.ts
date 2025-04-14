
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const VERTEX_AI_SERVICE_ACCOUNT = Deno.env.get('VERTEX_AI_SERVICE_ACCOUNT');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to proper format a PEM key
function formatPEMKey(base64Content) {
  // Clean the base64 content first (remove any whitespace)
  const cleanBase64 = base64Content.replace(/\s/g, '');
  
  // Format with 64 characters per line
  let formattedContent = '-----BEGIN PRIVATE KEY-----\n';
  for (let i = 0; i < cleanBase64.length; i += 64) {
    formattedContent += cleanBase64.slice(i, i + 64) + '\n';
  }
  formattedContent += '-----END PRIVATE KEY-----';
  
  return formattedContent;
}

// Create JWT token for Google OAuth with enhanced error handling
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
    
    // Extract base64 content between the markers
    const cleanKey = privateKey
      .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, '')
      .replace(/\s/g, '');
    
    console.log(`Clean key length: ${cleanKey.length}`);
    
    try {
      // Convert PEM encoded key to binary
      const binaryKey = atob(cleanKey);
      console.log(`Binary key length: ${binaryKey.length}`);
      
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
      
      console.log("Crypto key created successfully, signing JWT");
      
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
    } catch (cryptoError) {
      console.error("Error during crypto operations:", cryptoError);
      throw new Error(`JWT crypto error: ${cryptoError.message}`);
    }
  } catch (error) {
    console.error("Error creating JWT token:", error);
    throw error;
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
