import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

/**
 * In-memory cache for storing API responses
 */
const cache = new Map();

/**
 * Custom hook for data fetching with caching, error handling, and retries
 * 
 * @param {string|string[]} url - URL or array of fallback URLs to fetch data from
 * @param {Object} options - Configuration options
 * @param {boolean} options.enableCache - Whether to use caching (default: true)
 * @param {number} options.cacheTime - Cache duration in milliseconds (default: 60000 - 1 minute)
 * @param {any} options.initialData - Initial data to use before fetch completes
 * @param {number} options.retries - Number of retry attempts for failed requests (default: 1)
 * @param {number} options.retryDelay - Delay between retries in milliseconds (default: 1000)
 * @param {Array} options.dependencies - Array of dependencies that trigger a refetch when changed
 * @returns {Object} { data, loading, error, refetch, clearCache }
 */
export const useFetch = (url, options = {}) => {
  const {
    enableCache = true,
    cacheTime = 60000, // 1 minute default
    initialData = null,
    retries = 1,
    retryDelay = 1000,
    dependencies = []
  } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Use refs to prevent issues with stale closures in callbacks
  const urlRef = useRef(url);
  const optionsRef = useRef(options);
  const retriesLeftRef = useRef(retries);
  
  // Update refs when inputs change
  useEffect(() => {
    urlRef.current = url;
    optionsRef.current = options;
    retriesLeftRef.current = retries;
  }, [url, options, retries]);
  
  // Helper to get the effective URL (handles URL arrays)
  const getEffectiveUrl = useCallback(() => {
    return Array.isArray(urlRef.current) ? urlRef.current[0] : urlRef.current;
  }, []);
  
  // Cache key generation function
  const getCacheKey = useCallback((urlToUse) => {
    return `${urlToUse}`;
  }, []);
  
  // Check if cache entry is still valid
  const isCacheValid = useCallback((cacheEntry) => {
    return (
      cacheEntry &&
      (Date.now() - cacheEntry.timestamp < optionsRef.current.cacheTime)
    );
  }, []);
  
  // Clear cache for a specific URL or all cache if no URL provided
  const clearCache = useCallback((urlToClear) => {
    if (urlToClear) {
      cache.delete(getCacheKey(urlToClear));
    } else {
      const effectiveUrl = getEffectiveUrl();
      cache.delete(getCacheKey(effectiveUrl));
    }
  }, [getCacheKey, getEffectiveUrl]);
  
  // Main fetch function
  const fetchData = useCallback(async (isRefetch = false) => {
    const urls = Array.isArray(urlRef.current) ? urlRef.current : [urlRef.current];
    
    if (!urls.length || !urls[0]) {
      setLoading(false);
      return;
    }
    
    // If not forcing a refetch, check cache first
    if (!isRefetch && optionsRef.current.enableCache) {
      const effectiveUrl = getEffectiveUrl();
      const cacheKey = getCacheKey(effectiveUrl);
      const cacheEntry = cache.get(cacheKey);
      
      if (isCacheValid(cacheEntry)) {
        setData(cacheEntry.data);
        setLoading(false);
        setError(null);
        return;
      }
    }
    
    setLoading(true);
    
    // Create an abort controller to cancel requests when needed
    const controller = new AbortController();
    const { signal } = controller;
    
    let fetchError = null;
    
    // Try each URL in the array until one succeeds
    for (let i = 0; i < urls.length; i++) {
      const currentUrl = urls[i];
      if (!currentUrl) continue;
      
      try {
        const response = await axios.get(currentUrl, {
          signal,
          ...optionsRef.current.axiosConfig
        });
        
        // Store in cache if enabled
        if (optionsRef.current.enableCache) {
          const cacheKey = getCacheKey(currentUrl);
          cache.set(cacheKey, {
            data: response.data,
            timestamp: Date.now()
          });
        }
        
        if (!signal.aborted) {
          setData(response.data);
          setLoading(false);
          setError(null);
        }
        
        return; // Success, exit loop
      } catch (err) {
        // Only track error if not aborted and it's the last URL
        if (!signal.aborted) {
          fetchError = err;
          
          // If it's not the last URL, try the next one
          if (i < urls.length - 1) {
            continue;
          }
          
          // If we've tried all URLs and have retries left, retry after delay
          if (retriesLeftRef.current > 0) {
            retriesLeftRef.current--;
            await new Promise(resolve => setTimeout(resolve, optionsRef.current.retryDelay));
            i = -1; // Reset to try the first URL again (it will be incremented to 0 in the loop)
            continue;
          }
          
          // No more retries, set error
          setError(err.message || 'Failed to fetch data');
          setLoading(false);
        }
      }
    }
    
    return () => {
      controller.abort();
    };
  }, [getEffectiveUrl, getCacheKey, isCacheValid]);
  
  // Expose refetch method
  const refetch = useCallback(() => {
    return fetchData(true); // Force refetch
  }, [fetchData]);
  
  // Fetch data when dependencies change
  useEffect(() => {
    const cleanup = fetchData();
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [fetchData, ...dependencies]);
  
  return { data, loading, error, refetch, clearCache };
};

export default useFetch; 