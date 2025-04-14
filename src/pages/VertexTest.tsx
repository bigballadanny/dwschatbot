
import React, { useState } from 'react';
import { SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/components/ui/use-toast";
import { VertexAIValidator } from '@/components/VertexAIValidator';

const VertexTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string>('Hello, AI');
  
  const runBasicTest = async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);
    
    try {
      // Simple test with a basic message structure
      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: {
          messages: [
            {
              source: 'user',
              content: testMessage
            }
          ],
          enableOnlineSearch: false,
        }
      });
      
      if (error) {
        console.error("Function error:", error);
        setError(`Function error: ${error.message || JSON.stringify(error)}`);
        toast({
          title: "Test failed",
          description: "Check the console for more details",
          variant: "destructive"
        });
      } else {
        setResponse(data);
        toast({
          title: "Test complete",
          description: "Response received successfully",
        });
      }
    } catch (err) {
      console.error("Error running test:", err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
      toast({
        title: "Test failed",
        description: "Check the console for more details",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <SidebarInset>
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Vertex AI Diagnostics</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Account Validation</CardTitle>
              <CardDescription>
                Validate your Vertex AI service account configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VertexAIValidator />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Basic API Test</CardTitle>
              <CardDescription>
                Send a simple test message to verify the API connection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Test Message</label>
                <Input 
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription className="max-h-40 overflow-auto">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              
              {response && (
                <Alert variant="default" className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription className="max-h-80 overflow-auto">
                    <div className="font-medium mb-2">Response:</div>
                    <pre className="text-sm bg-muted p-2 rounded">{JSON.stringify(response, null, 2)}</pre>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={runBasicTest} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Run Basic Test'
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </SidebarInset>
  );
};

export default VertexTest;
