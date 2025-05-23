
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth/AuthContext';
import { useAdmin } from '@/contexts/admin/AdminContext';
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, PlusCircle, BarChart3, LogOut, Search, ChevronLeft, ChevronRight, UserCog, Home, FileText, Moon, Sun, Shield, Building } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, SidebarSeparator } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Import refactored components
import ConversationList from './sidebar/ConversationList';
import DeleteConversationDialog from './sidebar/DeleteConversationDialog';

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface ChatSidebarProps {
  currentConversationId?: string;
  onSelectConversation?: (id: string) => void;
  onCreateNew?: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ 
  currentConversationId, 
  onSelectConversation,
  onCreateNew 
}) => {
  const { theme, setTheme } = useTheme();
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
  const conversationId = currentConversationId || urlParams.get('conversation');

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
      const {
        data,
        error
      } = await supabase.from('conversations').select('id, title, updated_at').eq('user_id', user.id).order('updated_at', {
        ascending: false
      });
      if (error) throw error;
      setConversations(data || []);
      console.log('Fetched conversations:', data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your conversations',
        variant: 'destructive'
      });
    }
  };

  const handleNewChat = async () => {
    if (onCreateNew) {
      onCreateNew();
      return;
    }
    
    try {
      if (!user) return;
      const {
        data,
        error
      } = await supabase.from('conversations').insert([{
        title: 'New Conversation',
        user_id: user.id
      }]).select();
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
        variant: 'destructive'
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
      const {
        error: messagesError
      } = await supabase.from('messages').delete().eq('conversation_id', conversationToDelete);
      if (messagesError) throw messagesError;
      const {
        error
      } = await supabase.from('conversations').delete().eq('id', conversationToDelete);
      if (error) throw error;
      setConversations(prev => prev.filter(c => c.id !== conversationToDelete));
      if (conversationId === conversationToDelete) {
        navigate('/');
      }
      toast({
        title: 'Success',
        description: 'Conversation deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete the conversation',
        variant: 'destructive'
      });
    } finally {
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  const handleSelectConversation = (id: string) => {
    if (onSelectConversation) {
      onSelectConversation(id);
    } else {
      navigate(`/?conversation=${id}`);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarRail />
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-3">
          <Button 
            variant="ghost" 
            className="font-bold text-xl flex items-center cursor-pointer transition-all hover:scale-105 flex-1"
            onClick={toggleSidebar}
            title="Toggle Sidebar"
          >
            <div className="relative p-2 rounded-lg mr-2 overflow-hidden futuristic-glow z-10">
              <div className="absolute inset-0 animate-pulse-subtle bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 opacity-70 blur-md"></div>
              <img 
                src="/lovable-uploads/d2cda96a-7427-49e3-86f0-42ecd63d9982.png" 
                alt="DealMaker Wealth Society" 
                className="h-8 w-8 relative z-10" 
              />
            </div>
            <span className={`bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent font-bold ${sidebarState === "collapsed" ? "hidden" : "block"}`}>
              DWS AI
            </span>
          </Button>
          <Button variant="ghost" size="icon" className={`h-8 w-8 ${sidebarState === "collapsed" ? "hidden" : "block"}`} onClick={handleNewChat} title="New chat">
            <PlusCircle className="h-5 w-5" />
          </Button>
        </div>
        <div className={`relative px-2 pb-2 ${sidebarState === "collapsed" ? "hidden" : "block"}`}>
          <Search className="absolute left-4 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search conversations..." className="pl-8" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
      </SidebarHeader>
      
      <SidebarContent className={sidebarState === "collapsed" ? "hidden" : "block"}>
        <SidebarMenu className="px-2 pt-2">
          <SidebarMenuItem>
            <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/')}>
              <SidebarMenuButton>
                <Home className="h-4 w-4" />
                <span>Home</span>
              </SidebarMenuButton>
            </Button>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/war-room')}>
              <SidebarMenuButton>
                <Building className="h-4 w-4" />
                <span>War Room</span>
              </SidebarMenuButton>
            </Button>
          </SidebarMenuItem>
          
          {isAdmin && (
            <>
              <SidebarMenuItem>
                <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/analytics')}>
                  <SidebarMenuButton>
                    <BarChart3 className="h-4 w-4" />
                    <span>Analytics</span>
                  </SidebarMenuButton>
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/transcripts')}>
                  <SidebarMenuButton>
                    <FileText className="h-4 w-4" />
                    <span>Transcripts</span>
                  </SidebarMenuButton>
                </Button>
              </SidebarMenuItem>
            </>
          )}
        </SidebarMenu>
        
        <SidebarSeparator className="my-2" />
        
        <ConversationList 
          conversations={conversations} 
          activeConversationId={conversationId || null} 
          onDeleteConversation={confirmDelete} 
          searchQuery={searchQuery}
        />
      </SidebarContent>
      
      <SidebarFooter className={`border-t ${sidebarState === "collapsed" ? "hidden" : "block"}`}>
        <SidebarMenu>
          {isAdmin && <SidebarMenuItem>
              <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/admin')}>
                <SidebarMenuButton>
                  <UserCog className="h-4 w-4" />
                  <span>Admin Users</span>
                </SidebarMenuButton>
              </Button>
            </SidebarMenuItem>}
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
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Appearance</h3>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="dark-mode"
                        checked={theme === "dark"}
                        onCheckedChange={toggleTheme}
                        aria-label="Toggle dark mode"
                      />
                      <Label htmlFor="dark-mode" className="flex items-center cursor-pointer">
                        {theme === "dark" ? (
                          <div className="flex items-center gap-2">
                            <Moon className="h-4 w-4" />
                            <span>Dark Mode</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Sun className="h-4 w-4" />
                            <span>Light Mode</span>
                          </div>
                        )}
                      </Label>
                    </div>
                  </div>
                </div>
                <SheetFooter>
                  <Button variant="outline" onClick={() => setSettingsOpen(false)}>
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
      
      <DeleteConversationDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirmDelete={handleDeleteConversation} />
    </Sidebar>
  );
};

export default ChatSidebar;
