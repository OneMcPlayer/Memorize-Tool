/**
 * LocalCache provides a service for caching data in localStorage with expiration
 */
export class LocalCache {
  /**
   * Get an item from the cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if not found/expired
   */
  static get(key) {
    try {
      const cacheKey = `cache_${key}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (!cachedData) return null;
      
      const { value, expiry } = JSON.parse(cachedData);
      
      // Check if cache has expired
      if (expiry && expiry < Date.now()) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      return value;
    } catch (error) {
      console.warn(`Error retrieving from cache: ${key}`, error);
      return null;
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
      console.warn(`Error storing in cache: ${key}`, error);
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
    // Only clear keys that start with 'cache_'
    Object.keys(localStorage)
      .filter(key => key.startsWith('cache_'))
      .forEach(key => localStorage.removeItem(key));
  }
  
  /**
   * Purge expired items from the cache
   * @returns {number} - Number of purged items
   */
  static purgeExpired() {
    let purgedCount = 0;
    
    Object.keys(localStorage)
      .filter(key => key.startsWith('cache_'))
      .forEach(key => {
        try {
          const cachedData = JSON.parse(localStorage.getItem(key));
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
