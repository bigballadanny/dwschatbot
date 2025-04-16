import { toast } from "@/hooks/use-toast";

/**
 * Toast utility functions to provide a consistent notification experience
 */

/**
 * Show a success toast message
 * @param title - The title of the toast
 * @param description - Optional description text
 * @param duration - Optional duration in milliseconds (default: 5000ms)
 */
export const showSuccess = (title: string, description?: string, duration: number = 5000) => {
  return toast({ 
    title, 
    description,
    variant: 'success',
    duration,
  });
};

/**
 * Show an error toast message
 * @param title - The title of the toast
 * @param description - Optional description text
 * @param error - Optional error object for logging
 * @param duration - Optional duration in milliseconds (default: 7000ms)
 */
export const showError = (title: string, description?: string, error?: any, duration: number = 7000) => {
  if (error) {
    console.error(title, error);
  }
  
  return toast({ 
    title, 
    description: description || "Please try again or contact support if the issue persists.",
    variant: 'destructive',
    duration,
  });
};

/**
 * Show a warning toast message
 * @param title - The title of the toast
 * @param description - Optional description text
 * @param duration - Optional duration in milliseconds (default: 5000ms)
 */
export const showWarning = (title: string, description?: string, duration: number = 5000) => {
  return toast({ 
    title, 
    description,
    variant: 'warning',
    duration,
  });
};

/**
 * Show an info toast message
 * @param title - The title of the toast
 * @param description - Optional description text
 * @param duration - Optional duration in milliseconds (default: 5000ms)
 */
export const showInfo = (title: string, description?: string, duration: number = 5000) => {
  return toast({ 
    title, 
    description,
    variant: 'info',
    duration,
  });
};

/**
 * Show a loading toast message
 * @param title - The title of the toast
 * @param description - Optional description text
 * @returns id - The toast ID to use for updating the toast later
 */
export const showLoading = (title: string, description?: string): string => {
  return toast({ 
    title, 
    description,
    duration: 100000, // Long duration
    variant: 'loading', // Now loading is a valid variant
  }).id;
};

/**
 * Dismiss a specific toast by ID
 * @param id - The ID of the toast to dismiss
 */
export const dismissToast = (id: string) => {
  // Import directly from use-toast to avoid circular references
  const { dismiss } = require("@/hooks/use-toast");
  dismiss(id);
};

/**
 * Show a tag management notification
 * @param action - The action performed (added, updated, deleted)
 * @param tagName - The name of the tag
 */
export const showTagAction = (action: 'added' | 'updated' | 'deleted', tagName: string) => {
  switch (action) {
    case 'added':
      toast({
        title: 'Tag Added',
        description: `Tag "${tagName}" has been added successfully.`,
        variant: 'success',
        duration: 3000,
      });
      break;
    case 'updated':
      toast({
        title: 'Tag Updated',
        description: `Tag "${tagName}" has been updated successfully.`,
        variant: 'info',
        duration: 3000,
      });
      break;
    case 'deleted':
      toast({
        title: 'Tag Removed',
        description: `Tag "${tagName}" has been removed.`,
        variant: 'info',
        duration: 3000,
      });
      break;
  }
};

/**
 * Show an upload progress notification
 * @param title - The title of the toast
 * @param progress - Progress percentage (0-100)
 * @param description - Optional description text
 */
export const showUploadProgress = (title: string, progress: number, description?: string) => {
  toast({ 
    title, 
    description: description || `Upload progress: ${progress}%`,
    variant: 'info',
    duration: 3000,
  });
};

/**
 * Show a processing file notification
 * @param title - The title of the toast
 * @param fileType - Type of file being processed
 * @param description - Optional description text
 */
export const showProcessingFile = (title: string, fileType: string, description?: string) => {
  toast({ 
    title, 
    description: description || `Processing ${fileType} file. Please wait...`,
    variant: 'info',
    duration: 3000,
  });
};
