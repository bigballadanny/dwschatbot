
/**
 * Performance optimization utilities for the DWS Chatbot
 * 
 * This file contains utility functions to improve application performance
 * and reduce unnecessary re-renders or expensive operations.
 */

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Custom hook for debouncing function calls
 * Useful for search inputs and other frequently changing values
 * 
 * @param fn The function to debounce
 * @param delay The delay in milliseconds
 * @returns A debounced version of the function
 */
export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      fn(...args);
    }, delay);
  }, [fn, delay]);
}

/**
 * Custom hook for debouncing values
 * Returns the debounced value after the specified delay
 * 
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

/**
 * Custom hook for throttling function calls
 * Useful for scroll events and window resizing
 * 
 * @param fn The function to throttle
 * @param limit The minimum time between function calls in milliseconds
 * @returns A throttled version of the function
 */
export function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  const lastRunRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastRunRef.current >= limit) {
      fn(...args);
      lastRunRef.current = now;
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        fn(...args);
        lastRunRef.current = Date.now();
      }, limit - (now - lastRunRef.current));
    }
  }, [fn, limit]);
}

/**
 * Custom hook for lazy loading components
 * Useful for deferring the loading of off-screen components
 * 
 * @param callback Function to call when the element is visible
 * @param options IntersectionObserver options
 * @returns Ref to attach to the element
 */
export function useIntersectionObserver<T extends HTMLElement>(
  callback: (isIntersecting: boolean) => void,
  options: IntersectionObserverInit = {}
) {
  const ref = useRef<T | null>(null);
  
  useEffect(() => {
    if (!ref.current) return;
    
    const observer = new IntersectionObserver(([entry]) => {
      callback(entry.isIntersecting);
    }, options);
    
    observer.observe(ref.current);
    
    return () => {
      observer.disconnect();
    };
  }, [callback, options]);
  
  return ref;
}

/**
 * Custom hook for tracking previous value
 * Useful for comparing current and previous values
 * 
 * @param value The value to track
 * @returns The previous value
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
}

/**
 * Memoize expensive function results
 * Useful for calculations that don't need to be repeated with the same inputs
 * 
 * @param fn The function to memoize
 * @returns A memoized version of the function
 */
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    return result;
  }) as T;
}

/**
 * Batch DOM updates for better performance
 * Useful when making multiple DOM changes
 * 
 * @param callback Function containing DOM updates
 */
export function batchDOMUpdates(callback: () => void): void {
  if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
    window.requestAnimationFrame(() => {
      callback();
    });
  } else {
    callback();
  }
}

/**
 * Safe JSON parsing with error handling
 * 
 * @param jsonString The JSON string to parse
 * @param fallback The fallback value to return on error
 * @returns The parsed object or the fallback value
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return fallback;
  }
}

/**
 * Optimize image loading with lazy loading and proper sizing
 * 
 * @param src Image source URL
 * @param width Desired width
 * @param height Desired height
 * @returns Optimized image URL and loading attribute
 */
export function optimizeImage(src: string, width?: number, height?: number) {
  // This is a placeholder for actual image optimization logic
  // In a real implementation, this might use a CDN or image optimization service
  
  let optimizedSrc = src;
  
  // Add width and height parameters if provided
  if (width || height) {
    const params = new URLSearchParams();
    if (width) params.append('w', width.toString());
    if (height) params.append('h', height.toString());
    
    // This is just an example - actual implementation would depend on your image service
    optimizedSrc = `${src}?${params.toString()}`;
  }
  
  return {
    src: optimizedSrc,
    loading: 'lazy' as const,
    width,
    height,
  };
}

/**
 * Custom hook for error handling with automatic clearing
 */
export function useErrorHandler(timeout = 5000): [string | null, (error: string) => void, () => void] {
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const clearError = useCallback(() => {
    setError(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  
  const setErrorWithTimeout = useCallback((errorMessage: string) => {
    setError(errorMessage);
    
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    timerRef.current = setTimeout(() => {
      setError(null);
      timerRef.current = null;
    }, timeout);
  }, [timeout]);
  
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
  
  return [error, setErrorWithTimeout, clearError];
}
