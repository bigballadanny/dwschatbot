
import React from 'react';
import { Button } from "@/components/ui/button";
import { PanelLeft } from 'lucide-react';
import { useSidebar } from "@/components/ui/sidebar";

const SidebarOpenButton: React.FC = () => {
  const { state, toggleSidebar } = useSidebar();
  
  // Only render when the sidebar is collapsed
  if (state !== "collapsed") return null;
  
  return (
    <Button
      variant="ghost"
      size="icon"
      className="absolute left-4 top-4 z-30 h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-accent"
      onClick={() => toggleSidebar()}
      title="Open sidebar"
    >
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">Open sidebar</span>
    </Button>
  );
};

export default React.memo(SidebarOpenButton);
