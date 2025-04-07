
import { success, error, warning, info } from "@/hooks/use-toast";

/**
 * Toast utility functions to provide a consistent notification experience
 */

/**
 * Show a success toast message
 * @param title - The title of the toast
 * @param description - Optional description text
 */
export const showSuccess = (title: string, description?: string) => {
  success({ 
    title, 
    description,
  });
};

/**
 * Show an error toast message
 * @param title - The title of the toast
 * @param description - Optional description text
 * @param error - Optional error object for logging
 */
export const showError = (title: string, description?: string, error?: any) => {
  if (error) {
    console.error(title, error);
  }
  
  error({ 
    title, 
    description: description || "Please try again or contact support if the issue persists.",
  });
};

/**
 * Show a warning toast message
 * @param title - The title of the toast
 * @param description - Optional description text
 */
export const showWarning = (title: string, description?: string) => {
  warning({ 
    title, 
    description,
  });
};

/**
 * Show an info toast message
 * @param title - The title of the toast
 * @param description - Optional description text
 */
export const showInfo = (title: string, description?: string) => {
  info({ 
    title, 
    description,
  });
};
