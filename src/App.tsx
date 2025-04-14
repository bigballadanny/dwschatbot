
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import NotFound from '@/pages/NotFound';
import Transcripts from '@/pages/Transcripts';
import WarRoom from '@/pages/WarRoom';
import Analytics from '@/pages/Analytics';
import AdminManagement from '@/pages/AdminManagement';
import VertexAISetup from '@/pages/VertexAISetup';

import ProtectedRoute from '@/components/ProtectedRoute';
import ManagementRoute from '@/components/ManagementRoute';
import { AuthProvider } from '@/context/AuthContext';
import { AdminProvider } from '@/context/AdminContext';

import './App.css';

// Initialize the query client
const queryClient = new QueryClient();

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AdminProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/vertex-setup" element={<VertexAISetup />} />
                
                <Route 
                  path="/transcripts" 
                  element={
                    <ProtectedRoute>
                      <Transcripts />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/warroom" 
                  element={
                    <ProtectedRoute>
                      <WarRoom />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/analytics" 
                  element={
                    <ProtectedRoute>
                      <Analytics />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/admin" 
                  element={
                    <ManagementRoute>
                      <AdminManagement />
                    </ManagementRoute>
                  } 
                />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
            </AdminProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
