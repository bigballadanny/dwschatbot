import * as React from 'react';
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
import ProtectedRoute from '@/components/ProtectedRoute';
import ManagementRoute from '@/components/ManagementRoute';
import { AuthProvider, useAuth } from '@/contexts/auth';
import { AdminProvider } from '@/contexts/admin';
import { AudioProvider } from '@/contexts/audio';
import { ChatProvider } from '@/contexts/chat';
import SidebarOpenButton from '@/components/sidebar/SidebarOpenButton';
import TranscriptDiagnostics from '@/pages/TranscriptDiagnostics';
import ErrorBoundary from '@/components/ErrorBoundary';
import './App.css';

// Initialize the query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

// Wrap the main content in a component to use hooks like useLocation
const AppContent = () => {
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const isAuthPage = location.pathname === '/auth';
  const showSidebar = !isAuthPage && user;

  // Always redirect to auth page if not authenticated and not already on auth page
  React.useEffect(() => {
    if (!isLoading && !user && !isAuthPage) {
      // We use this approach instead of Navigate to avoid render issues
      window.location.href = '/auth';
    }
  }, [user, isLoading, isAuthPage]);

  // Don't render anything while checking authentication to prevent flashes
  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full min-h-screen bg-slate-900">
        <div className="w-16 h-16 border-4 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

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
          <Route path="/" element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          } />
          <Route path="/auth" element={<Auth />} />
          
          <Route path="/transcripts" element={
            <ProtectedRoute>
              <Transcripts />
            </ProtectedRoute>
          } />
          
          <Route path="/transcript-diagnostics" element={
            <ProtectedRoute>
              <TranscriptDiagnostics />
            </ProtectedRoute>
          } />
          
          <Route path="/warroom" element={
            <ProtectedRoute>
              <WarRoom />
            </ProtectedRoute>
          } />
          
          <Route path="/war-room" element={
            <ProtectedRoute>
              <WarRoom />
            </ProtectedRoute>
          } />
          
          <Route path="/analytics" element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          } />
          
          <Route path="/admin" element={
            <ManagementRoute>
              <AdminManagement />
            </ManagementRoute>
          } />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Toaster />
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <SidebarProvider>
              <AuthProvider>
                <AdminProvider>
                  <AudioProvider options={{ autoPlay: true }}>
                    <ChatContextWrapper />
                  </AudioProvider>
                </AdminProvider>
              </AuthProvider>
            </SidebarProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

// Wrapper for ChatContext that needs access to the user from AuthContext
const ChatContextWrapper = () => {
  const { user } = useAuth();
  
  return (
    <ChatProvider user={user} initialConversationId={null}>
      <AppContent />
    </ChatProvider>
  );
}

export default App;