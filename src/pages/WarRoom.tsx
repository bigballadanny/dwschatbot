import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Header from '@/components/Header';
import FileUploader from '@/components/FileUploader';
import { AlertCircle, ArrowUpRight, BarChart3, FileText, Upload, Download, FileSpreadsheet, FileImage, Info, CheckCircle2, X, PieChart, RefreshCw } from 'lucide-react';
import { DocumentFile, FinancialMetrics } from '@/types/businessDocument';
import { showSuccess, showError, showWarning } from "@/utils/toastUtils";

const documentCategories = [
  { id: 'financial', label: 'Financials', icon: <FileSpreadsheet className="h-4 w-4" /> },
  { id: 'legal', label: 'Legal Documents', icon: <FileText className="h-4 w-4" /> },
  { id: 'market', label: 'Market Analysis', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'business_plan', label: 'Business Plan', icon: <FileText className="h-4 w-4" /> },
  { id: 'presentation', label: 'Presentations', icon: <FileImage className="h-4 w-4" /> },
  { id: 'other', label: 'Other', icon: <FileText className="h-4 w-4" /> }
];

const WarRoom: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('financial');
  const [uploading, setUploading] = useState<boolean>(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [userFacingMessage, setUserFacingMessage] = useState<string | null>(null);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentFile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchDocuments();
  }, [user, selectedCategory]);

  const fetchDocuments = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', selectedCategory)
        .order('created_at', { ascending: false });

      if (error) {
        showError(`Error fetching documents: ${error.message}`);
      } else {
        setDocuments(data || []);
      }
    } catch (error: any) {
      showError(`Unexpected error fetching documents: ${error.message}`);
    }
  };

  const handleFileUploadComplete = () => {
    fetchDocuments();
    setUploading(false);
  };

  const handleFileUploading = (isUploading: boolean) => {
    setUploading(isUploading);
  };

  const handleAnalyzeDocument = async (document: DocumentFile) => {
    setSelectedDocument(document);
    setIsDialogOpen(true);
  };

  const handleAnalysisConfirmed = async () => {
    if (!selectedDocument) return;

    setIsDialogOpen(false);
    setAnalysisLoading(true);
    setUserFacingMessage("Analyzing document...");

    try {
      const { data, error } = await supabase.functions.invoke('analyze-document', {
        body: {
          document_id: selectedDocument.id
        }
      });

      if (error) {
        showError(`Error during document analysis: ${error.message}`);
        setUserFacingMessage(`Analysis Failed: ${error.message}`);
      } else {
        showSuccess('Document analysis completed successfully!');
        setUserFacingMessage("Analysis Complete!");
        setIsAnalysisComplete(true);

        // Optimistically update the document in the local state
        setDocuments(prevDocuments =>
          prevDocuments.map(doc =>
            doc.id === selectedDocument.id ? { ...doc, is_analyzed: true, analysis_results: data } : doc
          )
        );
      }
    } catch (error: any) {
      showError(`Unexpected error during document analysis: ${error.message}`);
      setUserFacingMessage(`Analysis Failed: ${error.message}`);
    } finally {
      setAnalysisLoading(false);
      setTimeout(() => setUserFacingMessage(null), 5000);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  return (
    <div className="container mx-auto p-4">
      <Header />

      <Card>
        <CardHeader>
          <CardTitle>War Room</CardTitle>
          <CardDescription>
            Centralized hub for document management, analysis, and strategic insights.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={selectedCategory} className="space-y-4">
            <TabsList>
              {documentCategories.map((category) => (
                <TabsTrigger key={category.id} value={category.id} onClick={() => handleCategoryChange(category.id)}>
                  {category.icon} {category.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {documentCategories.map((category) => (
              <TabsContent key={category.id} value={category.id}>
                <div className="grid gap-4">
                  <div className="flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0">
                    <h3 className="text-lg font-semibold">{category.label} Documents</h3>
                    <FileUploader
                      category={category.id}
                      onUploadComplete={handleFileUploadComplete}
                      onIsUploading={handleFileUploading}
                    />
                  </div>

                  {uploading && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Uploading...</AlertTitle>
                      <AlertDescription>Please wait while your file is being uploaded.</AlertDescription>
                    </Alert>
                  )}

                  {userFacingMessage && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Analysis Status</AlertTitle>
                      <AlertDescription>{userFacingMessage}</AlertDescription>
                    </Alert>
                  )}

                  <ScrollArea className="rounded-md border h-[400px] w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                      {documents.map((document) => (
                        <Card key={document.id} className="bg-muted hover:bg-accent transition-colors">
                          <CardHeader className="space-y-1">
                            <CardTitle className="text-sm font-medium">{document.title}</CardTitle>
                            <CardDescription className="text-xs">Uploaded: {new Date(document.created_at).toLocaleDateString()}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center space-x-2">
                              {document.is_analyzed ? (
                                <Badge variant="outline">
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Analyzed
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <X className="h-4 w-4 mr-1" />
                                  Pending Analysis
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                          <CardFooter className="justify-between">
                            <Button variant="ghost" size="sm" asChild>
                              <a href={document.file_path} target="_blank" rel="noopener noreferrer">
                                View File <ArrowUpRight className="h-4 w-4 ml-2" />
                              </a>
                            </Button>
                            {!document.is_analyzed && (
                              <Button variant="outline" size="sm" onClick={() => handleAnalyzeDocument(document)} disabled={analysisLoading}>
                                Analyze <PieChart className="h-4 w-4 ml-2" />
                              </Button>
                            )}
                          </CardFooter>
                        </Card>
                      ))}
                      {documents.length === 0 && (
                        <div className="text-center text-muted-foreground col-span-full">
                          No documents found in this category. Upload one to get started!
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
        <CardFooter>
          <Button onClick={() => fetchDocuments()} disabled={uploading || analysisLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Analysis</DialogTitle>
            <DialogDescription>
              Are you sure you want to analyze this document? This process might take a few minutes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Document:
              </Label>
              <Input type="text" id="name" value={selectedDocument?.title || 'N/A'} className="col-span-3" disabled />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleAnalysisConfirmed} disabled={analysisLoading}>
              {analysisLoading ? 'Analyzing...' : 'Analyze'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WarRoom;
