
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { checkForTranscriptIssues, fixTranscriptIssues, fixTranscriptSourceTypes } from '@/utils/transcriptDiagnostics';

interface TranscriptDiagnosticsProps {
  onComplete?: () => void;
}

const TranscriptDiagnostics: React.FC<TranscriptDiagnosticsProps> = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [diagnosisResults, setDiagnosisResults] = useState<any>(null);
  const [fixResults, setFixResults] = useState<any>(null);
  const [sourceTypeResults, setSourceTypeResults] = useState<any>(null);
  const { toast } = useToast();

  const runDiagnosis = async () => {
    setLoading(true);
    setDiagnosisResults(null);
    setFixResults(null);
    setSourceTypeResults(null);
    
    try {
      const results = await checkForTranscriptIssues();
      setDiagnosisResults(results);
      
      toast({
        title: 'Diagnosis complete',
        description: `Found ${results.stats.total} transcripts, ${results.stats.recentlyUploaded} uploaded recently.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error running diagnosis',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fixIssues = async () => {
    if (!diagnosisResults || !diagnosisResults.recentTranscripts) {
      return;
    }
    
    setLoading(true);
    
    try {
      const transcriptIds = diagnosisResults.recentTranscripts.map((t: any) => t.id);
      const results = await fixTranscriptIssues(transcriptIds);
      setFixResults(results);
      
      toast({
        title: 'Fix operation complete',
        description: `Fixed ${results.success} transcript(s). ${results.errors.length} error(s).`,
      });
    } catch (error: any) {
      toast({
        title: 'Error fixing issues',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fixSourceTypes = async () => {
    setLoading(true);
    
    try {
      const results = await fixTranscriptSourceTypes();
      setSourceTypeResults(results);
      
      toast({
        title: 'Source type fix complete',
        description: `Fixed ${results.fixedCount} transcript(s). ${results.errors.length} error(s).`,
      });
      
      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      toast({
        title: 'Error fixing source types',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transcript Diagnostics</CardTitle>
        <CardDescription>
          Troubleshoot and fix issues with transcript uploads
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {diagnosisResults && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-2xl font-bold">{diagnosisResults.stats.total}</div>
                <div className="text-sm text-muted-foreground">Total Transcripts</div>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-2xl font-bold">{diagnosisResults.stats.recentlyUploaded}</div>
                <div className="text-sm text-muted-foreground">Recently Uploaded</div>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-2xl font-bold">{diagnosisResults.stats.businessSummitTranscripts}</div>
                <div className="text-sm text-muted-foreground">Summit Transcripts</div>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-2xl font-bold">{diagnosisResults.stats.emptyContent}</div>
                <div className="text-sm text-muted-foreground">Empty Content</div>
              </div>
            </div>

            {diagnosisResults.recentTranscripts.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Recent Transcripts</h3>
                <div className="space-y-2">
                  {diagnosisResults.recentTranscripts.map((transcript: any) => (
                    <div key={transcript.id} className="border p-3 rounded-md">
                      <div className="flex justify-between">
                        <div className="font-medium">{transcript.title}</div>
                        <Badge variant={transcript.source === 'business_acquisitions_summit' ? 'default' : 'outline'}>
                          {transcript.source}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Uploaded: {new Date(transcript.created_at).toLocaleString()}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge variant={transcript.content && transcript.content.length > 0 ? 'success' : 'destructive'}>
                          {transcript.content && transcript.content.length > 0 ? 'Has Content' : 'Empty Content'}
                        </Badge>
                        <Badge variant={transcript.file_path ? 'success' : 'destructive'}>
                          {transcript.file_path ? 'Has File' : 'No File'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(diagnosisResults.stats.emptyContent > 0 || diagnosisResults.stats.recentlyUploaded > 0) && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle>Attention needed</AlertTitle>
                <AlertDescription>
                  {diagnosisResults.stats.emptyContent > 0 
                    ? `Found ${diagnosisResults.stats.emptyContent} transcript(s) with empty content. ` 
                    : ''}
                  {diagnosisResults.recentTranscripts.length > 0 
                    ? `Found ${diagnosisResults.recentTranscripts.length} recently uploaded transcript(s).` 
                    : ''}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {fixResults && (
          <Alert className={fixResults.errors.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}>
            {fixResults.errors.length > 0 
              ? <AlertCircle className="h-4 w-4 text-amber-600" />
              : <CheckCircle2 className="h-4 w-4 text-green-600" />}
            <AlertTitle>Fix results</AlertTitle>
            <AlertDescription>
              Successfully fixed {fixResults.success} transcript(s).
              {fixResults.errors.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium">Errors ({fixResults.errors.length}):</p>
                  <ul className="list-disc pl-5 text-sm">
                    {fixResults.errors.slice(0, 5).map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                    {fixResults.errors.length > 5 && <li>...and {fixResults.errors.length - 5} more</li>}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {sourceTypeResults && (
          <Alert className={sourceTypeResults.errors.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}>
            {sourceTypeResults.errors.length > 0 
              ? <AlertCircle className="h-4 w-4 text-amber-600" />
              : <CheckCircle2 className="h-4 w-4 text-green-600" />}
            <AlertTitle>Source type fix results</AlertTitle>
            <AlertDescription>
              Successfully fixed {sourceTypeResults.fixedCount} transcript source types.
              {sourceTypeResults.errors.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium">Errors ({sourceTypeResults.errors.length}):</p>
                  <ul className="list-disc pl-5 text-sm">
                    {sourceTypeResults.errors.slice(0, 5).map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                    {sourceTypeResults.errors.length > 5 && <li>...and {sourceTypeResults.errors.length - 5} more</li>}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button onClick={runDiagnosis} disabled={loading}>
            {loading && diagnosisResults === null ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running Diagnosis...</>
            ) : (
              'Run Diagnosis'
            )}
          </Button>
          
          <Button 
            onClick={fixIssues} 
            disabled={loading || !diagnosisResults || diagnosisResults.recentTranscripts.length === 0}
            variant="outline"
          >
            {loading && fixResults === null && diagnosisResults !== null ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fixing Issues...</>
            ) : (
              'Fix Content Issues'
            )}
          </Button>
          
          <Button 
            onClick={fixSourceTypes} 
            disabled={loading}
            variant="outline"
          >
            {loading && sourceTypeResults === null ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fixing Source Types...</>
            ) : (
              'Fix Source Types'
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default TranscriptDiagnostics;
