
// supabase/functions/gemini-chat/health.ts
/// <reference types="https://deno.land/x/deno/cli/types/dts/index.d.ts" />

// Health check for the service account configuration
export function checkServiceAccountHealth(): { 
  isValid: boolean; 
  error?: string;
  details?: Record<string, any>;
} {
  try {
    // Check if the service account environment variable exists
    const VERTEX_AI_SERVICE_ACCOUNT = Deno.env.get('VERTEX_AI_SERVICE_ACCOUNT');
    
    if (!VERTEX_AI_SERVICE_ACCOUNT) {
      return { 
        isValid: false, 
        error: "VERTEX_AI_SERVICE_ACCOUNT environment variable not found"
      };
    }

    // Parse the service account to check its format
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(VERTEX_AI_SERVICE_ACCOUNT);
    } catch (parseError) {
      return { 
        isValid: false, 
        error: `Invalid service account JSON: ${parseError.message}`,
        details: { 
          type: "parse_error", 
          length: VERTEX_AI_SERVICE_ACCOUNT.length 
        }
      };
    }

    // Check required fields
    const requiredFields = ['private_key', 'client_email', 'project_id'];
    const missingFields = requiredFields.filter(field => !serviceAccount[field]);
    
    if (missingFields.length > 0) {
      return { 
        isValid: false, 
        error: `Service account missing required fields: ${missingFields.join(", ")}`,
        details: { missingFields }
      };
    }

    // Very basic check of private key format
    const privateKey = serviceAccount.private_key;
    if (!privateKey.includes("PRIVATE KEY")) {
      return { 
        isValid: false, 
        error: "Service account has invalid private key format",
        details: { 
          keyStartsWith: privateKey.substring(0, 20) + "...",
          hasBeginMarker: privateKey.includes("BEGIN"),
          hasEndMarker: privateKey.includes("END")
        }
      };
    }

    // Return success if all checks passed
    return { 
      isValid: true,
      details: {
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email
      }
    };
    
  } catch (error) {
    console.error("Error in checkServiceAccountHealth:", error);
    return { 
      isValid: false, 
      error: `Service account check failed: ${error.message}`
    };
  }
}
