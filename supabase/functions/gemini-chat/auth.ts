
/// <reference types="https://deno.land/x/deno/cli/types/dts/index.d.ts" />

// supabase/functions/gemini-chat/auth.ts

import { fetchWithTimeout, REQUEST_TIMEOUT_MS } from "./utils.ts";

// Retrieve service account from environment variables
const VERTEX_AI_SERVICE_ACCOUNT = Deno.env.get('VERTEX_AI_SERVICE_ACCOUNT');

/**
 * Validates the service account configuration
 * @param serviceAccount The service account JSON string
 * @returns Parsed service account object if valid
 * @throws Error if validation fails
 */
export function validateServiceAccount(serviceAccount: string | undefined) {
  // Check if service account is defined
  if (!serviceAccount) {
    throw new Error("VERTEX_AI_SERVICE_ACCOUNT environment variable is not set");
  }

  try {
    // Try to parse the JSON
    const parsed = JSON.parse(serviceAccount);

    // Check for required fields
    const requiredFields = ["client_email", "private_key", "project_id"];
    const missingFields = requiredFields.filter(field => !parsed[field]);

    if (missingFields.length > 0) {
      throw new Error(`Service account missing required fields: ${missingFields.join(", ")}`);
    }

    // Check if private key is valid (basic check)
    if (!parsed.private_key.includes("BEGIN PRIVATE KEY") || !parsed.private_key.includes("END PRIVATE KEY")) {
      // Try fixing format before throwing error
      const fixedKey = fixPrivateKeyFormat(parsed.private_key);
      if (!fixedKey.includes("BEGIN PRIVATE KEY") || !fixedKey.includes("END PRIVATE KEY")) {
        console.warn("Attempted to fix private key format, but it's still invalid.");
        throw new Error("Invalid private key format in service account");
      }
      console.log("Private key format seems fixed, proceeding.");
      parsed.private_key = fixedKey; // Use the fixed key
    }

    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("VERTEX_AI_SERVICE_ACCOUNT is not valid JSON");
    }
    throw error; // Re-throw other errors
  }
}


/**
 * Helper function to create properly formatted PEM key
 * @param base64Content The base64 encoded key content
 * @returns Formatted PEM key string
 */
function formatPEMKey(base64Content: string): string {
  // Clean the base64 content first
  let cleanBase64 = base64Content.replace(/\s/g, '');

  // Remove any non-base64 characters
  cleanBase64 = cleanBase64.replace(/[^A-Za-z0-9+/=]/g, '');

  // Ensure the base64 string length is valid (must be a multiple of 4)
  const remainder = cleanBase64.length % 4;
  if (remainder > 0) {
    cleanBase64 += '='.repeat(4 - remainder);
  }

  // Format with EXACTLY 64 characters per line
  let formattedContent = `-----BEGIN PRIVATE KEY-----\n`;
  for (let i = 0; i < cleanBase64.length; i += 64) {
    formattedContent += cleanBase64.slice(i, i + 64) + '\n';
  }
  formattedContent += `-----END PRIVATE KEY-----`;

  return formattedContent;
}

/**
 * Special function to fix primitive key format issues (e.g., missing newlines)
 * @param privateKey The private key string
 * @returns A potentially fixed private key string
 */
export function fixPrivateKeyFormat(privateKey: string | undefined): string {
    if (!privateKey) return ""; // Return empty string if undefined/null

    try {
        // Handle escaped newlines
        let processedKey = privateKey.replace(/\\n/g, '\n');

        const hasBeginMarker = processedKey.includes('-----BEGIN PRIVATE KEY-----');
        const hasEndMarker = processedKey.includes('-----END PRIVATE KEY-----');

        let base64Content: string;
        if (hasBeginMarker && hasEndMarker) {
            // Extract just the base64 content between markers
            base64Content = processedKey
                .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, '')
                .replace(/\s/g, '');
        } else {
            // Assume the whole string (after newline fix) is base64 content
            console.warn("Private key missing PEM markers, attempting to format anyway.");
            base64Content = processedKey.replace(/\s/g, '');
        }

        // Format into proper PEM structure
        return formatPEMKey(base64Content);
    } catch (error) {
        console.error("Error fixing private key format:", error);
        return privateKey; // Return original if fixing fails
    }
}

/**
 * Helper function to create a JWT token for Vertex AI authentication
 * @param serviceAccount Parsed service account object
 * @returns JWT token string
 * @throws Error if JWT creation fails
 */
async function createJWT(serviceAccount: any): Promise<string> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600; // 1 hour

    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: serviceAccount.private_key_id // Optional: Use key ID if available
    };

    const payload = {
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: expiry,
      scope: 'https://www.googleapis.com/auth/cloud-platform' // Required scope
    };

    console.log("JWT header and payload prepared");

    // Encode header and payload (Base64 URL encoding)
    const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Create signature input
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    try {
      // Ensure the private key is correctly formatted
      console.log("Processing private key for JWT signing");
      let privateKeyPem = fixPrivateKeyFormat(serviceAccount.private_key);

      if (!privateKeyPem.includes("BEGIN PRIVATE KEY") || !privateKeyPem.includes("END PRIVATE KEY")) {
        console.error("Private key is still not properly formatted after fix attempt.");
        throw new Error("Invalid private key format in service account even after formatting");
      }

      // Extract the base64 part of the PEM key
      const base64Key = privateKeyPem
        .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');

      console.log("Private key cleaned, attempting to import crypto key");

      try {
        // Convert base64 key to ArrayBuffer
        const binaryDer = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));

        // Import the key using Web Crypto API
        const cryptoKey = await crypto.subtle.importKey(
          "pkcs8",          // Key format
          binaryDer,        // Key data as ArrayBuffer
          {
            name: "RSASSA-PKCS1-v1_5", // Signing algorithm
            hash: { name: "SHA-256" }  // Hash function
          },
          false,            // Key is not extractable
          ["sign"]          // Key usage: signing
        );

        console.log("Crypto key imported successfully, signing data");

        // Sign the data (signatureInput)
        const signature = await crypto.subtle.sign(
          { name: "RSASSA-PKCS1-v1_5" },
          cryptoKey,
          new TextEncoder().encode(signatureInput) // Data to sign
        );

        // Encode the signature (Base64 URL encoding)
        const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        console.log("JWT token signed successfully");
        return `${signatureInput}.${encodedSignature}`; // Return the complete JWT

      } catch (cryptoError) {
        console.error("Error during crypto operations (importKey or sign):", cryptoError);
        // Log specific details if available
        if (cryptoError instanceof DOMException) {
            console.error(`DOMException Name: ${cryptoError.name}, Message: ${cryptoError.message}`);
        } else {
            console.error(`Error Type: ${typeof cryptoError}, Message: ${cryptoError.message}`);
        }
        throw new Error(`JWT crypto error: ${cryptoError.message}`);
      }
    } catch (privateKeyError) {
      console.error("Error processing private key:", privateKeyError);
      throw new Error(`Private key processing error: ${privateKeyError.message}`);
    }
  } catch (error) {
    console.error("Error creating JWT token:", error);
    throw error; // Re-throw the error
  }
}


/**
 * Function to get Vertex AI access token using JWT authentication
 * @returns Access token string
 * @throws Error if authentication fails
 */
export async function getVertexAccessToken(): Promise<string> {
  console.log("Starting Vertex AI authentication");
  try {
    // Validate and parse the service account JSON
    let serviceAccount;
    try {
      serviceAccount = validateServiceAccount(VERTEX_AI_SERVICE_ACCOUNT);
      console.log("Successfully validated and parsed service account JSON for:", serviceAccount.client_email);
      console.log("Project ID:", serviceAccount.project_id);
    } catch (validationError) {
      console.error("Service account validation failed:", validationError.message);
      throw validationError; // Propagate the validation error
    }

    // Create JWT token for authentication
    console.log("Creating JWT token using service account");
    let jwtToken;
    try {
      jwtToken = await createJWT(serviceAccount);
      if (!jwtToken) {
        throw new Error("JWT token creation returned undefined or null");
      }
      console.log("JWT token created successfully");
    } catch (jwtError) {
      console.error("Error creating JWT token:", jwtError);
      throw new Error(`Failed to create JWT: ${jwtError.message}`); // Wrap error
    }

    // Exchange JWT for Google OAuth token
    console.log("Exchanging JWT for OAuth access token");
    try {
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
        REQUEST_TIMEOUT_MS // Use the timeout constant
      );

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("OAuth token exchange failed:", tokenResponse.status, errorText);
        throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}. Response: ${errorText}`);
      }

      const tokenData = await tokenResponse.json();

      if (!tokenData.access_token) {
        console.error("No access_token found in the OAuth response:", tokenData);
        throw new Error("Failed to authenticate with Vertex AI: No access_token received");
      }

      console.log("Successfully retrieved OAuth access token");
      return tokenData.access_token;

    } catch (tokenExchangeError) {
      console.error("Error during JWT to OAuth token exchange:", tokenExchangeError);
      // Check if it's a timeout error from fetchWithTimeout
      if (tokenExchangeError.message.includes("timed out")) {
          throw new Error(`OAuth token exchange timed out after ${REQUEST_TIMEOUT_MS}ms`);
      }
      throw new Error(`Token exchange process failed: ${tokenExchangeError.message}`); // Wrap error
    }
  } catch (error) {
    // Catch any errors from validation, JWT creation, or token exchange
    console.error("Overall error getting Vertex AI access token:", error);
    // Ensure a meaningful error is thrown upwards
    throw new Error(`Vertex AI authentication failed: ${error.message}`);
  }
}
