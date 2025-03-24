
import React from 'react';
import { cn } from "@/lib/utils";

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className }) => {
  return (
    <header className={cn(
      "w-full py-6 px-8 flex items-center justify-center sticky top-0 z-10",
      "glassmorphism border-b",
      "animate-fade-in",
      className
    )}>
      <div className="flex flex-col items-center">
        <h1 className="text-2xl font-medium tracking-tight text-primary">
          Carl Allen Expert Bot
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your guide to Carl Allen's business acquisition wisdom
        </p>
      </div>
    </header>
  );
};

export default Header;
