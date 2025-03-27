
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface HeaderLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
}

const HeaderLink: React.FC<HeaderLinkProps> = ({ to, children, className }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link
      to={to}
      className={cn(
        "px-4 py-2 rounded-md transition-colors",
        isActive 
          ? "bg-primary text-primary-foreground" 
          : "hover:bg-muted",
        className
      )}
    >
      {children}
    </Link>
  );
};

export default HeaderLink;
