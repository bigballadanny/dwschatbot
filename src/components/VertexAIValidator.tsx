
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Check, X, AlertCircle, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  
  const validateServiceAccount = async () => {
    setIsValidating(true);
    setProgress(0);
    setResults(null);
    
    try {
      // Progress simulation - authentication can take time
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + (Math.random() * 10);
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 300);
      
      // Call the validation edge function
      const { data, error } = await supabase.functions.invoke('validate-service-account');
      
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
      
      // The function now always returns 200 status, so we check success in the data
      if (data.success) {
        setResults({
          success: true,
          details: data,
          message: "Service account validation successful!",
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
        {isValidating && (
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
      </CardContent>
      
      <CardFooter className="justify-between">
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
