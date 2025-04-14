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
    // Handle the case where jsonInput might be an object already
    let parsedJson: any;
    if (typeof jsonInput === 'object') {
      parsedJson = jsonInput;
    } else {
      // Parse the JSON to get the object
      parsedJson = JSON.parse(jsonInput);
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
    return jsonInput; // Return the original input on error
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
 */
export function formatPEMKey(base64Content: string, type: string = "PRIVATE KEY"): string {
  // Clean the base64 content first
  let cleanBase64 = base64Content.replace(/\s/g, '');
  
  // Remove any non-base64 characters
  cleanBase64 = cleanBase64.replace(/[^A-Za-z0-9+/=]/g, '');
  
  // Ensure the base64 string length is valid
  const remainder = cleanBase64.length % 4;
  if (remainder > 0) {
    cleanBase64 += '='.repeat(4 - remainder);
  }
  
  // Format with proper line breaks (64 characters per line)
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
    // without risking memory issues on very large strings
    const testSection = validatedStr.substring(0, Math.min(100, validatedStr.length));
    atob(testSection);
    
    return true;
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
