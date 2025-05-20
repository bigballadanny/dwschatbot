/**
 * Cache utility functions for the application
 * Implements a simple client-side caching mechanism for API responses
 */

// Cache storage
interface CacheEntry {
  data: any;
  timestamp: number;
  expiry: number;
}

// In-memory cache for API responses
const apiCache = new Map<string, CacheEntry>();

// Default expiration time (30 minutes)
const DEFAULT_CACHE_EXPIRY = 30 * 60 * 1000;

/**
 * Generate a cache key from the request parameters
 * @param endpoint The API endpoint
 * @param params The request parameters
 * @returns A string to use as the cache key
 */
export function generateCacheKey(endpoint: string, params: any): string {
  // Sort keys to ensure consistent order
  const sortedParams = Object.keys(params || {})
    .sort()
    .reduce((result: Record<string, any>, key) => {
      result[key] = params[key];
      return result;
    }, {});

  return `${endpoint}:${JSON.stringify(sortedParams)}`;
}

/**
 * Get an item from the cache
 * @param key The cache key
 * @returns The cached data or null if not found or expired
 */
export function getCachedItem<T>(key: string): T | null {
  const entry = apiCache.get(key);

  if (!entry) {
    return null;
  }

  // Check if the entry has expired
  if (Date.now() > entry.expiry) {
    apiCache.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Store an item in the cache
 * @param key The cache key
 * @param data The data to cache
 * @param expiryTime Optional expiration time in milliseconds
 */
export function setCacheItem(
  key: string,
  data: any,
  expiryTime: number = DEFAULT_CACHE_EXPIRY
): void {
  apiCache.set(key, {
    data,
    timestamp: Date.now(),
    expiry: Date.now() + expiryTime,
  });
}

/**
 * Clear an item from the cache
 * @param key The cache key
 */
export function clearCacheItem(key: string): void {
  apiCache.delete(key);
}

/**
 * Clear all items from the cache
 */
export function clearCache(): void {
  apiCache.clear();
}

/**
 * Clear expired items from the cache
 */
export function clearExpiredCache(): void {
  const now = Date.now();
  
  apiCache.forEach((entry, key) => {
    if (now > entry.expiry) {
      apiCache.delete(key);
    }
  });
}

/**
 * Higher-order function to wrap API calls with caching
 * @param apiFunction The API function to wrap
 * @param expiryTime Optional expiration time in milliseconds
 * @returns A function that implements caching for the API call
 */
export function withCache<T, P extends any[]>(
  apiFunction: (...args: P) => Promise<T>,
  generateKey: (...args: P) => string,
  expiryTime: number = DEFAULT_CACHE_EXPIRY
): (...args: P) => Promise<T> {
  return async (...args: P): Promise<T> => {
    const cacheKey = generateKey(...args);
    const cachedData = getCachedItem<T>(cacheKey);

    if (cachedData !== null) {
      return cachedData;
    }

    const result = await apiFunction(...args);
    setCacheItem(cacheKey, result, expiryTime);
    return result;
  };
}

// Set up regular cleanup of expired cache items
setInterval(clearExpiredCache, 5 * 60 * 1000); // Every 5 minutes