
/**
 * Formats and normalizes a private key to ensure it has proper PEM structure
 * This handles common issues with service account JSON including:
 * - Escaped newlines
 * - Missing PEM headers/footers
 * - Improper line breaks
 */
export function normalizePrivateKey(privateKey: string): string {
  // Remove any existing PEM markers and whitespace to get clean base64
  const cleanBase64 = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '')
    .replace(/\\n/g, '');
  
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
