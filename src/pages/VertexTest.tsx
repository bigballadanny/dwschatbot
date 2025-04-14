import React, { useState, useEffect } from 'react';
import { SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; 
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2, Info, Terminal, ShieldAlert, Bug, FileCode, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/components/ui/use-toast";
import { VertexAIValidator } from '@/components/VertexAIValidator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { 
  preprocessServiceAccountJson, 
  validateServiceAccountJson,
  repairServiceAccountKey,
  diagnosticServiceAccountJson,
  createServiceAccountWithRawKey,
  extractRawBase64FromKey,
  extractRawJsonForDisplay
} from '@/utils/serviceAccountUtils';
import { useDebounce } from '@/utils/performanceUtils';

const VertexTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string>('Hello, AI');
  const [logs, setLogs] = useState<string[]>([]);
  const [diagnosticsMode, setDiagnosticsMode] = useState<string>('basic');
  const [serviceAccountSummary, setServiceAccountSummary] = useState<any>(null);
  const [serviceAccountInput, setServiceAccountInput] = useState<string>('');
  const [serviceAccountValidation, setServiceAccountValidation] = useState<any>(null);
  const [isProcessingRawKey, setIsProcessingRawKey] = useState(false);

  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] [${type.toUpperCase()}] ${message}`]);
  };

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

  const validateServiceAccount = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const processedJson = preprocessServiceAccountJson(serviceAccountInput);
      
      addLog('Validating service account structure...', 'info');
      
      let parsedAccount;
      try {
        parsedAccount = JSON.parse(processedJson);
        
        parsedAccount = repairServiceAccountKey(parsedAccount);
      } catch (parseError) {
        addLog(`JSON parsing error: ${parseError instanceof Error ? parseError.message : String(parseError)}`, 'error');
        setError(`Invalid JSON format: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        setIsLoading(false);
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('test-auth-jwt', {
        body: { 
          validateOnly: true,
          serviceAccount: parsedAccount
        }
      });
      
      if (error) {
        addLog(`Validation error: ${error.message}`, 'error');
        setError(`Validation error: ${error.message}`);
        setServiceAccountValidation(null);
      } else {
        setServiceAccountValidation(data);
        
        if (data.success) {
          addLog('Service account structure appears valid', 'success');
        } else {
          addLog(`Service account validation found issues: ${data.issues.join(', ')}`, 'error');
        }
      }
    } catch (err) {
      console.error("Service account validation error:", err);
      addLog(`Error validating service account: ${err instanceof Error ? err.message : String(err)}`, 'error');
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setServiceAccountValidation(null);
    } finally {
      setIsLoading(false);
    }
  };

  const setServiceAccount = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const processedJson = preprocessServiceAccountJson(serviceAccountInput);
      
      try {
        let parsedAccount = JSON.parse(processedJson);
        parsedAccount = repairServiceAccountKey(parsedAccount);
        
        const validation = validateServiceAccountJson(parsedAccount);
        
        if (!validation.isValid) {
          addLog(`Invalid service account: Missing fields: ${validation.missingFields.join(', ')}`, 'error');
          setError(`Invalid service account: Missing required fields: ${validation.missingFields.join(', ')}`);
          return;
        }
        
        const diagnostics = diagnosticServiceAccountJson(parsedAccount);
        addLog(`Private key diagnostics: Length=${diagnostics.privateKeyStats.length}, Has markers=${diagnostics.privateKeyStats.hasBeginMarker && diagnostics.privateKeyStats.hasEndMarker}`, 'info');
        
        addLog('Testing JWT creation with the provided service account...', 'info');
        
        const { data, error } = await supabase.functions.invoke('test-auth-jwt', {
          body: { 
            serviceAccount: parsedAccount,
            testAuth: false
          }
        });
        
        if (error) {
          addLog(`JWT test failed: ${error.message}`, 'error');
          setError(`JWT test failed: ${error.message}`);
          return;
        }
        
        if (!data.success) {
          addLog(`JWT test failed: ${data.message}`, 'error');
          setError(`JWT test failed: ${data.message}`);
          return;
        }
        
        addLog('Service account validated successfully. In a production app, you would save this to secure storage.', 'success');
        
        toast({
          title: "Service Account Validated",
          description: "The service account JSON was validated successfully and appears to have the correct format.",
        });
      } catch (parseError) {
        addLog(`Invalid JSON format: ${parseError instanceof Error ? parseError.message : String(parseError)}`, 'error');
        setError(`Invalid JSON format: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
    } catch (err) {
      console.error("Error setting service account:", err);
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`, 'error');
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const rawKeyFormSchema = z.object({
    projectId: z.string().min(1, "Project ID is required"),
    clientEmail: z.string().email("Must be a valid email address"),
    privateKeyId: z.string().min(1, "Private Key ID is required"),
    rawBase64Key: z.string().min(100, "Raw Base64 key looks too short")
  });

  const rawKeyForm = useForm<z.infer<typeof rawKeyFormSchema>>({
    resolver: zodResolver(rawKeyFormSchema),
    defaultValues: {
      projectId: "",
      clientEmail: "",
      privateKeyId: "",
      rawBase64Key: ""
    },
  });

  const onRawKeySubmit = async (values: z.infer<typeof rawKeyFormSchema>) => {
    setIsProcessingRawKey(true);
    setError(null);
    
    try {
      addLog('Creating service account from raw key...', 'info');
      
      const serviceAccount = createServiceAccountWithRawKey(
        values.projectId,
        values.clientEmail,
        values.privateKeyId,
        values.rawBase64Key
      );
      
      addLog('Testing JWT creation with constructed service account...', 'info');
      const { data, error } = await supabase.functions.invoke('test-auth-jwt', {
        body: { 
          serviceAccount: serviceAccount,
          testAuth: true
        }
      });
      
      if (error) {
        addLog(`JWT test failed: ${error.message}`, 'error');
        setError(`JWT test failed: ${error.message}`);
        return;
      }
      
      if (!data.success) {
        addLog(`JWT test failed: ${data.message}`, 'error');
        setError(`JWT test failed: ${data.message}`);
        return;
      }
      
      addLog('Service account with raw key validated successfully!', 'success');
      
      toast({
        title: "Authentication Successful",
        description: "The raw key was processed successfully and authenticated with Google.",
      });
    } catch (err) {
      console.error("Error processing raw key:", err);
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`, 'error');
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
      
      toast({
        title: "Raw Key Processing Failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsProcessingRawKey(false);
    }
  };

  const handleProcessExistingKey = () => {
    try {
      if (!serviceAccountInput) {
        toast({
          title: "No input found",
          description: "Please paste a service account JSON first",
          variant: "destructive"
        });
        return;
      }
      
      try {
        const parsedAccount = JSON.parse(preprocessServiceAccountJson(serviceAccountInput));
        const privateKey = parsedAccount.private_key || "";
        
        if (!privateKey) {
          toast({
            title: "No private key found",
            description: "The service account JSON doesn't contain a private_key field",
            variant: "destructive"
          });
          return;
        }
        
        const rawBase64 = extractRawBase64FromKey(privateKey);
        
        rawKeyForm.setValue("projectId", parsedAccount.project_id || "");
        rawKeyForm.setValue("clientEmail", parsedAccount.client_email || "");
        rawKeyForm.setValue("privateKeyId", parsedAccount.private_key_id || "");
        rawKeyForm.setValue("rawBase64Key", rawBase64);
        
        toast({
          title: "Key Extracted",
          description: "The private key has been extracted. Switch to the Raw Key tab to use it.",
        });
      } catch (error) {
        console.error("Error parsing service account:", error);
        toast({
          title: "Parsing Error",
          description: "Could not parse the service account JSON",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("Error in handleProcessExistingKey:", err);
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
      // Format the JSON for display
      const formattedJson = extractRawJsonForDisplay(serviceAccountInput);
      
      // Update the input with the formatted version
      setServiceAccountInput(formattedJson);
      
      toast({
        title: "JSON Formatted",
        description: "The service account JSON has been formatted for better readability",
      });
    } catch (error) {
      toast({
        title: "Formatting Error",
        description: "Could not format the JSON. Make sure it's valid JSON.",
        variant: "destructive"
      });
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
            <TabsTrigger value="input">Input JSON</TabsTrigger>
            <TabsTrigger value="rawKey">Raw Key</TabsTrigger>
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
          
          <TabsContent value="input" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShieldAlert className="mr-2 h-5 w-5 text-primary" />
                  Service Account JSON Input
                </CardTitle>
                <CardDescription>
                  Paste your Google Cloud service account JSON to validate and test it
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>JSON Validation Tool</AlertTitle>
                  <AlertDescription>
                    This tool helps identify common issues with service account files without sending your credentials to any external servers.
                  </AlertDescription>
                </Alert>
                
                <Textarea 
                  placeholder="Paste your JSON service account here..." 
                  className="min-h-[200px] font-mono text-sm"
                  value={serviceAccountInput}
                  onChange={(e) => setServiceAccountInput(e.target.value)}
                />
                
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="secondary"
                    onClick={extractAndDisplayRawJson}
                    disabled={isLoading || !serviceAccountInput}
                  >
                    Format JSON
                  </Button>
                  <Button
                    variant="outline"
                    onClick={validateServiceAccount}
                    disabled={isLoading || !serviceAccountInput}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Validate Format
                  </Button>
                  <Button
                    onClick={setServiceAccount}
                    disabled={isLoading || !serviceAccountInput}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Test JWT Creation
                  </Button>
                </div>
                
                {serviceAccountValidation && (
                  <div className="mt-4">
                    <Alert variant={serviceAccountValidation.success ? "success" : "destructive"}>
                      {serviceAccountValidation.success 
                        ? <CheckCircle className="h-4 w-4" /> 
                        : <AlertCircle className="h-4 w-4" />}
                      <AlertTitle>
                        {serviceAccountValidation.success 
                          ? "Service Account Valid" 
                          : "Service Account Issues"}
                      </AlertTitle>
                      <AlertDescription>
                        {serviceAccountValidation.success 
                          ? "The service account JSON has the correct structure." 
                          : (
                            <ul className="list-disc pl-5 space-y-1">
                              {serviceAccountValidation.issues.map((issue, i) => (
                                <li key={i}>{issue}</li>
                              ))}
                            </ul>
                          )}
                          
                        {serviceAccountValidation.privateKeyAnalysis && (
                          <div className="mt-2 text-xs border-t pt-2">
                            <p className="font-medium mb-1">Private Key Analysis:</p>
                            <ul className="list-disc pl-5 space-y-0.5">
                              <li>Length: {serviceAccountValidation.privateKeyAnalysis.length} chars</li>
                              <li>Has BEGIN marker: {serviceAccountValidation.privateKeyAnalysis.hasBeginMarker ? "Yes" : "No"}</li>
                              <li>Has END marker: {serviceAccountValidation.privateKeyAnalysis.hasEndMarker ? "Yes" : "No"}</li>
                              <li>Has newlines: {serviceAccountValidation.privateKeyAnalysis.hasNewlines ? "Yes" : "No"}</li>
                              <li>Has escaped newlines: {serviceAccountValidation.privateKeyAnalysis.containsEscapedNewlines ? "Yes" : "No"}</li>
                            </ul>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
                
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="rawKey" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="mr-2 h-5 w-5 text-primary" />
                  Raw Base64 Private Key Input
                </CardTitle>
                <CardDescription>
                  Use this alternative method to authenticate by providing the raw base64 content of your private key
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="default" className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-500" />
                  <AlertTitle>Alternative Authentication Method</AlertTitle>
                  <AlertDescription className="text-sm">
                    <p className="mb-2">
                      This method bypasses common issues with service account JSON formatting by working directly with the
                      raw base64 content of your private key.
                    </p>
                    <ol className="list-decimal pl-5 space-y-0.5">
                      <li>If you already pasted a service account JSON in the Input JSON tab, click "Extract from JSON" below.</li>
                      <li>Otherwise, fill in the project details and paste just the raw base64 content of your private key.</li>
                    </ol>
                  </AlertDescription>
                </Alert>
                
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleProcessExistingKey}
                    className="mb-4"
                  >
                    <FileCode className="mr-2 h-4 w-4" />
                    Extract from JSON
                  </Button>
                </div>
                
                <Form {...rawKeyForm}>
                  <form onSubmit={rawKeyForm.handleSubmit(onRawKeySubmit)} className="space-y-4">
                    <FormField
                      control={rawKeyForm.control}
                      name="projectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Google Cloud Project ID</FormLabel>
                          <FormControl>
                            <Input placeholder="my-project-123456" {...field} />
                          </FormControl>
                          <FormDescription>
                            The project ID from your Google Cloud Console
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={rawKeyForm.control}
                      name="clientEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Account Email</FormLabel>
                          <FormControl>
                            <Input placeholder="service-account@project-id.iam.gserviceaccount.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            The client_email from your service account
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={rawKeyForm.control}
                      name="privateKeyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Private Key ID</FormLabel>
                          <FormControl>
                            <Input placeholder="abcdef1234567890abcdef1234567890abcdef12" {...field} />
                          </FormControl>
                          <FormDescription>
                            The private_key_id from your service account
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={rawKeyForm.control}
                      name="rawBase64Key"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Raw Base64 Private Key</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="MIIEvgIBADANBgkqhkiG9w0BAQEFAA..." 
                              className="font-mono text-sm min-h-[150px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Only the base64 content of your private key, without header/footer or formatting
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      disabled={isProcessingRawKey}
                      className="w-full"
                    >
                      {isProcessingRawKey ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Test Authentication with Raw Key'
                      )}
                    </Button>
                  </form>
                </Form>
                
                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="text-xs text-muted-foreground mt-4">
                  <h4 className="font-semibold mb-1">How to find your private key's raw base64 content:</h4>
                  <ol className="list-decimal pl-5 space-y-0.5">
                    <li>Open your service account JSON file</li>
                    <li>Find the "private_key" field</li>
                    <li>Remove the "-----BEGIN PRIVATE KEY-----" and "-----END PRIVATE KEY-----" markers</li>
                    <li>Remove all newline characters (\n) and spaces</li>
                    <li>The remaining content is the raw base64 key</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
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
                      <Alert variant="default" className="bg-amber-50 border-amber-200">
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
