import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SidebarProvider } from "@/components/ui/sidebar";
import ChatSidebar from '@/components/ChatSidebar';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import NotFound from '@/pages/NotFound';
import Transcripts from '@/pages/Transcripts';
import AdminManagement from '@/pages/AdminManagement';
import ProtectedRoute from '@/components/ProtectedRoute';
import ManagementRoute from '@/components/ManagementRoute';
import { AuthProvider } from '@/context/AuthContext';
import { AdminProvider } from '@/context/AdminContext';
import SidebarOpenButton from '@/components/sidebar/SidebarOpenButton';
import './App.css';

// Initialize the query client
const queryClient = new QueryClient();

// Wrap the main content in a component to use hooks like useLocation
const AppContent = () => {
  const location = useLocation();
  const showSidebar = location.pathname !== '/auth';

  return (
    <div className="flex w-full min-h-screen">
      {showSidebar && (
        <>
          <ChatSidebar />
          {/* The SidebarOpenButton will automatically render only when sidebar is collapsed */}
          <SidebarOpenButton />
        </>
      )}
      
      
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          
          <Route path="/transcripts" element={<ProtectedRoute>
                <Transcripts />
              </ProtectedRoute>} />
          
          <Route path="/admin" element={<ManagementRoute>
                <AdminManagement />
              </ManagementRoute>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Toaster />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SidebarProvider>
            <AuthProvider>
              <AdminProvider>
                {/* AppContent needs to be inside BrowserRouter to use useLocation */}
                <AppContent /> 
              </AdminProvider>
            </AuthProvider>
          </SidebarProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;