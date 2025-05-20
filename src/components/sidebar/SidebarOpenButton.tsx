
import React from 'react';
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import DWSLogo from '@/components/DWSLogo';

const SidebarOpenButton: React.FC = () => {
  const { state, toggleSidebar } = useSidebar();
  
  // Only render when the sidebar is collapsed
  if (state !== "collapsed") return null;
  
  return (
    <Button
      variant="ghost"
      size="icon"
      className="absolute left-4 top-4 z-30 h-10 w-10 bg-background/80 backdrop-blur-sm hover:bg-dws-gold/10 border border-dws-gold/20 transition-all duration-300 hover:scale-105"
      onClick={() => toggleSidebar()}
      title="Open sidebar"
    >
      <DWSLogo size="sm" />
      <span className="sr-only">Open sidebar</span>
    </Button>
  );
};

export default React.memo(SidebarOpenButton);
