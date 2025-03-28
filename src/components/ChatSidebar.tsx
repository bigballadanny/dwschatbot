
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useAdmin } from '@/context/AdminContext';
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModeToggle } from "@/components/ModeToggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Settings, MessageSquare, Trash2, PlusCircle, 
  BarChart3, LogOut, Search, ChevronLeft, ChevronRight
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
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from '@/lib/utils';

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
  
  // Get conversation ID from URL if present
  const urlParams = new URLSearchParams(location.search);
  const conversationId = urlParams.get('conversation');
  
  // Fetch user conversations whenever the user changes
  useEffect(() => {
    if (user) {
      fetchConversations();
    } else {
      // Clear conversations if no user is logged in
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
        // Reload the page with the new conversation ID
        window.location.href = `/?conversation=${data[0].id}`;
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
  
  const handleDeleteConversation = async () => {
    if (!conversationToDelete) return;
    
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationToDelete);
        
      if (error) throw error;
      
      // Remove from local state
      setConversations(prev => prev.filter(c => c.id !== conversationToDelete));
      
      // If the deleted conversation was selected, navigate to home
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
  
  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setConversationToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  const handleSettings = () => {
    setSettingsOpen(true);
  };
  
  const filteredConversations = conversations.filter(
    conversation => conversation.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
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
        <ScrollArea className="h-full">
          <SidebarGroup>
            <SidebarGroupLabel>Conversations</SidebarGroupLabel>
            <SidebarMenu>
              {filteredConversations.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <SidebarMenuItem key={conversation.id} className="group relative">
                    <Link 
                      to={`/?conversation=${conversation.id}`}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md p-2 text-sm hover:bg-accent",
                        conversationId === conversation.id && "bg-accent"
                      )}
                    >
                      <div className="flex items-center flex-1 min-w-0 mr-2">
                        <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {conversation.title || 'New Conversation'}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0 opacity-70 hover:opacity-100 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => confirmDelete(conversation.id, e)}
                        title="Delete conversation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Link>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>
      
      <SidebarFooter className="border-t">
        <SidebarMenu>
          {isAdmin && (
            <SidebarMenuItem>
              <Link to="/analytics">
                <SidebarMenuButton>
                  <BarChart3 className="h-4 w-4" />
                  <span>Analytics</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <SidebarMenuButton onClick={handleSettings}>
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Settings</SheetTitle>
                  <SheetDescription>
                    Customize your experience
                  </SheetDescription>
                </SheetHeader>
                <div className="py-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Theme</div>
                    <ModeToggle />
                  </div>
                  {/* Add more settings here */}
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
            <SidebarMenuButton onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConversation}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
};

export default ChatSidebar;
