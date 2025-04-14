
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const VERTEX_AI_SERVICE_ACCOUNT = Deno.env.get('VERTEX_AI_SERVICE_ACCOUNT');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create JWT token for Google OAuth
async function createJWT(serviceAccount) {
  try {
    console.log("Starting JWT creation for test");
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
    
    // Log structure
    console.log("JWT header:", JSON.stringify(header));
    console.log("JWT payload structure (without actual values):", Object.keys(payload).join(", "));
    
    // Encode header and payload
    const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    // Create signature
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    
    try {
      // Log key format details (without exposing the key)
      const privateKey = serviceAccount.private_key;
      console.log(`Key format check - contains BEGIN: ${privateKey.includes("BEGIN PRIVATE KEY")}, contains END: ${privateKey.includes("END PRIVATE KEY")}, length: ${privateKey.length}`);
      
      // Check for newlines
      console.log(`Key contains literal newlines: ${privateKey.includes("\n")}`);
      
      // Clean private key - remove headers/footers and any whitespace
      const cleanedKey = privateKey
        .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n|\r/g, '');
      
      console.log(`Cleaned key length: ${cleanedKey.length}`);
      
      // Convert PEM encoded key to binary
      try {
        console.log("Converting key to binary");
        const binaryKey = atob(cleanedKey);
        console.log(`Binary key length: ${binaryKey.length}`);
        
        // Create a crypto key from the binary
        console.log("Creating crypto key");
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
        
        console.log("JWT signed successfully");
        
        const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        
        // Return the first 20 chars of each part for validation (avoid exposing the full token)
        return {
          success: true,
          jwtParts: {
            header: encodedHeader.substring(0, 20) + "...",
            payload: encodedPayload.substring(0, 20) + "...",
            signature: encodedSignature.substring(0, 20) + "..."
          },
          fullToken: `${signatureInput}.${encodedSignature}`
        };
      } catch (binaryError) {
        console.error("Error converting key to binary:", binaryError);
        return {
          success: false,
          error: `Binary conversion error: ${binaryError.message}`,
          stage: "binary_conversion"
        };
      }
    } catch (cryptoError) {
      console.error("Error during JWT crypto operations:", cryptoError);
      return {
        success: false,
        error: `JWT creation failed: ${cryptoError.message}`,
        stage: "crypto_operation"
      };
    }
  } catch (error) {
    console.error("Error creating JWT token:", error);
    return {
      success: false,
      error: `JWT error: ${error.message}`,
      stage: "jwt_creation"
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log("Starting JWT test function");
    
    if (!VERTEX_AI_SERVICE_ACCOUNT) {
      console.error("No service account configured");
      return new Response(JSON.stringify({
        success: false,
        message: "No Vertex AI service account configured",
        error: "Service account not found in environment variables"
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Parse service account
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(VERTEX_AI_SERVICE_ACCOUNT);
      console.log("Successfully parsed service account JSON");
      
      // Log available keys without exposing values
      console.log("Service account keys:", Object.keys(serviceAccount).join(", "));
    } catch (parseError) {
      console.error("Failed to parse service account:", parseError);
      return new Response(JSON.stringify({
        success: false,
        message: "Invalid service account format",
        error: `Failed to parse service account JSON: ${parseError.message}`,
        rawLength: VERTEX_AI_SERVICE_ACCOUNT?.length || 0
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Test JWT creation
    const jwtResult = await createJWT(serviceAccount);
    
    // If the result contains a fullToken property, it was successful
    if (jwtResult.success && jwtResult.fullToken) {
      try {
        // Now test token exchange
        console.log("Testing token exchange");
        const tokenResponse = await fetch(
          `https://oauth2.googleapis.com/token`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
              assertion: jwtResult.fullToken
            })
          }
        );
        
        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error("Token exchange failed:", tokenResponse.status, errorText);
          
          return new Response(JSON.stringify({
            success: false,
            message: "JWT generation succeeded but token exchange failed",
            jwtCreation: jwtResult,
            tokenExchange: {
              status: tokenResponse.status,
              error: errorText
            }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const tokenData = await tokenResponse.json();
        console.log("Token exchange successful");
        
        // Return successful result with sample of the token
        return new Response(JSON.stringify({
          success: true,
          message: "JWT token successfully created and exchanged",
          jwtCreation: {
            success: true,
            jwtParts: jwtResult.jwtParts
          },
          tokenExchange: {
            success: true,
            tokenType: tokenData.token_type,
            expiresIn: tokenData.expires_in,
            accessTokenPreview: tokenData.access_token.substring(0, 20) + "..."
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (tokenError) {
        console.error("Error in token exchange:", tokenError);
        
        return new Response(JSON.stringify({
          success: false,
          message: "JWT generation succeeded but token exchange request failed",
          jwtCreation: jwtResult,
          tokenExchange: {
            error: tokenError.message
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else {
      // JWT creation failed
      return new Response(JSON.stringify({
        success: false,
        message: "JWT token creation failed",
        ...jwtResult
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error("Unhandled error in JWT test:", error);
    
    return new Response(JSON.stringify({
      success: false,
      message: `Internal error: ${error.message}`,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
