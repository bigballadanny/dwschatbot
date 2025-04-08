
export interface DocumentFile {
  id: string;
  title: string;
  file_path?: string;
  content?: string;
  file_type?: string;
  created_at: string;
  updated_at?: string;
  user_id: string;
  category?: string;
  is_analyzed?: boolean;
  analysis_results?: any;
  financial_metrics?: FinancialMetrics;
}

export interface FinancialMetrics {
  revenue?: number;
  profit?: number;
  growth_rate?: number;
  margin?: number;
  valuation?: number;
  cash_flow?: number;
}

export interface DocumentAnalysisResult {
  id: string;
  document_id: string;
  analysis_date: string;
  analysis_type: string;
  results: any;
  confidence_score: number;
}
