
/**
 * Formats and normalizes a private key to ensure it has proper PEM structure
 * This handles common issues with service account JSON including:
 * - Escaped newlines
 * - Missing PEM headers/footers
 * - Improper line breaks
 */
export function normalizePrivateKey(privateKey: string): string {
  // Remove any existing PEM markers and whitespace to get clean base64
  let cleanBase64 = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '')
    .replace(/\\n/g, '');
  
  // Remove any non-base64 characters that might have been introduced
  cleanBase64 = cleanBase64.replace(/[^A-Za-z0-9+/=]/g, '');
  
  // Ensure the base64 string length is valid (must be divisible by 4)
  while (cleanBase64.length % 4 !== 0) {
    cleanBase64 += '=';
  }
  
  // Format with proper line breaks (64 characters per line)
  let formattedKey = '-----BEGIN PRIVATE KEY-----\n';
  
  for (let i = 0; i < cleanBase64.length; i += 64) {
    formattedKey += cleanBase64.slice(i, i + 64) + '\n';
  }
  
  formattedKey += '-----END PRIVATE KEY-----';
  
  return formattedKey;
}

/**
 * Pre-processes service account JSON to handle common formatting issues
 */
export function preprocessServiceAccountJson(jsonInput: string): string {
  try {
    // Parse the JSON to get the object
    let serviceAccount = JSON.parse(jsonInput);
    
    // If private_key exists, normalize its format
    if (serviceAccount.private_key) {
      serviceAccount.private_key = normalizePrivateKey(serviceAccount.private_key);
    }
    
    // Convert back to properly formatted JSON string
    return JSON.stringify(serviceAccount, null, 2);
  } catch (error) {
    // If there's a parsing error, return the original input
    console.error("Error preprocessing service account JSON:", error);
    return jsonInput;
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
