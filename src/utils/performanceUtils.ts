
/**
 * Performance optimization utilities for the DWS Chatbot
 * 
 * This file contains utility functions to improve application performance
 * and reduce unnecessary re-renders or expensive operations.
 */

import { useEffect, useRef, useCallback } from 'react';

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
