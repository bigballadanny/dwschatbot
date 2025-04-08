
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CheckCircle2, Tag, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { checkForTranscriptIssues, fixTranscriptIssues, fixTranscriptSourceTypes, updateTranscriptSourceType } from '@/utils/transcriptDiagnostics';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';

interface TranscriptDiagnosticsProps {
  onComplete?: () => void;
}

const TranscriptDiagnostics: React.FC<TranscriptDiagnosticsProps> = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [diagnosisResults, setDiagnosisResults] = useState<any>(null);
  const [fixResults, setFixResults] = useState<any>(null);
  const [sourceTypeResults, setSourceTypeResults] = useState<any>(null);
  const [selectedTranscript, setSelectedTranscript] = useState<any>(null);
  const [showSourceTypeDialog, setShowSourceTypeDialog] = useState(false);
  const [newSourceType, setNewSourceType] = useState<string>('business_acquisitions_summit');
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
        description: `Found ${results.stats.total} transcripts, ${results.stats.recentlyUploaded} uploaded recently, ${results.stats.potentialSummitTranscripts} potential summit transcripts.`,
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

  const fixSummitSourceTypes = async () => {
    if (!diagnosisResults || !diagnosisResults.potentialSummitTranscripts) {
      return;
    }
    
    setLoading(true);
    
    try {
      const transcriptIds = diagnosisResults.potentialSummitTranscripts.map((t: any) => t.id);
      const results = await fixTranscriptSourceTypes(transcriptIds);
      setSourceTypeResults(results);
      
      toast({
        title: 'Summit transcript fix complete',
        description: `Updated ${results.fixedCount} transcript(s) to Business Acquisitions Summit type. ${results.errors.length} error(s).`,
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

  const openSourceTypeDialog = (transcript: any) => {
    setSelectedTranscript(transcript);
    setNewSourceType(transcript.source || 'protege_call');
    setShowSourceTypeDialog(true);
  };

  const updateSourceType = async () => {
    if (!selectedTranscript) return;
    
    setLoading(true);
    
    try {
      const result = await updateTranscriptSourceType(selectedTranscript.id, newSourceType);
      
      if (result.success) {
        // Update the transcript in the current state
        if (diagnosisResults && diagnosisResults.recentTranscripts) {
          const updatedTranscripts = diagnosisResults.recentTranscripts.map((t: any) => 
            t.id === selectedTranscript.id ? { ...t, source: newSourceType } : t
          );
          setDiagnosisResults({
            ...diagnosisResults,
            recentTranscripts: updatedTranscripts
          });
        }
        
        toast({
          title: 'Source type updated',
          description: `Successfully updated transcript source type to ${newSourceType}.`,
        });
        
        if (onComplete) {
          onComplete();
        }
      } else {
        toast({
          title: 'Error updating source type',
          description: result.error || 'An unknown error occurred',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error updating source type',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setShowSourceTypeDialog(false);
    }
  };

  const getSourceColor = (source: string | undefined): string => {
    switch(source) {
      case 'protege_call': return 'bg-blue-100 text-blue-800';
      case 'foundations_call': return 'bg-purple-100 text-purple-800';
      case 'business_acquisitions_summit': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
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
                <div className="text-2xl font-bold">{diagnosisResults.stats.potentialSummitTranscripts}</div>
                <div className="text-sm text-muted-foreground">Potential Summit Transcripts</div>
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
                        <div className="flex items-center gap-2">
                          <Badge variant={transcript.source === 'business_acquisitions_summit' ? 'default' : 'outline'} className={`flex items-center ${getSourceColor(transcript.source)}`}>
                            <Tag className="h-3 w-3 mr-1" />
                            {transcript.source === 'business_acquisitions_summit'
                              ? '2024 Business Acquisitions Summit'
                              : transcript.source?.replace('_', ' ')}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2"
                            onClick={() => openSourceTypeDialog(transcript)}
                          >
                            Change
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Uploaded: {new Date(transcript.created_at).toLocaleString()}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge variant={transcript.content && transcript.content.length > 0 ? 'default' : 'destructive'}>
                          {transcript.content && transcript.content.length > 0 ? 'Has Content' : 'Empty Content'}
                        </Badge>
                        <Badge variant={transcript.file_path ? 'default' : 'destructive'}>
                          {transcript.file_path ? 'Has File' : 'No File'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {diagnosisResults.potentialSummitTranscripts && diagnosisResults.potentialSummitTranscripts.length > 0 && (
              <div>
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle>Potential Summit Transcripts</AlertTitle>
                  <AlertDescription>
                    Found {diagnosisResults.potentialSummitTranscripts.length} transcript(s) uploaded on the 27th that should likely be marked as Business Acquisitions Summit.
                    <div className="mt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={fixSummitSourceTypes}
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Fix All Summit Transcripts
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
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
              'Fix All Source Types'
            )}
          </Button>
        </div>
      </CardFooter>

      <Dialog open={showSourceTypeDialog} onOpenChange={setShowSourceTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Transcript Source Type</DialogTitle>
            <DialogDescription>
              Update the source type for "{selectedTranscript?.title}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Current Source</h4>
              <Badge className={getSourceColor(selectedTranscript?.source)}>
                {selectedTranscript?.source === 'business_acquisitions_summit'
                  ? '2024 Business Acquisitions Summit'
                  : selectedTranscript?.source?.replace('_', ' ')}
              </Badge>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Select New Source Type</h4>
              <Select 
                value={newSourceType} 
                onValueChange={setNewSourceType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="protege_call">Protege Call</SelectItem>
                  <SelectItem value="foundations_call">Foundations Call</SelectItem>
                  <SelectItem value="business_acquisitions_summit">2024 Business Acquisitions Summit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={updateSourceType} 
              disabled={loading || newSourceType === selectedTranscript?.source}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update Source Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TranscriptDiagnostics;
