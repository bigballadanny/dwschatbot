import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useAdmin } from '@/context/AdminContext';
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Settings, PlusCircle, BarChart3, LogOut, Search, 
  ChevronLeft, ChevronRight, UserCog, Home
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarSeparator
} from "@/components/ui/sidebar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Import refactored components
import ConversationList from './sidebar/ConversationList';
import DeleteConversationDialog from './sidebar/DeleteConversationDialog';

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

const ChatSidebar = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { state: sidebarState, toggleSidebar } = useSidebar();
  
  const urlParams = new URLSearchParams(location.search);
  const conversationId = urlParams.get('conversation');
  
  useEffect(() => {
    if (user) {
      fetchConversations();
    } else {
      setConversations([]);
    }
  }, [user]);
  
  const fetchConversations = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
        
      if (error) throw error;
      setConversations(data || []);
      console.log('Fetched conversations:', data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your conversations',
        variant: 'destructive',
      });
    }
  };
  
  const handleNewChat = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('conversations')
        .insert([{ 
          title: 'New Conversation',
          user_id: user.id
        }])
        .select();
        
      if (error) throw error;
      
      if (data?.[0]?.id) {
        navigate(`/?conversation=${data[0].id}`);
        fetchConversations();
      }
    } catch (error) {
      console.error('Error creating new conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create a new conversation',
        variant: 'destructive',
      });
    }
  };
  
  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setConversationToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConversation = async () => {
    if (!conversationToDelete) return;
    
    try {
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationToDelete);
        
      if (messagesError) throw messagesError;
      
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationToDelete);
        
      if (error) throw error;
      
      setConversations(prev => prev.filter(c => c.id !== conversationToDelete));
      
      if (conversationId === conversationToDelete) {
        navigate('/');
      }
      
      toast({
        title: 'Success',
        description: 'Conversation deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete the conversation',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };
  
  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-3">
          <h2 className="text-lg font-bold flex-1">DWS AI</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleNewChat}
            title="New chat"
          >
            <PlusCircle className="h-5 w-5" />
          </Button>
          <SidebarTrigger className="h-8 w-8">
            {sidebarState === "expanded" ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </SidebarTrigger>
        </div>
        <div className="relative px-2 pb-2">
          <Search className="absolute left-4 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarMenu className="px-2 pt-2">
          <SidebarMenuItem>
            <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/')}>
              <SidebarMenuButton>
                <Home className="h-4 w-4" />
                <span>Home</span>
              </SidebarMenuButton>
            </Button>
          </SidebarMenuItem>
          {isAdmin && (
            <SidebarMenuItem>
              <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/analytics')}>
                <SidebarMenuButton>
                  <BarChart3 className="h-4 w-4" />
                  <span>Analytics</span>
                </SidebarMenuButton>
              </Button>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
        
        <SidebarSeparator className="my-2" />
        
        <ConversationList 
          conversations={conversations}
          activeConversationId={conversationId}
          onDeleteConversation={confirmDelete}
          searchQuery={searchQuery}
        />
      </SidebarContent>
      
      <SidebarFooter className="border-t">
        <SidebarMenu>
          {isAdmin && (
            <SidebarMenuItem>
              <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/admin')}>
                <SidebarMenuButton>
                  <UserCog className="h-4 w-4" />
                  <span>Admin Users</span>
                </SidebarMenuButton>
              </Button>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" className="w-full justify-start">
                  <SidebarMenuButton>
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Settings</SheetTitle>
                  <SheetDescription>
                    Customize your experience
                  </SheetDescription>
                </SheetHeader>
                <div className="py-4 space-y-4">
                  {/* Add settings here */}
                </div>
                <SheetFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setSettingsOpen(false)}
                  >
                    Close
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
              <SidebarMenuButton>
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </SidebarMenuButton>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
      <DeleteConversationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirmDelete={handleDeleteConversation}
      />
    </Sidebar>
  );
};

export default ChatSidebar;
