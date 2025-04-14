
import React, { useState, useEffect } from 'react';
import { SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; 
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2, Info, Terminal, ShieldAlert, Bug } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/components/ui/use-toast";
import { VertexAIValidator } from '@/components/VertexAIValidator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const VertexTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string>('Hello, AI');
  const [logs, setLogs] = useState<string[]>([]);
  const [diagnosticsMode, setDiagnosticsMode] = useState<string>('basic');
  const [serviceAccountSummary, setServiceAccountSummary] = useState<any>(null);
  
  // Helper function to add logs
  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] [${type.toUpperCase()}] ${message}`]);
  };
  
  // Get service account summary on mount
  useEffect(() => {
    const fetchServiceAccountSummary = async () => {
      try {
        addLog('Checking service account status...', 'info');
        
        const { data, error } = await supabase.functions.invoke('validate-service-account');
        
        if (error) {
          addLog(`Error validating service account: ${error.message}`, 'error');
          setServiceAccountSummary({ status: 'error', message: error.message });
        } else if (data.success) {
          addLog('Service account is valid', 'success');
          setServiceAccountSummary({ 
            status: 'valid', 
            project_id: data.serviceAccount?.project_id,
            client_email: data.serviceAccount?.client_email
          });
        } else {
          addLog(`Service account validation failed: ${data.message}`, 'error');
          setServiceAccountSummary({ status: 'invalid', errors: data.errors });
        }
      } catch (err) {
        addLog(`Error checking service account: ${err instanceof Error ? err.message : String(err)}`, 'error');
        setServiceAccountSummary({ status: 'error', message: 'Could not check service account status' });
      }
    };
    
    fetchServiceAccountSummary();
  }, []);
  
  const clearLogs = () => {
    setLogs([]);
  };
  
  const runBasicTest = async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);
    setResponseTime(null);
    
    addLog(`Running test with message: "${testMessage}"`, 'info');
    
    try {
      const startTime = performance.now();
      
      // Simple test with a basic message structure
      addLog('Sending request to gemini-chat function...', 'info');
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
      
      const endTime = performance.now();
      const elapsed = Math.round(endTime - startTime);
      setResponseTime(elapsed);
      
      if (error) {
        console.error("Function error:", error);
        addLog(`Error from function: ${error.message || JSON.stringify(error)}`, 'error');
        setError(`Function error: ${error.message || JSON.stringify(error)}`);
        toast({
          title: "Test failed",
          description: "Check the console for more details",
          variant: "destructive"
        });
      } else {
        addLog(`Success! Response received in ${elapsed}ms`, 'success');
        setResponse(data);
        toast({
          title: "Test complete",
          description: `Response received in ${elapsed}ms`,
        });
      }
    } catch (err) {
      console.error("Error running test:", err);
      addLog(`Exception during test: ${err instanceof Error ? err.message : String(err)}`, 'error');
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
  
  // Run raw JWT generation test
  const runJwtTest = async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);
    setResponseTime(null);
    
    addLog('Testing JWT token generation...', 'info');
    
    try {
      const startTime = performance.now();
      
      const { data, error } = await supabase.functions.invoke('test-auth-jwt', {
        body: { test: true }
      });
      
      const endTime = performance.now();
      const elapsed = Math.round(endTime - startTime);
      setResponseTime(elapsed);
      
      if (error) {
        console.error("JWT test error:", error);
        addLog(`JWT test failed: ${error.message || JSON.stringify(error)}`, 'error');
        setError(`JWT test failed: ${error.message || JSON.stringify(error)}`);
      } else {
        addLog(`JWT test completed in ${elapsed}ms`, 'success');
        setResponse(data);
        toast({
          title: "JWT test complete",
          description: data.success ? "JWT token generated successfully" : "JWT test failed",
          variant: data.success ? "default" : "destructive"
        });
      }
    } catch (err) {
      console.error("Error in JWT test:", err);
      addLog(`JWT test exception: ${err instanceof Error ? err.message : String(err)}`, 'error');
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <SidebarInset>
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Vertex AI Diagnostics</h1>
            <p className="text-muted-foreground mt-2">
              Use this page to test and validate your Vertex AI integration
            </p>
          </div>
          
          {serviceAccountSummary && (
            <div className="text-right">
              <Badge 
                variant={serviceAccountSummary.status === 'valid' ? 'default' : 'destructive'}
                className="mb-2"
              >
                {serviceAccountSummary.status === 'valid' ? 'Service Account Valid' : 'Service Account Invalid'}
              </Badge>
              {serviceAccountSummary.status === 'valid' && (
                <div className="text-xs text-muted-foreground">
                  <div>Project: {serviceAccountSummary.project_id}</div>
                  <div className="truncate max-w-xs">Email: {serviceAccountSummary.client_email}</div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <Tabs defaultValue="tests" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tests">API Tests</TabsTrigger>
            <TabsTrigger value="validator">Service Account</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="setup">Setup Guide</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Terminal className="mr-2 h-5 w-5 text-primary" />
                  Vertex AI API Tests
                </CardTitle>
                <CardDescription>
                  Test your Vertex AI integration with various diagnostic tools
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex gap-2 mb-2">
                    <Button 
                      variant={diagnosticsMode === 'basic' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setDiagnosticsMode('basic')}
                    >
                      Basic Test
                    </Button>
                    <Button 
                      variant={diagnosticsMode === 'jwt' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setDiagnosticsMode('jwt')}
                    >
                      JWT Test
                    </Button>
                  </div>
                  
                  {diagnosticsMode === 'basic' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Test Message</label>
                        <Input 
                          value={testMessage}
                          onChange={(e) => setTestMessage(e.target.value)}
                          disabled={isLoading}
                        />
                        <p className="text-xs text-muted-foreground">
                          Send a simple message to test Vertex AI connectivity
                        </p>
                      </div>
                      
                      <div className="flex justify-end">
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
                      </div>
                    </div>
                  )}
                  
                  {diagnosticsMode === 'jwt' && (
                    <div className="space-y-4">
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>JWT Token Test</AlertTitle>
                        <AlertDescription>
                          This test specifically checks if JWT token generation is working with your service account.
                          This is often the source of Vertex AI authentication issues.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="flex justify-end">
                        <Button onClick={runJwtTest} disabled={isLoading}>
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Testing JWT...
                            </>
                          ) : (
                            'Test JWT Generation'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                
                {responseTime !== null && (
                  <Alert variant="default" className="bg-muted">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Response Time</AlertTitle>
                    <AlertDescription>
                      {responseTime} ms
                    </AlertDescription>
                  </Alert>
                )}
                
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
            </Card>
          </TabsContent>
          
          <TabsContent value="validator">
            <VertexAIValidator />
          </TabsContent>
          
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Terminal className="mr-2 h-5 w-5" />
                  Diagnostic Logs
                </CardTitle>
                <CardDescription>
                  Activity logs for debugging your Vertex AI integration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-black text-green-400 font-mono p-4 rounded-md h-80 overflow-auto">
                  {logs.length === 0 ? (
                    <div className="text-gray-500 italic">No logs yet...</div>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className={`
                        ${log.includes('[ERROR]') ? 'text-red-400' : ''}
                        ${log.includes('[SUCCESS]') ? 'text-green-500' : ''}
                      `}>
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" onClick={clearLogs} size="sm">
                  Clear Logs
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="setup">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShieldAlert className="mr-2 h-5 w-5" />
                  Vertex AI Setup Guide
                </CardTitle>
                <CardDescription>
                  Follow this guide to set up your Vertex AI integration correctly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="step1">
                    <AccordionTrigger>1. Create a Google Cloud Service Account</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      <p>Go to the Google Cloud Console and create a new service account with the following roles:</p>
                      <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>Vertex AI User</li>
                        <li>Service Account Token Creator</li>
                      </ul>
                      <p className="text-sm mt-2">
                        After creating the service account, generate and download a JSON key file.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="step2">
                    <AccordionTrigger>2. Format the Service Account JSON Correctly</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      <p>The service account JSON must be properly formatted. Common issues:</p>
                      <Alert variant="warning" className="bg-amber-50 border-amber-200">
                        <Bug className="h-4 w-4" />
                        <AlertTitle>Common Issues</AlertTitle>
                        <AlertDescription className="space-y-2 text-sm">
                          <ul className="list-disc pl-6 space-y-1">
                            <li>Private key must preserve newlines (do not remove or escape them)</li>
                            <li>Make sure there are no extra characters before or after the JSON</li>
                            <li>Keep the BEGIN PRIVATE KEY and END PRIVATE KEY markers</li>
                          </ul>
                        </AlertDescription>
                      </Alert>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="step3">
                    <AccordionTrigger>3. Add the Service Account to Supabase Secrets</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      <p>In your Supabase dashboard:</p>
                      <ol className="list-decimal pl-6 space-y-1 text-sm">
                        <li>Go to Settings → API</li>
                        <li>Enter "VERTEX_AI_SERVICE_ACCOUNT" as the secret name</li>
                        <li>Paste the entire JSON object as the value</li>
                        <li>Save the secret</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="step4">
                    <AccordionTrigger>4. Enable the Vertex AI API</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      <p>In your Google Cloud Console, make sure the Vertex AI API is enabled for your project.</p>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="step5">
                    <AccordionTrigger>5. Test the Integration</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      <p>Use the tests in this diagnostic tool to verify your setup:</p>
                      <ol className="list-decimal pl-6 space-y-1 text-sm">
                        <li>Run the Service Account Validator to check credentials</li>
                        <li>Run the JWT Test to verify token generation</li>
                        <li>Run the Basic API Test to verify end-to-end communication</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SidebarInset>
  );
};

export default VertexTest;
