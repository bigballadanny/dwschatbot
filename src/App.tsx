
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet, // Import Outlet for nested layouts
} from 'react-router-dom';
import { ThemeProvider } from "@/components/ThemeProvider";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar"; 
import ChatSidebar from "@/components/ChatSidebar";
import { AuthProvider } from '@/context/AuthContext';
import { AdminProvider } from '@/context/AdminContext';
import Header from "@/components/Header";
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Analytics from '@/pages/Analytics';
import Transcripts from '@/pages/Transcripts';
import AdminManagement from '@/pages/AdminManagement';
import NotFound from '@/pages/NotFound';
import ProtectedRoute from '@/components/ProtectedRoute';
import ManagementRoute from '@/components/ManagementRoute';
import WarRoom from '@/pages/WarRoom';
import { Button } from "@/components/ui/button"; 
import { PanelLeft } from 'lucide-react'; 

// Create a client for React Query
const queryClient = new QueryClient();

// Inside SidebarProvider component to access useSidebar
const SidebarOpenButton = () => {
  const { state, toggleSidebar } = useSidebar();
  
  if (state !== "collapsed") return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      className="fixed left-4 top-4 z-50"
      onClick={toggleSidebar}
    >
      <PanelLeft className="h-5 w-5" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
};

// Layout component including Sidebar and Header
// This component is wrapped with SidebarProvider in the Routes definition
const MainLayout = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <ChatSidebar />
      <SidebarOpenButton /> {/* Now safely using useSidebar within SidebarProvider */}
      <SidebarInset> 
        <div className="flex flex-col h-full w-full">
          <Header />
          <main className="flex-1 overflow-y-auto bg-muted/30">
            <Outlet /> {/* Renders the nested child route's element */}
          </main>
        </div>
      </SidebarInset>
    </div>
  );
};

// Layout component for simple pages (e.g., Auth, NotFound)
const SimpleLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 flex items-center justify-center">
        <Outlet />
      </main>
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AdminProvider>
          <ThemeProvider defaultTheme="light">
            <Router>
              <Routes>
                {/* Routes WITHOUT the main sidebar/header layout */}
                <Route element={<SimpleLayout />}>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="*" element={<NotFound />} /> {/* Catch-all for non-matching routes */}
                </Route>
                
                {/* Wrap MainLayout with SidebarProvider */}
                <Route element={
                  <SidebarProvider>
                    <MainLayout />
                  </SidebarProvider>
                }>
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
                  <Route 
                    path="/war-room" 
                    element={
                      <ProtectedRoute>
                        <WarRoom />
                      </ProtectedRoute>
                    } 
                  />
                </Route>
              </Routes>
            </Router>
            <Toaster />
          </ThemeProvider>
        </AdminProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
