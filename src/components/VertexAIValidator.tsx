
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function VertexAIValidator() {
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const validateServiceAccount = async () => {
    setIsValidating(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('validate-service-account');
      
      if (error) {
        throw new Error(error.message);
      }
      
      setValidationResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setValidationResult(null);
    } finally {
      setIsValidating(false);
    }
  };
  
  return (
    <Card className="max-w-2xl w-full">
      <CardHeader>
        <CardTitle>Vertex AI Service Account Validator</CardTitle>
        <CardDescription>
          Validate your Vertex AI service account JSON configuration
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {validationResult && (
          <div className="space-y-4">
            <Alert variant={validationResult.valid ? "default" : "destructive"}>
              {validationResult.valid ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>{validationResult.valid ? 'Valid Configuration' : 'Invalid Configuration'}</AlertTitle>
              <AlertDescription>
                {validationResult.valid ? validationResult.message : validationResult.error}
              </AlertDescription>
            </Alert>
            
            {validationResult.valid && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">Project ID:</div>
                <div>{validationResult.project_id}</div>
                <div className="font-medium">Email Domain:</div>
                <div>{validationResult.client_email_domain}</div>
              </div>
            )}
            
            {!validationResult.valid && validationResult.suggestion && (
              <Alert>
                <AlertTitle>Suggestion</AlertTitle>
                <AlertDescription>{validationResult.suggestion}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={validateServiceAccount} 
          disabled={isValidating}
          className="w-full"
        >
          {isValidating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Validating...
            </>
          ) : 'Validate Service Account'}
        </Button>
      </CardFooter>
    </Card>
  );
}
