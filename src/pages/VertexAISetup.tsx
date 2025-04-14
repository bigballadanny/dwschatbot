
import { VertexAIValidator } from '@/components/VertexAIValidator';

export default function VertexAISetup() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Vertex AI Setup</h1>
      <p className="text-gray-600 mb-8">
        Use this page to validate your Vertex AI service account configuration and troubleshoot any issues.
      </p>
      
      <div className="flex justify-center">
        <VertexAIValidator />
      </div>
      
      <div className="mt-12 border-t pt-6">
        <h2 className="text-xl font-semibold mb-4">Common Issues</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">Invalid JSON Format</h3>
            <p className="text-sm text-gray-600">
              Ensure the service account JSON is valid and doesn't contain any extra escape characters. 
              Copy directly from the downloaded JSON file without modifications.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium">Private Key Format</h3>
            <p className="text-sm text-gray-600">
              The private key must contain actual newlines, not escaped "\n" characters. 
              When pasting into the Supabase secrets, ensure that line breaks are preserved.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium">Missing Required Fields</h3>
            <p className="text-sm text-gray-600">
              The service account JSON must contain all required fields including type, project_id, private_key_id,
              private_key, client_email, client_id, auth_uri, and token_uri.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
