import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Check, X, AlertCircle, ChevronDown, ChevronUp, Shield, FileKey, FileWarning } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  preprocessServiceAccountJson, 
  validateServiceAccountJson, 
  repairServiceAccountKey,
  diagnosticServiceAccountJson,
  fixSequenceLengthError,
  repairSequenceLengthIssue,
  fixPrimitiveKeyFormat,
  createMinimalServiceAccount
} from '@/utils/serviceAccountUtils';
import { useDebounce } from '@/utils/performanceUtils';

export function VertexAIValidator() {
  const [isValidating, setIsValidating] = useState(false);
  const [results, setResults] = useState<{
    success: boolean;
    details?: any;
    message?: string;
    errors?: string[];
    fields?: {[key: string]: boolean};
  } | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [progress, setProgress] = useState(0);
  const [skipTests, setSkipTests] = useState(false);
  const [jwtTestResults, setJwtTestResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('validate');
  const [showInputForm, setShowInputForm] = useState(false);
  const [serviceAccountJson, setServiceAccountJson] = useState('');
  const [isSubmittingJson, setIsSubmittingJson] = useState(false);
  const [jsonParseError, setJsonParseError] = useState<string | null>(null);
  
  const validateServiceAccount = async () => {
    setIsValidating(true);
    setProgress(0);
    setResults(null);
    
    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + (Math.random() * 10);
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 300);
      
      const { data, error } = await supabase.functions.invoke('validate-service-account', {
        body: { skipTests }
      });
      
      clearInterval(progressInterval);
      setProgress(100);
      
      if (error) {
        console.error("Error validating service account:", error);
        toast({
          title: "Validation Error",
          description: "There was an error communicating with the validation service",
          variant: "destructive"
        });
        
        setResults({
          success: false,
          message: `Communication error: ${error.message || "Unknown error"}`,
          errors: [error.message || "Unknown error"]
        });
        return;
      }
      
      if (data.success) {
        setResults({
          success: true,
          details: data,
          message: skipTests 
            ? "Service account format validation successful! (API tests were skipped)"
            : "Service account validation successful!",
          fields: data.fields
        });
        toast({
          title: "Validation Successful",
          description: "Your Vertex AI service account is configured correctly.",
          variant: "default"
        });
      } else {
        setResults({
          success: false,
          details: data,
          message: data.message || "Service account validation failed.",
          errors: data.errors || ["Unknown validation error"],
          fields: data.fields
        });
        toast({
          title: "Validation Failed",
          description: data.message || "There were issues with your service account.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error in validation process:", error);
      setResults({
        success: false,
        message: `Exception during validation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      toast({
        title: "Validation Error",
        description: "An unexpected error occurred during validation.",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };
  
  const testJwtCreation = async () => {
    setIsValidating(true);
    setProgress(0);
    setJwtTestResults(null);
    
    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + (Math.random() * 15);
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 200);
      
      const { data, error } = await supabase.functions.invoke('validate-service-account', {
        body: { testMode: 'jwt' }
      });
      
      clearInterval(progressInterval);
      setProgress(100);
      
      if (error) {
        console.error("Error testing JWT creation:", error);
        
        setJwtTestResults({
          success: false,
          message: `Communication error: ${error.message || "Unknown error"}`,
          error: error.message || "Unknown error"
        });
        
        toast({
          title: "JWT Test Failed",
          description: "Could not run the JWT test",
          variant: "destructive"
        });
        return;
      }
      
      setJwtTestResults(data);
      
      toast({
        title: data.success ? "JWT Test Successful" : "JWT Test Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
    } catch (error) {
      console.error("Error in JWT test:", error);
      setJwtTestResults({
        success: false,
        message: `Exception during JWT test: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast({
        title: "JWT Test Error",
        description: "An unexpected error occurred during the JWT test.",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };
  
  const fixSequenceLength = () => {
    if (!serviceAccountJson.trim()) {
      toast({
        title: "No input",
        description: "Please enter a service account JSON first",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const fixedJson = fixSequenceLengthError(serviceAccountJson);
      setServiceAccountJson(fixedJson);
      
      toast({
        title: "Key Fixed",
        description: "Applied special fix for SEQUENCE length errors. Try testing JWT now.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error Fixing Key",
        description: error instanceof Error ? error.message : "Could not fix the key format",
        variant: "destructive"
      });
    }
  };

  const fixPrimitiveError = () => {
    if (!serviceAccountJson.trim()) {
      toast({
        title: "No input",
        description: "Please enter a service account JSON first",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const parsed = JSON.parse(serviceAccountJson);
      
      const fixed = fixPrimitiveKeyFormat(parsed);
      
      setServiceAccountJson(JSON.stringify(fixed, null, 2));
      
      toast({
        title: "Primitive Error Fixed",
        description: "Applied fix for PRIVATE [2] primitive errors. Try testing JWT now.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error Fixing Primitive Issue",
        description: error instanceof Error ? error.message : "Could not fix the key format",
        variant: "destructive"
      });
    }
  };

  const createMinimal = () => {
    if (!serviceAccountJson.trim()) {
      toast({
        title: "No input",
        description: "Please enter a service account JSON first",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const parsed = JSON.parse(serviceAccountJson);
      
      if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
        toast({
          title: "Missing Required Fields",
          description: "Service account is missing project_id, client_email, or private_key",
          variant: "destructive"
        });
        return;
      }
      
      const minimal = createMinimalServiceAccount(
        parsed.project_id,
        parsed.client_email,
        parsed.private_key
      );
      
      setServiceAccountJson(JSON.stringify(minimal, null, 2));
      
      toast({
        title: "Minimal Service Account Created",
        description: "Created a minimal service account with just the essential fields.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error Creating Minimal Account",
        description: error instanceof Error ? error.message : "Could not create minimal service account",
        variant: "destructive"
      });
    }
  };
  
  const submitServiceAccountJson = async () => {
    setJsonParseError(null);
    setIsSubmittingJson(true);
    
    try {
      const processedJson = preprocessServiceAccountJson(serviceAccountJson);
      
      let parsedJson;
      try {
        parsedJson = JSON.parse(processedJson);
        parsedJson = repairSequenceLengthIssue(parsedJson);
        const diagnostics = diagnosticServiceAccountJson(parsedJson);
        console.log("Private key diagnostics:", diagnostics);
      } catch (parseError) {
        setJsonParseError(`Invalid JSON format: ${parseError.message}`);
        toast({
          title: "Invalid JSON",
          description: "Please check your service account JSON format and try again.",
          variant: "destructive"
        });
        setIsSubmittingJson(false);
        return;
      }
      
      const { isValid, missingFields } = validateServiceAccountJson(parsedJson);
      
      if (!isValid) {
        setJsonParseError(`Missing required fields: ${missingFields.join(", ")}`);
        toast({
          title: "Invalid Service Account",
          description: `Missing required fields: ${missingFields.join(", ")}`,
          variant: "destructive" 
        });
        setIsSubmittingJson(false);
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('test-auth-jwt', {
        body: { serviceAccount: parsedJson, testAuth: true }
      });
      
      if (error) {
        console.error("Error submitting service account:", error);
        toast({
          title: "Submission Failed",
          description: `Error: ${error.message}`,
          variant: "destructive"
        });
        return;
      }
      
      if (data && data.success) {
        toast({
          title: "Service Account Valid",
          description: "The service account JSON was successfully validated.",
          variant: "default"
        });
        setShowInputForm(false);
        setServiceAccountJson('');
        
        setTimeout(() => {
          validateServiceAccount();
        }, 1000);
      } else {
        setJsonParseError(data.message || "Unknown error validating service account");
        toast({
          title: "Validation Failed",
          description: data.message || "Unknown error validating service account",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Exception during submission:", error);
      setJsonParseError(`Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Submission Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingJson(false);
    }
  };
  
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Vertex AI Service Account Validator
            </CardTitle>
            <CardDescription>
              Validate your Google Cloud service account for Vertex AI integration
            </CardDescription>
          </div>
          {results && (
            <Badge variant={results.success ? "default" : "destructive"}>
              {results.success ? "Valid" : "Invalid"}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="mb-4">
            <TabsTrigger value="validate" className="flex items-center">
              <Shield className="mr-2 h-4 w-4" />
              Full Validation
            </TabsTrigger>
            <TabsTrigger value="jwt" className="flex items-center">
              <FileKey className="mr-2 h-4 w-4" />
              JWT Test
            </TabsTrigger>
            <TabsTrigger value="input" className="flex items-center">
              <FileKey className="mr-2 h-4 w-4" />
              Input JSON
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="validate" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch id="skip-tests" checked={skipTests} onCheckedChange={setSkipTests} />
              <Label htmlFor="skip-tests">Skip API Tests (Format Validation Only)</Label>
            </div>
            
            {skipTests && (
              <Alert variant="default" className="bg-amber-50 border-amber-200">
                <FileWarning className="h-4 w-4 text-amber-500" />
                <AlertTitle>Format Validation Only</AlertTitle>
                <AlertDescription>
                  API tests will be skipped. This will only validate the format of your service account,
                  not whether it has the correct permissions or if authentication works.
                </AlertDescription>
              </Alert>
            )}
            
            {isValidating && activeTab === 'validate' && (
              <div className="space-y-3 mb-4">
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span>Validating service account configuration...</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
            
            {results && (
              <>
                <Alert 
                  variant={results.success ? "default" : "destructive"}
                  className="mb-4"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{results.success ? "Success" : "Validation Failed"}</AlertTitle>
                  <AlertDescription>{results.message}</AlertDescription>
                </Alert>
                
                {results.fields && (
                  <div className="space-y-2 mt-4">
                    <h4 className="text-sm font-medium">Required Fields:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(results.fields).map(([field, present]) => (
                        <div key={field} className="flex items-center">
                          {present ? (
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                          ) : (
                            <X className="h-4 w-4 text-red-500 mr-2" />
                          )}
                          <span className={present ? "" : "text-red-500"}>{field}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {!results.success && results.errors && results.errors.length > 0 && (
                  <Accordion type="single" collapsible className="mt-4">
                    <AccordionItem value="errors">
                      <AccordionTrigger className="text-sm">
                        View Error Details
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-red-600">
                          {results.errors.map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="jwt" className="space-y-4">
            <Alert className="mb-4">
              <FileKey className="h-4 w-4" />
              <AlertTitle>JWT Token Test</AlertTitle>
              <AlertDescription>
                This test specifically checks if your service account can create valid JWT tokens,
                which is required for Vertex AI authentication.
              </AlertDescription>
            </Alert>
            
            {isValidating && activeTab === 'jwt' && (
              <div className="space-y-3 mb-4">
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span>Testing JWT token creation...</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
            
            {jwtTestResults && (
              <Alert 
                variant={jwtTestResults.success ? "default" : "destructive"}
                className="mb-4"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>
                  {jwtTestResults.success ? "JWT Test Passed" : "JWT Test Failed"}
                </AlertTitle>
                <AlertDescription>
                  {jwtTestResults.message}
                  {jwtTestResults.success && jwtTestResults.tokenLength && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Token length:</span> {jwtTestResults.tokenLength} characters
                    </div>
                  )}
                  {!jwtTestResults.success && jwtTestResults.error && (
                    <div className="mt-2 text-sm text-red-600">
                      Error: {jwtTestResults.error}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="input" className="space-y-4">
            <Alert className="mb-4">
              <FileKey className="h-4 w-4" />
              <AlertTitle>Input Service Account JSON</AlertTitle>
              <AlertDescription>
                Paste your Google Cloud service account JSON here for validation.
                This is an alternative way to validate if you're having format issues.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <Textarea 
                placeholder="Paste your service account JSON here..."
                value={serviceAccountJson}
                onChange={(e) => setServiceAccountJson(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
              
              {jsonParseError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>JSON Error</AlertTitle>
                  <AlertDescription>{jsonParseError}</AlertDescription>
                </Alert>
              )}
              
              <div className="flex gap-2 flex-wrap">
                <Button 
                  onClick={fixSequenceLength} 
                  variant="outline"
                  className="bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-300"
                >
                  Fix SEQUENCE Error
                </Button>

                <Button 
                  onClick={fixPrimitiveError}
                  variant="outline"
                  className="bg-pink-100 text-pink-800 hover:bg-pink-200 border-pink-300"
                >
                  Fix Primitive Error
                </Button>

                <Button 
                  onClick={createMinimal}
                  variant="outline" 
                  className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-indigo-300"
                >
                  Create Minimal
                </Button>
                
                <Button 
                  onClick={submitServiceAccountJson} 
                  disabled={isSubmittingJson || !serviceAccountJson.trim()}
                  className="w-full"
                >
                  {isSubmittingJson ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    'Validate JSON'
                  )}
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground">
                <p>Your JSON should contain these required fields:</p>
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  <li>type (should be "service_account")</li>
                  <li>project_id</li>
                  <li>private_key_id</li>
                  <li>private_key</li>
                  <li>client_email</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="justify-between">
        {activeTab === 'validate' ? (
          <>
            <Button 
              onClick={validateServiceAccount} 
              disabled={isValidating}
              variant={results?.success ? "outline" : "default"}
            >
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating
                </>
              ) : (
                'Validate Service Account'
              )}
            </Button>
            
            {results?.success && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    View Details
                  </>
                )}
              </Button>
            )}
          </>
        ) : activeTab === 'jwt' ? (
          <Button 
            onClick={testJwtCreation} 
            disabled={isValidating}
            variant="default"
          >
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing JWT
              </>
            ) : (
              <>
                <FileKey className="mr-2 h-4 w-4" />
                Test JWT Creation
              </>
            )}
          </Button>
        ) : null}
      </CardFooter>
      
      {showDetails && results?.success && results.details && (
        <div className="px-6 pb-6">
          <div className="bg-muted/50 rounded-lg p-4 text-sm overflow-auto max-h-60">
            <pre>{JSON.stringify(results.details, null, 2)}</pre>
          </div>
        </div>
      )}
    </Card>
  );
}
