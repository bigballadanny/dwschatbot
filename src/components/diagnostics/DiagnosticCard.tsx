
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface DiagnosticCardProps {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * A reusable card component for displaying diagnostic information
 */
const DiagnosticCard = ({ title, description, children, footer }: DiagnosticCardProps) => {
  return (
    <Card className="border rounded-lg overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && 
          (typeof description === 'string' ? 
            <CardDescription>{description}</CardDescription> : 
            <div className="text-sm text-muted-foreground mt-1">{description}</div>
          )
        }
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
      {footer && (
        <CardFooter>
          {footer}
        </CardFooter>
      )}
    </Card>
  );
};

export default DiagnosticCard;
