/**
 * LocalCache provides a service for caching data in localStorage with expiration
 */
export class LocalCache {
  /**
   * Get an item from the cache
   * @param {string} key - Cache key
   * @param {any} fallback - Optional fallback value if not found
   * @returns {any|null} - Cached value or null if not found/expired
   */
  static get(key, fallback = null) {
    try {
      const cacheKey = `cache_${key}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (!cachedData) return fallback;
      
      const { value, expiry } = JSON.parse(cachedData);
      
      // Check if cache has expired
      if (expiry && expiry < Date.now()) {
        localStorage.removeItem(cacheKey);
        return fallback;
      }
      
      return value;
    } catch (error) {
      console.warn(`Cache retrieval error: ${key}`, error);
      return fallback;
    }
  }
  
  /**
   * Store an item in the cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlMinutes - Time to live in minutes (0 for no expiry)
   * @returns {boolean} - Success status
   */
  static set(key, value, ttlMinutes = 60) {
    try {
      const cacheKey = `cache_${key}`;
      const expiry = ttlMinutes > 0 ? Date.now() + (ttlMinutes * 60 * 1000) : null;
      
      localStorage.setItem(cacheKey, JSON.stringify({
        value,
        expiry
      }));
      
      return true;
    } catch (error) {
      console.warn(`Cache error: ${key}`, error);
      return false;
    }
  }
  
  /**
   * Remove an item from the cache
   * @param {string} key - Cache key to remove
   */
  static remove(key) {
    localStorage.removeItem(`cache_${key}`);
  }
  
  /**
   * Clear all cached items
   */
  static clear() {
    // Get all keys first to avoid issues with deleting while iterating
    const keysToRemove = Object.keys(localStorage)
      .filter(key => key.startsWith('cache_'));
      
    // Then remove each key
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
  
  /**
   * Purge expired items from the cache
   * @returns {number} - Number of purged items
   */
  static purgeExpired() {
    let purgedCount = 0;
    
    // Get all keys first to avoid issues with deleting while iterating
    const keysToCheck = Object.keys(localStorage)
      .filter(key => key.startsWith('cache_'));
    
    // Then check and remove expired items
    keysToCheck.forEach(key => {
      try {
        const item = localStorage.getItem(key);
        if (!item) return;
        
        const cachedData = JSON.parse(item);
        
        if (cachedData.expiry && cachedData.expiry < Date.now()) {
          localStorage.removeItem(key);
          purgedCount++;
        }
      } catch (error) {
        // If we can't parse the item, it's probably corrupted, so remove it
        localStorage.removeItem(key);
        purgedCount++;
      }
    });
      
    return purgedCount;
  }
}
