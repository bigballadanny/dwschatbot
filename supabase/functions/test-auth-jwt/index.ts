
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VERTEX_AI_SERVICE_ACCOUNT = Deno.env.get('VERTEX_AI_SERVICE_ACCOUNT');

// Format PEM key properly (critical for JWT signing)
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
    
    console.log("Processing private key");
    let privateKey = serviceAccount.private_key;
    
    // Handle escaped newlines
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
      
      // Now wrap with proper format
      privateKey = formatPEM(privateKey, "PRIVATE KEY");
      
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
    
    // Extract base64-encoded key content
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
  } catch (error) {
    console.error("Error creating JWT token:", error);
    throw error;
  }
}

// Test authentication to Google OAuth
async function testAuth(jwt) {
  try {
    console.log("Testing authentication with JWT token");
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.access_token) {
      console.log("Authentication successful");
      return {
        success: true, 
        token_type: data.token_type,
        expires_in: data.expires_in
      };
    } else {
      console.error("Authentication failed:", data);
      return {
        success: false,
        error: data.error,
        error_description: data.error_description
      };
    }
  } catch (error) {
    console.error("Error testing authentication:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

serve(async (req) => {
  console.log("=== test-auth-jwt function called ===");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    if (!VERTEX_AI_SERVICE_ACCOUNT) {
      console.error("No service account configured");
      return new Response(JSON.stringify({
        success: false,
        message: "No Vertex AI service account configured"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(VERTEX_AI_SERVICE_ACCOUNT);
      console.log("Successfully parsed service account JSON");
    } catch (parseError) {
      console.error("Failed to parse service account:", parseError);
      return new Response(JSON.stringify({
        success: false,
        message: "Invalid service account format",
        error: parseError.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    try {
      const jwt = await createJWT(serviceAccount);
      
      // Check if we should test authentication
      let requestBody = {};
      try {
        if (req.method === 'POST') {
          requestBody = await req.json();
        }
      } catch (parseError) {
        console.log("No request body or invalid JSON");
      }
      
      const testAuthResult = requestBody.testAuth === true 
        ? await testAuth(jwt) 
        : { testAuth: false };
      
      return new Response(JSON.stringify({
        success: true,
        message: "JWT token created successfully",
        tokenLength: jwt.length,
        ...testAuthResult
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (jwtError) {
      console.error("JWT creation failed:", jwtError);
      return new Response(JSON.stringify({
        success: false,
        message: "JWT creation failed",
        error: jwtError.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error("Unhandled error in test-auth-jwt:", error);
    return new Response(JSON.stringify({
      success: false,
      message: `Internal error: ${error.message}`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
