// supabase/functions/gemini-chat/health.ts
/// <reference types="https://deno.land/x/deno/cli/types/dts/index.d.ts" />

// Retrieve service account from environment variables
const VERTEX_AI_SERVICE_ACCOUNT = Deno.env.get('VERTEX_AI_SERVICE_ACCOUNT');

// Define the structure for the health check result
export interface ServiceAccountHealth {
    isValid: boolean;
    error?: string;
    hasProjectId?: boolean;
    hasClientEmail?: boolean;
    hasPrivateKey?: boolean;
    privateKeyFormat?: 'valid' | 'invalid' | 'missing';
}

/**
 * Checks the health and validity of the Vertex AI service account configuration.
 * Parses the JSON and checks for required fields and basic private key format.
 * @returns ServiceAccountHealth object indicating the status.
 */
export function checkServiceAccountHealth(): ServiceAccountHealth {
  try {
    // 1. Check if the environment variable is set
    if (!VERTEX_AI_SERVICE_ACCOUNT) {
      return {
        isValid: false,
        error: "VERTEX_AI_SERVICE_ACCOUNT environment variable is not set"
      };
    }

    // 2. Try parsing the JSON
    let parsed: any;
    try {
        parsed = JSON.parse(VERTEX_AI_SERVICE_ACCOUNT);
    } catch (parseError) {
         console.error("Failed to parse service account JSON:", parseError);
         return {
            isValid: false,
            error: `Failed to parse service account JSON: ${parseError.message}`
        };
    }

    // 3. Initialize health check object
    const healthCheck: ServiceAccountHealth = {
      isValid: true, // Assume valid initially
      hasProjectId: Boolean(parsed.project_id),
      hasClientEmail: Boolean(parsed.client_email),
      hasPrivateKey: Boolean(parsed.private_key),
      privateKeyFormat: 'missing' // Default if no key
    };

    // 4. Determine private key format status if key exists
    if (healthCheck.hasPrivateKey) {
        // Basic check for PEM markers. This doesn't guarantee cryptographic validity
        // but catches common formatting errors (like missing newlines or markers).
        const keyString = String(parsed.private_key); // Ensure it's treated as a string
        healthCheck.privateKeyFormat = (keyString.includes("-----BEGIN PRIVATE KEY-----") && keyString.includes("-----END PRIVATE KEY-----"))
            ? 'valid'
            : 'invalid';
    }

    // 5. Check for missing required fields
    const missingFields: string[] = [];
    if (!healthCheck.hasProjectId) missingFields.push("project_id");
    if (!healthCheck.hasClientEmail) missingFields.push("client_email");
    if (!healthCheck.hasPrivateKey) missingFields.push("private_key");

    // 6. Update validity and error message based on checks
    if (missingFields.length > 0) {
      healthCheck.isValid = false;
      // Combine errors if key format is also invalid
      const fieldError = `Missing required fields: ${missingFields.join(", ")}`;
      const formatError = (healthCheck.hasPrivateKey && healthCheck.privateKeyFormat === "invalid") ? " Invalid private key format." : "";
      healthCheck.error = fieldError + formatError;

    } else if (healthCheck.hasPrivateKey && healthCheck.privateKeyFormat === "invalid") {
        // If all fields are present but key format is bad
        healthCheck.isValid = false;
        healthCheck.error = "Invalid private key format (e.g., missing PEM markers or newlines)";
    }

    // 7. Return the final health status
    return healthCheck;

  } catch (error) {
    // Catch any unexpected errors during the health check process itself
    console.error("Unexpected error during service account health check:", error);
    return {
      isValid: false,
      error: `Unexpected error during health check: ${error.message}`
    };
  }
}