import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { ChartPie, FileText, Upload, PieChart, BarChart4, File, FilePieChart, Loader2, Info, ArrowRight, Eye, Download, Trash2, Plus, Sparkles, DollarSign, TrendingUp, BarChart2, Scale } from 'lucide-react';
import { showSuccess, showError, showWarning } from "@/utils/toastUtils";
import FileUploader from "@/components/FileUploader";

interface DocumentFile {
  id: string;
  title: string;
  file_path: string;
  file_type: string;
  category: string;
  created_at: string;
  analysis_score?: number;
  analysis_summary?: string;
  metrics?: {
    revenue?: number;
    profit?: number;
    ebitda?: number;
    multiple?: number;
    growth?: number;
    risk_score?: number;
  };
  is_analyzed?: boolean;
  user_id: string;
}

interface BusinessMetric {
  name: string;
  value: number | string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  color?: string;
}

const WarRoomPage: React.FC = () => {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocumentFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [category, setCategory] = useState<string>('financial');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  useEffect(() => {
    if (selectedDocumentId) {
      const doc = files.find(file => file.id === selectedDocumentId);
      if (doc) {
        setSelectedDocument(doc);
      }
    } else {
      setSelectedDocument(null);
    }
  }, [selectedDocumentId, files]);

  const fetchDocuments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('business_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        showError("Failed to load documents", "There was an error fetching the documents. Please try again.");
        return;
      }

      if (data) {
        setFiles(data as DocumentFile[]);
      }
    } catch (error: any) {
      console.error('Error fetching documents:', error.message);
      showError("Failed to load documents", "There was an error fetching the documents. Please try again.");
    }
  };

  const handleFileSelect = (files: FileList) => {
    const filesArray = Array.from(files);
    setSelectedFiles(filesArray);
  };

  const handleUploadFiles = async () => {
    if (!user) {
      showWarning("Not authenticated", "You must be logged in to upload files.");
      return;
    }

    if (selectedFiles.length === 0) {
      showWarning("No files selected", "Please select files to upload.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      let successCount = 0;
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const filePath = `business_documents/${user.id}/${Date.now()}_${file.name}`;
        
        setUploadProgress(Math.round((i / selectedFiles.length) * 100));
        
        const { data, error } = await supabase.storage
          .from('business_documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          continue;
        }

        const publicURL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/business_documents/${filePath}`;
        
        const fileType = determineFileType(file.name);
        
        const { error: documentError } = await supabase
          .from('business_documents')
          .insert({
            title: file.name,
            file_path: filePath,
            file_type: fileType,
            category: category,
            user_id: user.id,
            is_analyzed: false
          });

        if (documentError) {
          console.error(`Error creating document record for ${file.name}:`, documentError);
          continue;
        }

        successCount++;
      }
      
      if (successCount > 0) {
        showSuccess("Files uploaded", `Successfully uploaded ${successCount} out of ${selectedFiles.length} files.`);
        setSelectedFiles([]);
        fetchDocuments();
      } else {
        showError("Upload failed", "Failed to upload any files. Please try again.");
      }
    } catch (error: any) {
      console.error('Error during upload:', error);
      showError("File upload failed", "There was an error uploading the files. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const determineFileType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'pdf';
      case 'docx':
      case 'doc': return 'document';
      case 'xlsx': 
      case 'xls':
      case 'csv': return 'spreadsheet';
      case 'jpg':
      case 'jpeg':
      case 'png': return 'image';
      case 'pptx':
      case 'ppt': return 'presentation';
      default: return 'other';
    }
  };

  const getDocumentIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf': return <FileText className="h-6 w-6" />;
      case 'document': return <File className="h-6 w-6" />;
      case 'spreadsheet': return <BarChart4 className="h-6 w-6" />;
      case 'image': return <Eye className="h-6 w-6" />;
      case 'presentation': return <ChartPie className="h-6 w-6" />;
      default: return <File className="h-6 w-6" />;
    }
  };

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'financial': return 'Financial Document';
      case 'cim': return 'Confidential Information Memorandum';
      case 'legal': return 'Legal Document';
      case 'market': return 'Market Analysis';
      case 'valuation': return 'Valuation Report';
      default: return 'Other Document';
    }
  };

  const simulateAnalysis = async (documentId: string) => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    const document = files.find(file => file.id === documentId);
    if (!document) {
      showError("Analysis Error", "Document not found.");
      setIsAnalyzing(false);
      return;
    }

    const totalSteps = 5;
    const progressInterval = 100 / totalSteps;
    
    for (let step = 1; step <= totalSteps; step++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAnalysisProgress(step * progressInterval);
    }

    let analysisSummary = '';
    let analysisScore = Math.round(Math.random() * 40) + 60;
    let metrics = {};
    
    if (document.category === 'financial') {
      analysisSummary = "Financial analysis shows strong cash flow with EBITDA margins above industry average. The business demonstrates consistent revenue growth over the past 3 years. Key risk factors include customer concentration and market competition.";
      metrics = {
        revenue: Math.round(Math.random() * 500000) + 500000,
        profit: Math.round(Math.random() * 100000) + 50000,
        ebitda: Math.round(Math.random() * 150000) + 100000,
        multiple: Math.round(Math.random() * 20) / 10 + 3,
        growth: Math.round(Math.random() * 20) + 5,
        risk_score: Math.round(Math.random() * 40) + 20
      };
    } else if (document.category === 'cim') {
      analysisSummary = "The Confidential Information Memorandum presents a business with strong market positioning and proprietary technology. Financial projections appear optimistic but achievable based on historical performance. The business model is scalable with good potential for future growth.";
      metrics = {
        revenue: Math.round(Math.random() * 1000000) + 1000000,
        profit: Math.round(Math.random() * 200000) + 150000,
        multiple: Math.round(Math.random() * 30) / 10 + 4,
        growth: Math.round(Math.random() * 30) + 10,
        risk_score: Math.round(Math.random() * 30) + 30
      };
    } else {
      analysisSummary = "Document analysis complete. This document contains valuable information for acquisition assessment. Key points have been extracted and analyzed against industry benchmarks.";
      metrics = {
        risk_score: Math.round(Math.random() * 50) + 25
      };
    }

    try {
      const { error } = await supabase
        .from('business_documents')
        .update({
          is_analyzed: true,
          analysis_score: analysisScore,
          analysis_summary: analysisSummary,
          metrics: metrics
        })
        .eq('id', documentId);

      if (error) {
        console.error('Error updating document with analysis:', error);
        showError("Analysis Error", "Could not save analysis results.");
      } else {
        showSuccess("Analysis Complete", "Document has been successfully analyzed.");
        fetchDocuments();
      }
    } catch (error) {
      console.error('Error updating document with analysis:', error);
      showError("Analysis Error", "Could not save analysis results.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderBusinessMetrics = (metrics?: { [key: string]: any }) => {
    if (!metrics) return null;
    
    const formattedMetrics: BusinessMetric[] = [];
    
    if (metrics.revenue) {
      formattedMetrics.push({
        name: 'Revenue',
        value: `$${(metrics.revenue as number).toLocaleString()}`,
        trend: 'up',
        icon: <DollarSign className="h-5 w-5 text-green-500" />,
        color: 'bg-green-100 text-green-800'
      });
    }
    
    if (metrics.profit) {
      formattedMetrics.push({
        name: 'Profit',
        value: `$${(metrics.profit as number).toLocaleString()}`,
        trend: 'up',
        icon: <TrendingUp className="h-5 w-5 text-blue-500" />,
        color: 'bg-blue-100 text-blue-800'
      });
    }
    
    if (metrics.ebitda) {
      formattedMetrics.push({
        name: 'EBITDA',
        value: `$${(metrics.ebitda as number).toLocaleString()}`,
        icon: <BarChart2 className="h-5 w-5 text-indigo-500" />,
        color: 'bg-indigo-100 text-indigo-800'
      });
    }
    
    if (metrics.multiple) {
      formattedMetrics.push({
        name: 'Multiple',
        value: `${metrics.multiple}x`,
        icon: <FilePieChart className="h-5 w-5 text-violet-500" />,
        color: 'bg-violet-100 text-violet-800'
      });
    }
    
    if (metrics.growth) {
      formattedMetrics.push({
        name: 'Growth',
        value: `${metrics.growth}%`,
        trend: metrics.growth > 10 ? 'up' : 'neutral',
        icon: <TrendingUp className="h-5 w-5 text-emerald-500" />,
        color: 'bg-emerald-100 text-emerald-800'
      });
    }
    
    if (metrics.risk_score) {
      const riskScore = metrics.risk_score as number;
      formattedMetrics.push({
        name: 'Risk',
        value: `${riskScore}/100`,
        trend: riskScore > 50 ? 'down' : 'up',
        icon: <Scale className="h-5 w-5 text-amber-500" />,
        color: 'bg-amber-100 text-amber-800'
      });
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {formattedMetrics.map((metric, index) => (
          <div key={index} className={`p-3 rounded-lg flex items-center justify-between ${metric.color || 'bg-gray-100'}`}>
            <div className="flex items-center">
              {metric.icon}
              <span className="ml-2 font-medium">{metric.name}</span>
            </div>
            <span className="font-bold">{metric.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const document = files.find(file => file.id === id);
      if (!document) {
        showError("Delete Error", "Document not found.");
        return;
      }

      if (document.file_path) {
        const { error: storageError } = await supabase.storage
          .from('business_documents')
          .remove([document.file_path]);
          
        if (storageError) {
          console.error('Error deleting file from storage:', storageError);
        }
      }

      const { error: dbError } = await supabase
        .from('business_documents')
        .delete()
        .eq('id', id);

      if (dbError) {
        console.error('Error deleting document from database:', dbError);
        showError("Delete Error", "Could not delete document record.");
        return;
      }

      showSuccess("Document Deleted", "Document has been successfully removed.");
      if (selectedDocumentId === id) {
        setSelectedDocumentId(null);
      }
      fetchDocuments();

    } catch (error: any) {
      console.error('Error deleting document:', error.message);
      showError("Delete Error", "There was an error deleting the document.");
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Header />
      <div className="flex justify-between items-center mb-6 mt-4">
        <div>
          <h1 className="text-2xl font-bold">War Room</h1>
          <p className="text-muted-foreground">Analyze and assess business documents for acquisition decisions</p>
        </div>
        <Button onClick={() => setSelectedDocumentId(null)} variant="default" className="gap-2">
          <Plus className="h-4 w-4" />
          Upload Documents
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${selectedDocumentId ? 'hidden lg:block' : ''} lg:col-span-1`}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Business Documents</CardTitle>
              <CardDescription>Upload and analyze business documents</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDocumentId === null ? (
                <div className="space-y-4">
                  <Alert variant="default" className="bg-primary/10 border-primary/20 text-primary">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertTitle>Upload Business Documents</AlertTitle>
                    <AlertDescription className="text-xs">
                      Upload financial statements, CIMs, legal documents, or other business files for AI-powered analysis.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Document Category</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select document category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="financial">Financial Document</SelectItem>
                        <SelectItem value="cim">CIM / Business Overview</SelectItem>
                        <SelectItem value="legal">Legal Document</SelectItem>
                        <SelectItem value="market">Market Analysis</SelectItem>
                        <SelectItem value="valuation">Valuation Report</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <FileUploader 
                    onFileSelect={handleFileSelect}
                    isUploading={isUploading}
                    uploadProgress={uploadProgress}
                    acceptedFileTypes=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.ppt,.pptx"
                    multiple={true}
                    showPreview={true}
                  />
                  
                  {selectedFiles.length > 0 && (
                    <Button 
                      onClick={handleUploadFiles} 
                      disabled={isUploading} 
                      className="w-full"
                    >
                      {isUploading ? (
                        <span className="flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading... {uploadProgress}%
                        </span>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload {selectedFiles.length} {selectedFiles.length === 1 ? 'File' : 'Files'}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-3">
                    {files.map(file => (
                      <div 
                        key={file.id} 
                        className={`p-3 border rounded-lg cursor-pointer hover:border-primary transition-colors ${file.id === selectedDocumentId ? 'border-primary bg-primary/5' : ''}`}
                        onClick={() => setSelectedDocumentId(file.id)}
                      >
                        <div className="flex items-center gap-3">
                          {getDocumentIcon(file.file_type)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{file.title}</p>
                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                              <Badge variant="outline" className="mr-2 text-xs">
                                {getCategoryLabel(file.category)}
                              </Badge>
                              {file.is_analyzed && (
                                <Badge variant="secondary" className="text-xs">
                                  Analyzed
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {files.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No documents uploaded yet</p>
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => setSelectedDocumentId(null)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Upload Your First Document
                        </Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {selectedDocumentId !== null && selectedDocument && (
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{selectedDocument.title}</CardTitle>
                  <CardDescription>
                    {getCategoryLabel(selectedDocument.category)} • Uploaded on {new Date(selectedDocument.created_at).toLocaleDateString()}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/business_documents/${selectedDocument.file_path}`} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDeleteDocument(selectedDocument.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview">
                  <TabsList className="grid grid-cols-3 mb-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="analysis">Analysis</TabsTrigger>
                    <TabsTrigger value="metrics">Key Metrics</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview">
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <div className="p-3 bg-primary/10 rounded-full mr-3">
                          {getDocumentIcon(selectedDocument.file_type)}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{selectedDocument.title}</h3>
                          <p className="text-muted-foreground">
                            Document Type: {selectedDocument.file_type.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      
                      {selectedDocument.is_analyzed ? (
                        <>
                          <div className="p-4 border rounded-lg bg-muted/20">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">Analysis Score</h4>
                              <div className="flex items-center">
                                <span className="font-bold">{selectedDocument.analysis_score}/100</span>
                              </div>
                            </div>
                            <Progress value={selectedDocument.analysis_score} className="h-2" />
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-2">Analysis Summary</h4>
                            <p className="text-muted-foreground">
                              {selectedDocument.analysis_summary}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-6 border border-dashed rounded-lg">
                          <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                          <h3 className="text-lg font-medium mb-1">Document Not Yet Analyzed</h3>
                          <p className="text-muted-foreground mb-4">
                            Run analysis to extract key information and metrics from this document.
                          </p>
                          
                          <Button 
                            onClick={() => simulateAnalysis(selectedDocument.id)} 
                            disabled={isAnalyzing}
                            className="gap-2"
                          >
                            {isAnalyzing ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Analyzing... {analysisProgress}%
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4" />
                                Analyze Document
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="analysis">
                    {selectedDocument.is_analyzed ? (
                      <div className="space-y-4">
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">Detailed Analysis</h4>
                          <p className="text-muted-foreground">
                            {selectedDocument.analysis_summary}
                          </p>
                          
                          <div className="mt-4">
                            <h5 className="font-medium mb-2">Key Points</h5>
                            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                              <li>Document appears to be a {getCategoryLabel(selectedDocument.category).toLowerCase()} with relevant business information.</li>
                              <li>Analysis has extracted key financial and operational metrics.</li>
                              <li>Business valuation indicators have been assessed based on industry standards.</li>
                              <li>Risk factors have been identified and scored accordingly.</li>
                            </ul>
                          </div>
                          
                          <div className="mt-4">
                            <h5 className="font-medium mb-2">Recommendations</h5>
                            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                              <li>Review the financial metrics for consistency with industry benchmarks.</li>
                              <li>Validate growth projections against market conditions.</li>
                              <li>Consider additional due diligence in areas highlighted by risk assessment.</li>
                              <li>Compare valuation metrics with similar businesses in the acquisition pipeline.</li>
                            </ul>
                          </div>
                        </div>
                        
                        <Alert variant="default" className="bg-primary/10 border-primary/20">
                          <Info className="h-4 w-4 text-primary" />
                          <AlertTitle>Analysis Powered by AI</AlertTitle>
                          <AlertDescription>
                            This analysis is generated using AI based on the document content. Always verify critical information through professional due diligence.
                          </AlertDescription>
                        </Alert>
                      </div>
                    ) : (
                      <div className="text-center p-8">
                        <FilePieChart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <h3 className="text-lg font-medium mb-1">Analysis Not Available</h3>
                        <p className="text-muted-foreground mb-4">
                          You need to run the analysis first to view detailed insights.
                        </p>
                        
                        <Button 
                          onClick={() => simulateAnalysis(selectedDocument.id)} 
                          disabled={isAnalyzing}
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Analyzing... {analysisProgress}%
                            </>
                          ) : (
                            "Start Analysis"
                          )}
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="metrics">
                    {selectedDocument.is_analyzed && selectedDocument.metrics ? (
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-medium mb-3">Business Metrics</h4>
                          {renderBusinessMetrics(selectedDocument.metrics)}
                        </div>
                        
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-3">Analysis Score Breakdown</h4>
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm">Financial Health</span>
                                <span className="text-sm font-medium">{75 + Math.floor(Math.random() * 15)}%</span>
                              </div>
                              <Progress value={75 + Math.floor(Math.random() * 15)} className="h-2" />
                            </div>
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm">Growth Potential</span>
                                <span className="text-sm font-medium">{65 + Math.floor(Math.random() * 25)}%</span>
                              </div>
                              <Progress value={65 + Math.floor(Math.random() * 25)} className="h-2" />
                            </div>
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm">Market Position</span>
                                <span className="text-sm font-medium">{60 + Math.floor(Math.random() * 30)}%</span>
                              </div>
                              <Progress value={60 + Math.floor(Math.random() * 30)} className="h-2" />
                            </div>
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm">Risk Assessment</span>
                                <span className="text-sm font-medium">{50 + Math.floor(Math.random() * 40)}%</span>
                              </div>
                              <Progress value={50 + Math.floor(Math.random() * 40)} className="h-2" />
                            </div>
                          </div>
                        </div>
                        
                        <Alert variant="default" className="bg-primary/10 border-primary/20">
                          <Info className="h-4 w-4 text-primary" />
                          <AlertTitle>M&A Insights</AlertTitle>
                          <AlertDescription>
                            Based on the mastermind call discussions and acquisitions best practices, businesses in this category typically trade at {selectedDocument.metrics.multiple || '3-5'}x EBITDA multiples.
                          </AlertDescription>
                        </Alert>
                      </div>
                    ) : (
                      <div className="text-center p-8">
                        <BarChart2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <h3 className="text-lg font-medium mb-1">Metrics Not Available</h3>
                        <p className="text-muted-foreground mb-4">
                          You need to run the analysis first to extract key business metrics.
                        </p>
                        
                        <Button 
                          onClick={() => simulateAnalysis(selectedDocument.id)} 
                          disabled={isAnalyzing}
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Analyzing... {analysisProgress}%
                            </>
                          ) : (
                            "Start Analysis"
                          )}
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <Button variant="outline" onClick={() => setSelectedDocumentId(null)}>
                  Back to All Documents
                </Button>
                
                {selectedDocument.is_analyzed ? (
                  <Button variant="default">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    View Full Report
                  </Button>
                ) : (
                  <Button 
                    variant="default" 
                    onClick={() => simulateAnalysis(selectedDocument.id)} 
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Analyze Document
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        )}

        {selectedDocumentId === null && (
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>War Room Dashboard</CardTitle>
                <CardDescription>Your business acquisition command center</CardDescription>
              </CardHeader>
              <CardContent>
                {files.length > 0 ? (
                  <div className="space-y-6">
                    <Alert variant="default" className="bg-primary/10 border-primary/20">
                      <Info className="h-4 w-4 text-primary" />
                      <AlertTitle>Business Assessment</AlertTitle>
                      <AlertDescription>
                        Select a document from the list to view details or analyze its contents. The War Room helps you extract key business metrics and insights from your documents.
                      </AlertDescription>
                    </Alert>
                    
                    <div>
                      <h3 className="font-medium mb-3">Recently Uploaded Documents</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {files.slice(0, 4).map(file => (
                          <div 
                            key={file.id} 
                            className="p-3 border rounded-lg cursor-pointer hover:border-primary transition-colors"
                            onClick={() => setSelectedDocumentId(file.id)}
                          >
                            <div className="flex items-center gap-3">
                              {getDocumentIcon(file.file_type)}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{file.title}</p>
                                <div className="flex items-center text-xs text-muted-foreground mt-1">
                                  <Badge variant="outline" className="mr-2 text-xs">
                                    {getCategoryLabel(file.category)}
                                  </Badge>
                                  {file.is_analyzed ? (
                                    <Badge variant="secondary" className="text-xs">
                                      Analyzed
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">
                                      Not Analyzed
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-12">
                    <FilePieChart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Welcome to Your War Room</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Upload business documents like CIMs, financial statements, or market analyses to get AI-powered insights for your acquisition decisions.
                    </p>
                    <Button size="lg">
                      <Upload className="mr-2 h-5 w-5" />
                      Upload Your First Document
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default WarRoomPage;
