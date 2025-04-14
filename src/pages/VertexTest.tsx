
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  createServiceAccountWithRawKey,
  extractKeyBase64Content,
  extractRawJsonForDisplay,
  formatPEMKey,
  isValidBase64,
  preprocessServiceAccountJson,
  validateServiceAccountJson,
  diagnosticServiceAccountJson,
  repairServiceAccountKey,
  prepareServiceAccountForSupabase
} from "@/utils/serviceAccountUtils";

const VertexTest = () => {
  const [serviceAccountInput, setServiceAccountInput] = useState('');
  const [rawKeyInput, setRawKeyInput] = useState('');
  const [projectId, setProjectId] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [privateKeyId, setPrivateKeyId] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [formattedJson, setFormattedJson] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [supabaseFormatted, setSupabaseFormatted] = useState('');
  const { toast } = useToast();
  
  const validateServiceAccount = async () => {
    if (!serviceAccountInput.trim()) {
      toast({
        title: "No input",
        description: "Please enter a service account JSON first",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const parsed = JSON.parse(serviceAccountInput);
      const result = validateServiceAccountJson(parsed);
      setValidationResult(result);
      
      if (result.isValid) {
        toast({
          title: "Validation Passed",
          description: "Service account is valid",
        });
      } else {
        toast({
          title: "Validation Failed",
          description: `Missing fields: ${result.missingFields.join(', ')}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Parse Error",
        description: "Could not parse JSON. Ensure it's valid JSON.",
        variant: "destructive"
      });
      setValidationResult(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  const testServiceAccount = async () => {
    if (!serviceAccountInput.trim()) {
      toast({
        title: "No input",
        description: "Please enter a service account JSON first",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const parsed = JSON.parse(serviceAccountInput);
      const result = await fetch('/api/test-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsed),
      }).then(res => res.json());
      
      if (result.success) {
        toast({
          title: "Authentication Passed",
          description: "Successfully authenticated with the service account",
        });
      } else {
        toast({
          title: "Authentication Failed",
          description: result.error || "Authentication failed",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatRawKey = () => {
    if (!rawKeyInput.trim()) {
      toast({
        title: "No input",
        description: "Please enter a raw base64 key first",
        variant: "destructive"
      });
      return;
    }
    
    if (!projectId.trim() || !clientEmail.trim() || !privateKeyId.trim()) {
      toast({
        title: "Missing Fields",
        description: "Please enter Project ID, Client Email, and Private Key ID",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const serviceAccount = createServiceAccountWithRawKey(projectId, clientEmail, privateKeyId, rawKeyInput);
      setServiceAccountInput(JSON.stringify(serviceAccount, null, 2));
      toast({
        title: "Service Account Created",
        description: "Service account JSON created from raw key",
      });
    } catch (error) {
      toast({
        title: "Error Creating Account",
        description: error.message || "Could not create service account",
        variant: "destructive"
      });
    }
  };
  
  const extractAndDisplayRawJson = () => {
    if (!serviceAccountInput.trim()) {
      toast({
        title: "No input",
        description: "Please enter a service account JSON first",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const extracted = extractRawJsonForDisplay(serviceAccountInput);
      setFormattedJson(extracted);
      toast({
        title: "Formatted JSON",
        description: "Formatted JSON extracted and displayed",
      });
    } catch (error) {
      toast({
        title: "Error Extracting",
        description: "Could not extract raw JSON. Ensure it's valid JSON.",
        variant: "destructive"
      });
    }
  };
  
  const copyForSupabase = () => {
    if (!serviceAccountInput.trim()) {
      toast({
        title: "No input",
        description: "Please enter a service account JSON first",
        variant: "destructive"
      });
      return;
    }

    try {
      // Parse the input as JSON
      let parsed;
      try {
        parsed = JSON.parse(serviceAccountInput);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        toast({
          title: "Invalid JSON",
          description: "Please enter valid JSON service account credentials",
          variant: "destructive"
        });
        return;
      }
      
      // Prepare the service account for Supabase storage
      const preparedJson = prepareServiceAccountForSupabase(parsed);
      
      // Store the formatted JSON for display
      setSupabaseFormatted(preparedJson);
      
      // Log to console for verification and easy copy
      console.log("=== FORMATTED SERVICE ACCOUNT FOR SUPABASE ===");
      console.log(preparedJson);
      console.log("=== COPY THE ABOVE JSON TO YOUR SUPABASE SECRET ===");
      
      // Attempt to copy to clipboard
      navigator.clipboard.writeText(preparedJson).then(() => {
        toast({
          title: "Copied for Supabase",
          description: "Properly formatted JSON copied to clipboard. Check your console log for the formatted JSON if needed.",
        });
      }).catch(err => {
        console.error("Clipboard copy failed:", err);
        toast({
          title: "Copy to Clipboard Failed",
          description: "Please check the console and manually copy the formatted JSON from there.",
          variant: "destructive"
        });
      });
    } catch (error) {
      console.error("Error in copyForSupabase:", error);
      toast({
        title: "Error Formatting",
        description: `Formatting failed: ${error.message}. Please check the console for more details.`,
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="container py-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Vertex AI Service Account Tester</h1>
      
      <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
          <CardDescription className="text-blue-800 dark:text-blue-300">
            Follow these steps to set up your Vertex AI credentials:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-2 text-blue-800 dark:text-blue-300">
            <li>Paste your Google Cloud service account JSON in the "Input JSON" tab</li>
            <li>Click "Validate" to check the formatting and required fields</li>
            <li>Click "Copy for Supabase" to get a properly formatted version for Supabase secrets</li>
            <li>Copy the formatted JSON from the clipboard (or from the browser console if copy fails)</li>
            <li>Go to Supabase and set <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded">VERTEX_AI_SERVICE_ACCOUNT</code> in your secrets</li>
            <li>Return here and click "Test Auth" to verify your credentials are working</li>
          </ol>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="input-json" className="mt-6">
        <TabsList>
          <TabsTrigger value="input-json">Input JSON</TabsTrigger>
          <TabsTrigger value="raw-key">Raw Key Input</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
        </TabsList>
        
        <TabsContent value="input-json" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Account JSON</CardTitle>
              <CardDescription>
                Paste your service account JSON here for validation and processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="mb-4">
                  <textarea 
                    className="w-full h-60 p-2 font-mono text-sm border rounded"
                    placeholder="Paste your service account JSON here..."
                    value={serviceAccountInput}
                    onChange={(e) => setServiceAccountInput(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="secondary"
                    onClick={extractAndDisplayRawJson}
                    disabled={isLoading || !serviceAccountInput}
                  >
                    Format JSON
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={copyForSupabase}
                    disabled={isLoading || !serviceAccountInput}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Copy for Supabase
                  </Button>
                  <Button
                    variant="outline"
                    onClick={validateServiceAccount}
                    disabled={isLoading || !serviceAccountInput}
                  >
                    Validate
                  </Button>
                  <Button
                    variant="default"
                    onClick={testServiceAccount}
                    disabled={isLoading || !serviceAccountInput}
                  >
                    Test Auth
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="raw-key" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Raw Key Input</CardTitle>
              <CardDescription>
                Enter the details and raw base64 key to create a service account JSON
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="project-id">Project ID</Label>
                <Input 
                  type="text" 
                  id="project-id" 
                  placeholder="Your Project ID" 
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client-email">Client Email</Label>
                <Input 
                  type="email" 
                  id="client-email" 
                  placeholder="client@example.com" 
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="private-key-id">Private Key ID</Label>
                <Input 
                  type="text" 
                  id="private-key-id" 
                  placeholder="Your Private Key ID" 
                  value={privateKeyId}
                  onChange={(e) => setPrivateKeyId(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="raw-key">Raw Base64 Key</Label>
                <textarea
                  id="raw-key"
                  className="w-full h-40 p-2 font-mono text-sm border rounded"
                  placeholder="Paste your raw base64 key here..."
                  value={rawKeyInput}
                  onChange={(e) => setRawKeyInput(e.target.value)}
                />
              </div>
              <Button onClick={formatRawKey} disabled={isLoading}>
                Create Service Account
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Validation Results</CardTitle>
              <CardDescription>
                Results from validating the service account JSON
              </CardDescription>
            </CardHeader>
            <CardContent>
              {validationResult ? (
                <pre className="font-mono text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded overflow-auto">
                  {JSON.stringify(validationResult, null, 2)}
                </pre>
              ) : (
                <p>No validation results yet. Please validate the JSON first.</p>
              )}
            </CardContent>
          </Card>
          
          {supabaseFormatted && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
              <CardHeader>
                <CardTitle>Supabase Formatted JSON</CardTitle>
                <CardDescription className="text-green-800 dark:text-green-300">
                  This format is ready for Supabase secrets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded">
                  <p className="mb-2 text-green-700 dark:text-green-400">
                    ✓ The JSON has been copied to your clipboard and is correctly formatted for Supabase
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    You can also find this JSON in your browser console if needed
                  </p>
                </div>
                <div className="mt-4">
                  <Button 
                    onClick={() => navigator.clipboard.writeText(supabaseFormatted)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Copy Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Formatted JSON</CardTitle>
              <CardDescription>
                Formatted and preprocessed JSON output
              </CardDescription>
            </CardHeader>
            <CardContent>
              {formattedJson ? (
                <pre className="font-mono text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded overflow-auto">
                  {formattedJson}
                </pre>
              ) : (
                <p>No formatted JSON yet. Please extract the JSON first.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default VertexTest;
