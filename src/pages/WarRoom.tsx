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

const documentCategories = [
  { id: 'financial', label: 'Financials', icon: <FileSpreadsheet className="h-4 w-4" /> },
  { id: 'legal', label: 'Legal Documents', icon: <FileText className="h-4 w-4" /> },
  { id: 'market', label: 'Market Analysis', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'business_plan', label: 'Business Plan', icon: <FileText className="h-4 w-4" /> },
  { id: 'presentation', label: 'Presentations', icon: <FileImage className="h-4 w-4" /> },
  { id: 'other', label: 'Other', icon: <FileText className="h-4 w-4" /> }
];

const WarRoom: React.FC = () => {
  // ... keep rest of the code the same ...
};
