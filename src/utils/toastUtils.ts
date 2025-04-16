
/**
 * Utility functions for showing toast notifications
 */
import { useToast } from "@/components/ui/use-toast";
import { toast as toastFn } from "@/hooks/use-toast";

// Success toast
export function showSuccess(title: string, message?: string) {
  toastFn({
    title,
    description: message,
    variant: "default"
  });
}

// Error toast
export function showError(title: string, message?: string, error?: Error) {
  if (error) {
    console.error(`${title}: ${message || error.message}`, error);
  }
  
  toastFn({
    title,
    description: message || (error ? error.message : undefined),
    variant: "destructive"
  });
}

// Warning toast
export function showWarning(title: string, message?: string) {
  toastFn({
    title,
    description: message,
    variant: "warning"
  });
}

// Info toast
export function showInfo(title: string, message?: string) {
  toastFn({
    title,
    description: message,
    variant: "default"
  });
}

// Tag action toast - used for tag operations in the TagsInput component
export function showTagAction(action: 'added' | 'deleted' | 'updated', tagName: string) {
  const titles = {
    added: `Tag Added`,
    deleted: `Tag Removed`,
    updated: `Tag Updated`
  };
  
  const messages = {
    added: `"${tagName}" has been added.`,
    deleted: `"${tagName}" has been removed.`,
    updated: `"${tagName}" has been updated.`
  };
  
  toastFn({
    title: titles[action],
    description: messages[action],
    variant: action === 'deleted' ? "destructive" : "default"
  });
}

// Current AI model info - centralized for easy updates
export const AI_MODEL_INFO = {
  CURRENT_MODEL: "gemini-2.0-flash",
  DISPLAY_NAME: "Gemini 2.0 Flash",
  MAX_TOKENS: 8192,
  CAPABILITIES: ["text", "reasoning", "code", "analysis"],
  getModelDescription() {
    return `Using ${this.DISPLAY_NAME} (${this.CURRENT_MODEL})`;
  }
};
