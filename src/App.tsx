import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SidebarProvider } from "@/components/ui/sidebar";
import ChatSidebar from '@/components/ChatSidebar';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import NotFound from '@/pages/NotFound';
import Transcripts from '@/pages/Transcripts';
import WarRoom from '@/pages/WarRoom';
import Analytics from '@/pages/Analytics';
import AdminManagement from '@/pages/AdminManagement';
import VertexAISetup from '@/pages/VertexAISetup';
import VertexTest from '@/pages/VertexTest';
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
      
      {/* Add a floating link to easily access the Vertex AI setup page */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="flex flex-col gap-2">
          
          <Link to="/vertex-setup" className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded shadow flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
              <path d="M12 9v4"></path>
              <path d="M12 17h.01"></path>
            </svg>
            Vertex AI Setup
          </Link>
        </div>
      </div>
      
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/vertex-setup" element={<VertexAISetup />} />
          <Route path="/vertex-test" element={<VertexTest />} />
          
          <Route path="/transcripts" element={<ProtectedRoute>
                <Transcripts />
              </ProtectedRoute>} />
          
          <Route path="/warroom" element={<ProtectedRoute>
                <WarRoom />
              </ProtectedRoute>} />
          
          <Route path="/war-room" element={<ProtectedRoute>
                <WarRoom />
              </ProtectedRoute>} />
          
          <Route path="/analytics" element={<ProtectedRoute>
                <Analytics />
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