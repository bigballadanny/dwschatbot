
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DiagnosticCardSimpleProps {
  title: string;
  value: React.ReactNode;
  description?: string;
  variant?: 'default' | 'warning' | 'error' | 'success';
  // These properties are used in older parts of the code
  isSuccess?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * A simplified card component for displaying diagnostic information with just a title and value
 */
const DiagnosticCardSimple = ({ 
  title, 
  value, 
  description, 
  variant = 'default',
  isSuccess,
  successMessage,
  errorMessage
}: DiagnosticCardSimpleProps) => {
  // Handle backwards compatibility with isSuccess props
  if (isSuccess !== undefined) {
    variant = isSuccess ? 'success' : 'error';
    value = isSuccess ? (successMessage || 'Success') : (errorMessage || 'Error');
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'warning':
        return 'border-amber-300 dark:border-amber-800';
      case 'error':
        return 'border-red-300 dark:border-red-800';
      case 'success':
        return 'border-green-300 dark:border-green-800';
      default:
        return '';
    }
  };

  return (
    <Card className={`border rounded-lg overflow-hidden ${getVariantClasses()}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="text-lg font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
};

export default DiagnosticCardSimple;
