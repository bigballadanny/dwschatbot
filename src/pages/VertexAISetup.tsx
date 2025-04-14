
import { VertexAIValidator } from '@/components/VertexAIValidator';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function VertexAISetup() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Link to="/">
          <Button variant="outline" size="sm" className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chat
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Vertex AI Setup</h1>
      </div>
      
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
      
      <div className="mt-8 bg-blue-50 p-4 rounded border border-blue-100">
        <h3 className="font-medium text-blue-800">How to Fix Service Account JSON</h3>
        <ol className="list-decimal ml-4 mt-2 space-y-2 text-sm text-blue-700">
          <li>Go to your Google Cloud Console and download a fresh copy of your service account key</li>
          <li>Open the JSON file in a text editor and ensure it's properly formatted</li>
          <li>When adding to Supabase Secrets, use a text editor that preserves newlines</li>
          <li>Make sure the entire JSON is wrapped in curly braces and there are no syntax errors</li>
          <li>After updating, click the "Validate Service Account" button to check if the issues are resolved</li>
        </ol>
      </div>
    </div>
  );
}
