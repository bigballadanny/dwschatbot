
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import FileUploader from '@/components/FileUploader';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { FileText, BarChart2, PieChart, FileImage, Table, AlertCircle } from "lucide-react";
import { Sidebar, SidebarContent, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import ChatSidebar from '@/components/ChatSidebar';

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  status: 'processing' | 'analyzed' | 'error';
  analysis?: {
    score?: number;
    summary?: string;
    insights?: string[];
  };
}

const WarRoom = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  
  // Mock analysis function (in a real app, this would call an API)
  const analyzeFile = async (file: File): Promise<UploadedFile> => {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const fileType = file.type;
    let analysis = {
      score: Math.floor(Math.random() * 100),
      summary: "This is a sample analysis of the uploaded document.",
      insights: [
        "Identified key financial metrics",
        "Document structure appears standard",
        "No anomalies detected"
      ]
    };
    
    return {
      id: crypto.randomUUID(),
      name: file.name,
      type: fileType,
      size: file.size,
      status: 'analyzed',
      analysis
    };
  };

  const handleFileSelect = async (files: FileList) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upload and analyze documents.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Update progress
        setUploadProgress(Math.round((i / files.length) * 50));
        
        // Analyze the file (this would normally be done server-side)
        const analyzedFile = await analyzeFile(file);
        
        // Add to uploaded files
        setUploadedFiles(prev => [...prev, analyzedFile]);
        
        setUploadProgress(Math.round((i + 1) / files.length * 100));
      }
      
      toast({
        title: "Files Analyzed",
        description: `Successfully analyzed ${files.length} file(s)`,
      });
    } catch (error) {
      console.error('Error uploading or analyzing files:', error);
      toast({
        title: "Analysis Failed",
        description: "There was a problem analyzing your documents.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5" />;
    if (fileType.includes('image')) return <FileImage className="h-5 w-5" />;
    if (fileType.includes('sheet') || fileType.includes('excel')) return <Table className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  const renderAnalysisContent = () => {
    if (!selectedFile) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center p-8">
          <FileText className="h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-medium">No Document Selected</h3>
          <p className="text-muted-foreground mt-2">
            Select a document from the sidebar to view its analysis
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getFileIcon(selectedFile.type)}
            <span className="font-medium">{selectedFile.name}</span>
          </div>
          <Badge variant={selectedFile.analysis?.score && selectedFile.analysis.score > 70 ? "success" : "warning"}>
            Score: {selectedFile.analysis?.score || 'N/A'}
          </Badge>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Summary</h3>
          <p className="text-muted-foreground">
            {selectedFile.analysis?.summary || "No summary available."}
          </p>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Key Insights</h3>
          <ul className="space-y-1">
            {selectedFile.analysis?.insights?.map((insight, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                <span>{insight}</span>
              </li>
            )) || <li>No insights available</li>}
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Business Health Indicators</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Revenue Growth</span>
                <span className="text-sm font-medium">75%</span>
              </div>
              <Progress value={75} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Profit Margins</span>
                <span className="text-sm font-medium">60%</span>
              </div>
              <Progress value={60} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Cash Flow</span>
                <span className="text-sm font-medium">45%</span>
              </div>
              <Progress value={45} className="h-2" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const { state: sidebarState } = useSidebar();
  
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <ChatSidebar />
      <SidebarInset>
        <div className="flex flex-col h-full">
          <header className="border-b py-4 px-6">
            <h1 className="text-xl font-bold">Business War Room</h1>
            <p className="text-muted-foreground">Analyze business documents and gain strategic insights</p>
          </header>
          
          <div className="flex-1 overflow-hidden p-6">
            <Tabs defaultValue="upload" className="h-full flex flex-col">
              <TabsList>
                <TabsTrigger value="upload">Upload</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="flex-1 overflow-hidden mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Upload Business Documents</CardTitle>
                    <CardDescription>
                      Upload financial statements, CIMs, market analysis and other business documents for AI analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FileUploader
                      onFileSelect={handleFileSelect}
                      isUploading={isUploading}
                      uploadProgress={uploadProgress}
                      acceptedFileTypes=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.jpg,.jpeg,.png"
                      multiple={true}
                      showPreview={true}
                      className="border-amber-300 hover:border-amber-400"
                    />
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <p className="text-sm text-muted-foreground">
                      Supported formats: PDF, Word, Excel, CSV, Images
                    </p>
                    <Button variant="outline">View Guide</Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              <TabsContent value="analysis" className="flex-1 overflow-hidden mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                  <Card className="lg:col-span-1 overflow-hidden">
                    <CardHeader>
                      <CardTitle>Uploaded Documents</CardTitle>
                    </CardHeader>
                    <ScrollArea className="h-[calc(100vh-300px)]">
                      <div className="px-4 py-2">
                        {uploadedFiles.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>No documents uploaded yet</p>
                            <Button variant="link" className="mt-2" onClick={() => document.querySelector('[value="upload"]')?.dispatchEvent(new Event('click'))}>
                              Upload your first document
                            </Button>
                          </div>
                        ) : (
                          <ul className="space-y-2">
                            {uploadedFiles.map((file) => (
                              <li key={file.id}>
                                <Button
                                  variant={selectedFile?.id === file.id ? "default" : "ghost"}
                                  className="w-full justify-start"
                                  onClick={() => setSelectedFile(file)}
                                >
                                  <div className="flex items-center w-full text-left">
                                    <span className="mr-2">
                                      {getFileIcon(file.type)}
                                    </span>
                                    <span className="truncate flex-1">{file.name}</span>
                                    {file.status === 'analyzed' && (
                                      <Badge variant="outline" className="ml-2">
                                        {file.analysis?.score || 'N/A'}
                                      </Badge>
                                    )}
                                    {file.status === 'processing' && (
                                      <Badge variant="outline" className="ml-2">
                                        Processing
                                      </Badge>
                                    )}
                                    {file.status === 'error' && (
                                      <AlertCircle className="h-4 w-4 text-destructive ml-2" />
                                    )}
                                  </div>
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </ScrollArea>
                  </Card>
                  
                  <Card className="lg:col-span-2 overflow-hidden">
                    <CardHeader>
                      <CardTitle>Document Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[calc(100vh-300px)]">
                        {renderAnalysisContent()}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SidebarInset>
    </div>
  );
};

export default WarRoom;
