/**
 * Formats and normalizes a private key to ensure it has proper PEM structure
 * This handles common issues with service account JSON including:
 * - Escaped newlines
 * - Missing PEM headers/footers
 * - Improper line breaks
 */
export function normalizePrivateKey(privateKey: string): string {
  if (!privateKey) {
    throw new Error("Private key is empty or undefined");
  }

  // First, handle escaped newlines by replacing them with actual newlines
  let processedKey = privateKey.replace(/\\n/g, '\n');
  
  // Check if the key already has proper PEM markers
  const hasBeginMarker = processedKey.includes('-----BEGIN PRIVATE KEY-----');
  const hasEndMarker = processedKey.includes('-----END PRIVATE KEY-----');
  
  // If the key already has proper markers, we'll extract just the base64 content
  if (hasBeginMarker && hasEndMarker) {
    // Extract just the base64 content between markers
    const base64Content = processedKey
      .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, '')
      .replace(/\s/g, '');
    
    // Reformat with proper structure
    return formatPEMKey(base64Content, 'PRIVATE KEY');
  } 
  // If the key doesn't have proper markers, treat the whole thing as base64 content
  else {
    // Clean the input to get just the base64 content
    const base64Content = processedKey.replace(/\s/g, '');
    
    // Validate if it's actually base64 before proceeding
    if (!isValidBase64(base64Content)) {
      throw new Error("Private key contains invalid base64 characters");
    }
    
    // Format into proper PEM structure
    return formatPEMKey(base64Content, 'PRIVATE KEY');
  }
}

/**
 * Pre-processes service account JSON to handle common formatting issues
 */
export function preprocessServiceAccountJson(jsonInput: string): string {
  try {
    let parsedJson: any;
    
    // Handle string vs object input
    if (typeof jsonInput === 'string') {
      parsedJson = JSON.parse(jsonInput);
    } else {
      parsedJson = jsonInput;
    }
    
    // If private_key exists, normalize its format
    if (parsedJson.private_key) {
      try {
        parsedJson.private_key = normalizePrivateKey(parsedJson.private_key);
        console.log("Private key normalized successfully");
      } catch (keyError) {
        console.error("Error normalizing private key:", keyError);
        // Keep the original key if normalization fails
      }
    }
    
    // Convert back to properly formatted JSON string
    return JSON.stringify(parsedJson, null, 2);
  } catch (error) {
    console.error("Error preprocessing service account JSON:", error);
    return typeof jsonInput === 'string' ? jsonInput : JSON.stringify(jsonInput);
  }
}

/**
 * Validates that a service account JSON has the required fields
 */
export function validateServiceAccountJson(serviceAccount: any): {
  isValid: boolean;
  missingFields: string[];
} {
  const requiredFields = ["type", "project_id", "private_key_id", "private_key", "client_email"];
  const missingFields = requiredFields.filter(field => !serviceAccount[field]);
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Provides deeper diagnostic information about a service account
 */
export function diagnosticServiceAccountJson(serviceAccount: any): {
  hasValidFormat: boolean;
  privateKeyStats: {
    length: number;
    hasBeginMarker: boolean;
    hasEndMarker: boolean;
    hasNewlines: boolean;
    containsEscapedNewlines: boolean;
  };
  suggestions: string[];
} {
  const suggestions: string[] = [];
  const privateKey = serviceAccount.private_key || '';
  
  // Check private key format
  const hasBeginMarker = privateKey.includes('-----BEGIN PRIVATE KEY-----');
  const hasEndMarker = privateKey.includes('-----END PRIVATE KEY-----');
  const hasNewlines = privateKey.includes('\n');
  const containsEscapedNewlines = privateKey.includes('\\n');
  
  // Generate suggestions based on issues
  if (!hasBeginMarker || !hasEndMarker) {
    suggestions.push("Private key is missing BEGIN/END markers. Use the preprocessor to fix this.");
  }
  
  if (containsEscapedNewlines && !hasNewlines) {
    suggestions.push("Private key has escaped newlines (\\n) but no actual newlines.");
  }
  
  if (!serviceAccount.project_id) {
    suggestions.push("Missing project_id field which is required for API access.");
  }
  
  if (!serviceAccount.client_email) {
    suggestions.push("Missing client_email field which is required for authentication.");
  }
  
  return {
    hasValidFormat: hasBeginMarker && hasEndMarker && hasNewlines,
    privateKeyStats: {
      length: privateKey.length,
      hasBeginMarker,
      hasEndMarker,
      hasNewlines,
      containsEscapedNewlines
    },
    suggestions
  };
}

/**
 * Creates a properly formatted PEM key from base64 content
 * Enhanced to fix SEQUENCE length issues
 */
export function formatPEMKey(base64Content: string, type: string = "PRIVATE KEY"): string {
  // Clean the base64 content first
  let cleanBase64 = base64Content.replace(/\s/g, '');
  
  // Remove any non-base64 characters
  cleanBase64 = cleanBase64.replace(/[^A-Za-z0-9+/=]/g, '');
  
  // Ensure the base64 string length is valid (must be a multiple of 4)
  const remainder = cleanBase64.length % 4;
  if (remainder > 0) {
    cleanBase64 += '='.repeat(4 - remainder);
  }
  
  // Format with EXACTLY 64 characters per line - THIS IS CRITICAL for ASN.1 SEQUENCE parsing
  let formattedContent = `-----BEGIN ${type}-----\n`;
  for (let i = 0; i < cleanBase64.length; i += 64) {
    formattedContent += cleanBase64.slice(i, i + 64) + '\n';
  }
  formattedContent += `-----END ${type}-----`;
  
  return formattedContent;
}

/**
 * Validates base64 content for proper encoding
 */
export function isValidBase64(str: string): boolean {
  try {
    // Remove all non-base64 characters and whitespace
    const cleanStr = str.replace(/[^A-Za-z0-9+/=]/g, '');
    
    // Check if the string is empty after cleaning
    if (cleanStr.length === 0) {
      return false;
    }
    
    // Check if length is valid multiple of 4 (or adjust padding)
    let validatedStr = cleanStr;
    const remainder = cleanStr.length % 4;
    if (remainder > 0) {
      validatedStr += '='.repeat(4 - remainder);
    }
    
    // Test decoding a small section to validate format
    // This method is safer than trying to decode the entire string
    const testSection = validatedStr.substring(0, Math.min(100, validatedStr.length));
    try {
      atob(testSection);
      return true;
    } catch (e) {
      return false;
    }
  } catch (e) {
    console.error("Base64 validation error:", e);
    return false;
  }
}

/**
 * Advanced key repair function to fix common issues with service account keys
 */
export function repairServiceAccountKey(serviceAccount: any): any {
  if (!serviceAccount) return serviceAccount;
  
  const updatedServiceAccount = {...serviceAccount};
  
  if (updatedServiceAccount.private_key) {
    try {
      // Handle special edge case where the key might be double-escaped
      if (updatedServiceAccount.private_key.includes('\\\\n')) {
        console.log("Detected double-escaped newlines in private key");
        updatedServiceAccount.private_key = updatedServiceAccount.private_key.replace(/\\\\n/g, '\n');
      }
      
      // Apply more aggressive normalization
      updatedServiceAccount.private_key = normalizePrivateKey(updatedServiceAccount.private_key);
      
      // Ensure there's a trailing newline after the END marker
      if (!updatedServiceAccount.private_key.endsWith('\n')) {
        updatedServiceAccount.private_key += '\n';
      }
    } catch (error) {
      console.error("Error repairing private key:", error);
    }
  }
  
  return updatedServiceAccount;
}

/**
 * Extracts only the base64 content from a private key
 */
export function extractKeyBase64Content(privateKey: string): string {
  if (!privateKey) return '';
  
  // Remove header, footer and all whitespace
  return privateKey
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
}

/**
 * Creates a service account object with a raw base64 private key
 */
export function createServiceAccountWithRawKey(projectId: string, clientEmail: string, privateKeyId: string, rawBase64Key: string): any {
  try {
    // Validate the raw base64 key
    if (!isValidBase64(rawBase64Key)) {
      throw new Error("The provided key is not valid base64");
    }
    
    // Create proper PEM formatted key
    const formattedKey = formatPEMKey(rawBase64Key, 'PRIVATE KEY');
    
    // Create a minimal service account object
    return {
      type: "service_account",
      project_id: projectId.trim(),
      private_key_id: privateKeyId.trim(),
      private_key: formattedKey,
      client_email: clientEmail.trim(),
    };
  } catch (error) {
    console.error("Error creating service account with raw key:", error);
    throw error;
  }
}

/**
 * Extracts just the raw base64 content from a private key string or file
 */
export function extractRawBase64FromKey(input: string): string {
  // Remove all whitespace, headers and footers
  return input
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '')
    .replace(/\\n/g, '');
}

/**
 * Utility to extract raw base64 from a service account JSON
 * Useful when you need to get the raw base64 for manual input
 */
export function extractRawJsonForDisplay(serviceAccountJson: string): string {
  try {
    // Try to parse the JSON string
    const parsed = JSON.parse(serviceAccountJson);
    
    // Return a pretty-printed version
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    console.error("Could not parse JSON for display:", error);
    // If parsing fails, just return the original input
    return serviceAccountJson;
  }
}

/**
 * Utility to generate a proper service account JSON for Supabase Secrets
 * This handles special requirements for storing in environment variables
 */
export function prepareServiceAccountForSupabase(serviceAccount: any): string {
  try {
    // Ensure the service account is an object
    const accountObj = typeof serviceAccount === 'string' 
      ? JSON.parse(serviceAccount) 
      : serviceAccount;
    
    // Make a copy to avoid modifying the original
    const preparedAccount = {...accountObj};
    
    // Ensure private key is properly formatted
    if (preparedAccount.private_key) {
      try {
        // First normalize to PEM format
        const normalizedKey = normalizePrivateKey(preparedAccount.private_key);
        
        // For Supabase storage, we need to properly escape newlines
        // This is critical for JWT validation to work
        preparedAccount.private_key = normalizedKey.replace(/\n/g, '\\n');
        
        console.log("Private key normalized and properly escaped for Supabase");
      } catch (error) {
        console.error("Error normalizing private key:", error);
        throw new Error(`Failed to prepare private key: ${error.message}`);
      }
    } else {
      throw new Error("No private_key found in service account");
    }
    
    // Convert to a properly formatted JSON string
    return JSON.stringify(preparedAccount);
  } catch (error) {
    console.error("Error preparing service account for Supabase:", error);
    throw error;
  }
}

/**
 * Special EXPERIMENTAL helper to fix primitive key format issues
 * This is for the "incorrect length for PRIVATE [2] (primitive)" error
 */
export function fixPrimitiveKeyFormat(serviceAccount: any): any {
  if (!serviceAccount || !serviceAccount.private_key) {
    return serviceAccount;
  }
  
  const fixedAccount = JSON.parse(JSON.stringify(serviceAccount));
  
  try {
    // Extract raw base64 content
    let rawBase64 = fixedAccount.private_key
      .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n|\r|\t|\s|\\n/g, '');
    
    // Special handling for padding - sometimes a missing or extra padding causes primitive errors
    // Try with different padding options
    let paddedBase64;
    // First, remove any existing padding
    rawBase64 = rawBase64.replace(/=/g, '');
    
    // Try different padding options based on remainder
    const remainder = rawBase64.length % 4;
    
    // Standard padding calculation
    if (remainder > 0) {
      paddedBase64 = rawBase64 + '='.repeat(4 - remainder);
    } else {
      paddedBase64 = rawBase64;
    }
    
    // Create a properly formatted PEM key with EXACTLY 64 characters per line
    let fixedKey = `-----BEGIN PRIVATE KEY-----\n`;
    for (let i = 0; i < paddedBase64.length; i += 64) {
      fixedKey += paddedBase64.slice(i, i + 64) + '\n';
    }
    fixedKey += `-----END PRIVATE KEY-----\n`;
    
    // Update the account with the fixed key
    fixedAccount.private_key = fixedKey;
    
    return fixedAccount;
  } catch (error) {
    console.error("Error fixing primitive key format:", error);
    return fixedAccount;
  }
}

/**
 * Fix for the "incorrect length for SEQUENCE" or "primitive" error
 * Advanced multi-stage approach that tries several fixes
 */
export function fixSequenceLengthError(serviceAccountJson: string): string {
  try {
    // First try to parse the JSON
    let parsed = JSON.parse(serviceAccountJson);
    
    if (!parsed.private_key) {
      throw new Error("No private_key found in service account");
    }
    
    // Store the original key to revert if our fixes don't work
    const originalKey = parsed.private_key;
    
    // Try the standard sequence length fix first
    const repaired = repairSequenceLengthIssue(parsed);
    
    // If the original key had newlines but the repaired one doesn't, we might have lost formatting
    if (originalKey.includes('\n') && !repaired.private_key.includes('\n')) {
      console.warn("Repair may have lost formatting, restoring newlines");
      // Fallback to original with just line length adjustments
      parsed.private_key = originalKey;
    } else {
      parsed = repaired;
    }
    
    // If we're seeing primitive errors, try that specific fix
    if (serviceAccountJson.includes("primitive") || serviceAccountJson.includes("PRIVATE [2]")) {
      console.log("Detected primitive error, applying specialized fix");
      parsed = fixPrimitiveKeyFormat(parsed);
    }
    
    // Convert back to JSON string with proper formatting
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    console.error("Could not fix sequence length error:", error);
    return serviceAccountJson;
  }
}

/**
 * Creates a minimal service account with just necessary fields and proper key formatting
 * This is useful when trying to debug specific key format issues
 */
export function createMinimalServiceAccount(projectId: string, clientEmail: string, privateKey: string): any {
  // Ensure private key is properly formatted
  const formattedKey = normalizePrivateKey(privateKey);
  
  return {
    type: "service_account",
    project_id: projectId.trim(),
    private_key: formattedKey,
    client_email: clientEmail.trim()
  };
}

/**
 * Advanced key repair function specialized for fixing SEQUENCE length errors
 * This targets the specific "incorrect length for SEQUENCE" error
 */
export function repairSequenceLengthIssue(serviceAccount: any): any {
  if (!serviceAccount || !serviceAccount.private_key) {
    return serviceAccount;
  }
  
  // Create a deep copy to avoid modifying the original
  const fixedAccount = JSON.parse(JSON.stringify(serviceAccount));
  
  try {
    // Extract raw base64 content from private key, removing ALL formatting
    let rawBase64 = fixedAccount.private_key
      .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n|\r|\t|\s|\\n/g, '');
    
    // Ensure length is a multiple of 4 for valid base64
    const remainder = rawBase64.length % 4;
    if (remainder > 0) {
      rawBase64 += '='.repeat(4 - remainder);
    }
    
    // Create a new, properly formatted PEM key with EXACTLY 64 characters per line
    let fixedKey = `-----BEGIN PRIVATE KEY-----\n`;
    for (let i = 0; i < rawBase64.length; i += 64) {
      fixedKey += rawBase64.slice(i, i + 64) + '\n';
    }
    fixedKey += `-----END PRIVATE KEY-----\n`;
    
    // Update the account with the fixed key
    fixedAccount.private_key = fixedKey;
    
    return fixedAccount;
  } catch (error) {
    console.error("Error repairing sequence length issue:", error);
    return fixedAccount;
  }
}
