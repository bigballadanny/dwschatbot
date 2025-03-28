
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from "@/components/ThemeProvider";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from '@/context/AuthContext';
import { AdminProvider } from '@/context/AdminContext';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Analytics from '@/pages/Analytics';
import Transcripts from '@/pages/Transcripts';
import AdminManagement from '@/pages/AdminManagement';
import NotFound from '@/pages/NotFound';
import ProtectedRoute from '@/components/ProtectedRoute';
import ManagementRoute from '@/components/ManagementRoute';

// Create a client for React Query
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AdminProvider>
          <ThemeProvider defaultTheme="system" storageKey="dwsai-theme">
            <SidebarProvider defaultState="expanded" storageKey="dwsai-sidebar">
              <Router>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route 
                    path="/" 
                    element={
                      <ProtectedRoute>
                        <Index />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/analytics" 
                    element={
                      <ManagementRoute adminRequired={true}>
                        <Analytics />
                      </ManagementRoute>
                    } 
                  />
                  <Route 
                    path="/admin" 
                    element={
                      <ManagementRoute adminRequired={true}>
                        <AdminManagement />
                      </ManagementRoute>
                    } 
                  />
                  <Route 
                    path="/transcripts" 
                    element={
                      <ManagementRoute adminRequired={true}>
                        <Transcripts />
                      </ManagementRoute>
                    } 
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Router>
              <Toaster />
            </SidebarProvider>
          </ThemeProvider>
        </AdminProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
