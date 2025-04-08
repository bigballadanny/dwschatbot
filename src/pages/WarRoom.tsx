
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
import { AlertCircle, ArrowUpRight, BarChart3, FileText, Upload, Download, FileSpreadsheet, FilePdf, FileImage, Info, CheckCircle2, X, PieChart, RefreshCw } from 'lucide-react';
import { DocumentFile, FinancialMetrics } from '@/types/businessDocument';
import { showSuccess, showError, showWarning } from "@/utils/toastUtils";

// Document categories
const documentCategories = [
  { id: 'financial', label: 'Financials', icon: <FileSpreadsheet className="h-4 w-4" /> },
  { id: 'legal', label: 'Legal Documents', icon: <FilePdf className="h-4 w-4" /> },
  { id: 'market', label: 'Market Analysis', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'business_plan', label: 'Business Plan', icon: <FileText className="h-4 w-4" /> },
  { id: 'presentation', label: 'Presentations', icon: <FileImage className="h-4 w-4" /> },
  { id: 'other', label: 'Other', icon: <FileText className="h-4 w-4" /> }
];

const WarRoom: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [activeDocument, setActiveDocument] = useState<DocumentFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('financial');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any | null>(null);
  const [isDocumentDetailsOpen, setIsDocumentDetailsOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;

    try {
      // Use a type assertion here to handle the type mismatch
      const { data, error } = await supabase
        .from('business_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        showError("Failed to load documents", "There was an error loading your business documents.");
        return;
      }

      if (data) {
        // Use type assertion to ensure the data matches our DocumentFile type
        setDocuments(data as unknown as DocumentFile[]);
      }
    } catch (error: any) {
      console.error('Error fetching documents:', error.message);
      showError("Failed to load documents", "There was an error fetching the documents. Please try again.");
    }
  };

  const handleFileSelect = (files: FileList) => {
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const uploadDocument = async () => {
    if (!user) {
      showWarning("Not authenticated", "You must be logged in to upload documents.");
      return;
    }

    if (!selectedFile) {
      showWarning("No file selected", "Please select a file to upload.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const filePath = `business_documents/${user.id}/${Date.now()}_${selectedFile.name}`;
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev === null) return 10;
          return prev >= 90 ? 95 : prev + 10;
        });
      }, 500);

      // Upload file to storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from('business_files')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      clearInterval(progressInterval);
      
      if (storageError) {
        console.error('Error uploading file:', storageError);
        showError("File upload failed", "There was an error uploading the file. Please try again.");
        setIsUploading(false);
        setUploadProgress(null);
        return;
      }

      setUploadProgress(100);

      // Get file type from extension
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase() || '';
      const fileType = getFileTypeFromExtension(fileExtension);

      // Create document record in database
      const { data: docData, error: docError } = await supabase
        .from('business_documents')
        .insert([
          {
            title: selectedFile.name,
            file_path: filePath,
            file_type: fileType,
            user_id: user.id,
            category: selectedCategory,
            is_analyzed: false
          }
        ])
        .select();

      if (docError) {
        console.error('Error creating document record:', docError);
        showError("Document creation failed", "The file was uploaded but we couldn't create a document record.");
        setIsUploading(false);
        setUploadProgress(null);
        return;
      }

      showSuccess("Document uploaded", "Your document was successfully uploaded.");
      if (docData && docData.length > 0) {
        // Use type assertion to ensure the data matches our DocumentFile type
        setDocuments(prev => [docData[0] as unknown as DocumentFile, ...prev]);
      }
      
      setSelectedFile(null);
      setUploadProgress(null);
      fetchDocuments(); // Refresh the list
    } catch (error: any) {
      console.error('Error during upload:', error);
      showError("File upload failed", "There was an error uploading the file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const getFileTypeFromExtension = (extension: string): string => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const documentExtensions = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
    const spreadsheetExtensions = ['xls', 'xlsx', 'csv'];
    const presentationExtensions = ['ppt', 'pptx'];
    
    if (imageExtensions.includes(extension)) return 'image';
    if (documentExtensions.includes(extension)) return 'document';
    if (spreadsheetExtensions.includes(extension)) return 'spreadsheet';
    if (presentationExtensions.includes(extension)) return 'presentation';
    
    return 'other';
  };

  const analyzeDocument = async (document: DocumentFile) => {
    if (!document) return;
    
    setIsAnalyzing(true);
    setActiveDocument(document);
    
    try {
      // Simulated analysis - would be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockFinancials: FinancialMetrics = {
        revenue: Math.floor(Math.random() * 5000000) + 1000000,
        profit: Math.floor(Math.random() * 1000000) + 100000,
        growth_rate: Math.random() * 0.3 + 0.05,
        margin: Math.random() * 0.4 + 0.1,
        valuation: Math.floor(Math.random() * 25000000) + 5000000,
        cash_flow: Math.floor(Math.random() * 800000) + 200000
      };
      
      // Update document with analysis results
      const { data, error } = await supabase
        .from('business_documents')
        .update({
          is_analyzed: true,
          financial_metrics: mockFinancials,
          analysis_results: {
            summary: "This document contains financial information for the business including revenue projections and profit margins.",
            risk_score: Math.floor(Math.random() * 100),
            opportunity_score: Math.floor(Math.random() * 100),
            key_metrics: {
              debt_to_equity: (Math.random() * 2 + 0.5).toFixed(2),
              quick_ratio: (Math.random() * 3 + 0.8).toFixed(2),
              roi: (Math.random() * 0.4 + 0.1).toFixed(2)
            }
          }
        })
        .eq('id', document.id)
        .select();
      
      if (error) {
        console.error('Error updating document with analysis:', error);
        showError("Analysis failed", "There was an error saving the analysis results.");
        return;
      }
      
      if (data && data[0]) {
        // Use type assertion to ensure the data matches our DocumentFile type
        const updatedDoc = data[0] as unknown as DocumentFile;
        setActiveDocument(updatedDoc);
        setAnalysisResults(updatedDoc.analysis_results);
        setDocuments(prev => 
          prev.map(d => d.id === updatedDoc.id ? updatedDoc : d)
        );
        showSuccess("Analysis complete", "Document has been analyzed successfully.");
      }
    } catch (error: any) {
      console.error('Error analyzing document:', error);
      showError("Analysis failed", "There was an error analyzing the document. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openDocumentDetails = (document: DocumentFile) => {
    setActiveDocument(document);
    setIsDocumentDetailsOpen(true);
    setAnalysisResults(document.analysis_results);
  };
  
  const closeDocumentDetails = () => {
    setIsDocumentDetailsOpen(false);
    setActiveDocument(null);
    setAnalysisResults(null);
  };
  
  const formatCurrency = (value?: number) => {
    if (value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };
  
  const formatPercentage = (value?: number) => {
    if (value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 }).format(value);
  };
  
  const getFileIcon = (fileType?: string) => {
    switch (fileType) {
      case 'spreadsheet': return <FileSpreadsheet className="h-4 w-4 mr-1" />;
      case 'document': return <FileText className="h-4 w-4 mr-1" />;
      case 'presentation': return <FileImage className="h-4 w-4 mr-1" />;
      case 'image': return <FileImage className="h-4 w-4 mr-1" />;
      default: return <FileText className="h-4 w-4 mr-1" />;
    }
  };
  
  const filteredDocuments = filter === 'all' 
    ? documents 
    : documents.filter(doc => doc.category === filter);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">War Room</h1>
            <p className="text-muted-foreground">Analyze and manage your business documents</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Documents</SelectItem>
                {documentCategories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center">
                      {category.icon}
                      <span className="ml-2">{category.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="ghost"
              size="icon"
              onClick={fetchDocuments}
              className="h-9 w-9"
              title="Refresh documents"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="documents">
          <TabsList className="mb-4">
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>
          
          <TabsContent value="documents" className="space-y-4">
            {filteredDocuments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-16 w-16 mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-medium mb-2">No documents found</h3>
                  <p className="text-muted-foreground mb-6">
                    Upload some business documents to get started
                  </p>
                  <Button onClick={() => document.querySelector('[data-value="upload"]')?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Documents
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocuments.map((doc) => (
                  <Card key={doc.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between">
                        <div className="flex items-center">
                          {getFileIcon(doc.file_type)}
                          <CardTitle className="text-lg truncate max-w-[200px]">
                            {doc.title || 'Untitled Document'}
                          </CardTitle>
                        </div>
                        {doc.is_analyzed ? (
                          <Badge variant="outline" className="flex items-center bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Analyzed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="flex items-center">
                            <Info className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      {doc.category && (
                        <Badge variant="secondary" className="mb-2">
                          {documentCategories.find(c => c.id === doc.category)?.label || doc.category}
                        </Badge>
                      )}
                      
                      {doc.financial_metrics && (
                        <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                          <div>
                            <p className="text-muted-foreground">Revenue:</p>
                            <p className="font-medium">{formatCurrency(doc.financial_metrics.revenue)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Profit:</p>
                            <p className="font-medium">{formatCurrency(doc.financial_metrics.profit)}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="pt-0">
                      <div className="flex justify-between w-full">
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => openDocumentDetails(doc)}
                        >
                          Details
                        </Button>
                        
                        {!doc.is_analyzed && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => analyzeDocument(doc)}
                            disabled={isAnalyzing && activeDocument?.id === doc.id}
                          >
                            {isAnalyzing && activeDocument?.id === doc.id ? (
                              <>
                                <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <BarChart3 className="h-3 w-3 mr-2" />
                                Analyze
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Upload Business Document</CardTitle>
                <CardDescription>
                  Upload financial statements, business plans, or other documents for analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Document Category</Label>
                  <RadioGroup value={selectedCategory} onValueChange={setSelectedCategory} className="flex flex-wrap gap-4">
                    {documentCategories.map((category) => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={category.id} id={category.id} />
                        <Label htmlFor={category.id} className="flex items-center">
                          {category.icon}
                          <span className="ml-1">{category.label}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                
                <div className="space-y-2">
                  <Label>File Upload</Label>
                  <Alert variant="default" className="bg-primary/10 border-primary/20 text-primary">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertTitle>Supported file types</AlertTitle>
                    <AlertDescription className="text-xs">
                      PDF, Excel, Word, PowerPoint, and image files are supported for analysis.
                      For best results, upload clean, legible documents.
                    </AlertDescription>
                  </Alert>
                  
                  <FileUploader 
                    onFileSelect={handleFileSelect}
                    isUploading={isUploading}
                    uploadProgress={uploadProgress}
                    multiple={false}
                    showPreview={true}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={uploadDocument} 
                  disabled={isUploading || !selectedFile} 
                  className="w-full"
                >
                  {isUploading ? (
                    <span className="flex items-center">
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Uploading... {uploadProgress}%
                    </span>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Document
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="insights">
            <Card>
              <CardHeader>
                <CardTitle>Business Insights</CardTitle>
                <CardDescription>
                  Key metrics and analysis from your documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documents.filter(doc => doc.is_analyzed).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <PieChart className="h-16 w-16 mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-medium mb-2">No analyzed documents</h3>
                    <p className="text-muted-foreground mb-6 text-center max-w-md">
                      Analyze your business documents to see insights and metrics
                    </p>
                    <Button onClick={() => document.querySelector('[data-value="documents"]')?.click()}>
                      View Documents
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-3">Financial Overview</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {documents.filter(doc => doc.is_analyzed && doc.financial_metrics).slice(0, 3).map((doc) => (
                          <Card key={doc.id} className="bg-muted/50">
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm truncate">{doc.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="py-2">
                              {doc.financial_metrics && (
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Revenue:</span>
                                    <span className="font-medium">{formatCurrency(doc.financial_metrics.revenue)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Profit:</span>
                                    <span className="font-medium">{formatCurrency(doc.financial_metrics.profit)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Margin:</span>
                                    <span className="font-medium">{formatPercentage(doc.financial_metrics.margin)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Growth:</span>
                                    <span className="font-medium">{formatPercentage(doc.financial_metrics.growth_rate)}</span>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                            <CardFooter className="py-3">
                              <Button variant="ghost" size="sm" className="w-full" onClick={() => openDocumentDetails(doc)}>
                                View Details
                                <ArrowUpRight className="ml-1 h-3 w-3" />
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-medium mb-3">Recent Analyses</h3>
                      <div className="space-y-2">
                        {documents.filter(doc => doc.is_analyzed).slice(0, 5).map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 border rounded-md">
                            <div className="flex items-center space-x-2">
                              {getFileIcon(doc.file_type)}
                              <span className="font-medium truncate max-w-[200px]">{doc.title}</span>
                              <Badge variant="outline" className="ml-2">
                                {documentCategories.find(c => c.id === doc.category)?.label || doc.category}
                              </Badge>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => openDocumentDetails(doc)}>
                              View
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {activeDocument && (
        <Dialog open={isDocumentDetailsOpen} onOpenChange={setIsDocumentDetailsOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                {getFileIcon(activeDocument.file_type)}
                <span className="ml-2">{activeDocument.title}</span>
              </DialogTitle>
              <DialogDescription>
                Uploaded on {new Date(activeDocument.created_at).toLocaleDateString()} • 
                {documentCategories.find(c => c.id === activeDocument.category)?.label || activeDocument.category}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {activeDocument.is_analyzed ? (
                <div className="space-y-6">
                  {activeDocument.analysis_results && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">Analysis Summary</h3>
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Document Summary</AlertTitle>
                        <AlertDescription>
                          {activeDocument.analysis_results.summary}
                        </AlertDescription>
                      </Alert>
                      
                      <div className="grid grid-cols-2 gap-x-8 gap-y-4 mt-4">
                        <div>
                          <h4 className="text-sm font-medium mb-1">Risk Score</h4>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-xs text-muted-foreground">Low</span>
                              <span className="text-xs text-muted-foreground">High</span>
                            </div>
                            <Progress value={activeDocument.analysis_results.risk_score} className="h-2" />
                            <div className="text-center text-sm font-medium mt-1">
                              {activeDocument.analysis_results.risk_score}/100
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium mb-1">Opportunity Score</h4>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-xs text-muted-foreground">Low</span>
                              <span className="text-xs text-muted-foreground">High</span>
                            </div>
                            <Progress value={activeDocument.analysis_results.opportunity_score} className="h-2" />
                            <div className="text-center text-sm font-medium mt-1">
                              {activeDocument.analysis_results.opportunity_score}/100
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {activeDocument.financial_metrics && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">Financial Metrics</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">Revenue</p>
                            <p className="text-xl font-bold">{formatCurrency(activeDocument.financial_metrics.revenue)}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">Profit</p>
                            <p className="text-xl font-bold">{formatCurrency(activeDocument.financial_metrics.profit)}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">Growth Rate</p>
                            <p className="text-xl font-bold">{formatPercentage(activeDocument.financial_metrics.growth_rate)}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">Margin</p>
                            <p className="text-xl font-bold">{formatPercentage(activeDocument.financial_metrics.margin)}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">Valuation</p>
                            <p className="text-xl font-bold">{formatCurrency(activeDocument.financial_metrics.valuation)}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">Cash Flow</p>
                            <p className="text-xl font-bold">{formatCurrency(activeDocument.financial_metrics.cash_flow)}</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
                  
                  {activeDocument.analysis_results?.key_metrics && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">Key Metrics</h3>
                      <div className="grid grid-cols-3 gap-4">
                        {Object.entries(activeDocument.analysis_results.key_metrics).map(([key, value]) => (
                          <div key={key} className="p-3 border rounded-md bg-muted/50">
                            <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                            <p className="text-lg font-medium">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center space-y-4">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium">Document not yet analyzed</h3>
                    <p className="text-muted-foreground mt-1">Run analysis to see insights about this document</p>
                  </div>
                  <Button onClick={() => {
                    analyzeDocument(activeDocument);
                    setIsDocumentDetailsOpen(false);
                  }}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analyze Document
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default WarRoom;
