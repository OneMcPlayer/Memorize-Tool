/**
 * Tests for LocalCache service
 */
import { LocalCache } from '../../js/services/LocalCache.js';

describe('LocalCache Service', () => {
  // Mock localStorage
  const mockLocalStorage = (() => {
    let store = {};
    return {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => {
        store[key] = value.toString();
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        store = {};
      }),
      // Helper to access the mock storage directly in tests
      _store: () => store,
      _reset: () => {
        store = {};
        jest.clearAllMocks();
      }
    };
  })();

  // Replace the real localStorage with our mock
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  });

  // Reset mock before each test
  beforeEach(() => {
    mockLocalStorage._reset();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.warn.mockRestore();
  });

  describe('get method', () => {
    test('should retrieve cached item', () => {
      // Setup cache data
      const mockData = { value: 'test value', expiry: Date.now() + 60000 };
      mockLocalStorage.setItem('cache_testKey', JSON.stringify(mockData));
      
      // Test retrieval
      const result = LocalCache.get('testKey');
      expect(result).toBe('test value');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('cache_testKey');
    });

    test('should return fallback if key not found', () => {
      const fallback = { default: true };
      const result = LocalCache.get('nonexistentKey', fallback);
      expect(result).toBe(fallback);
    });

    test('should return fallback if cache expired', () => {
      // Set expired cache item (expiry time in the past)
      const expiredData = { value: 'expired data', expiry: Date.now() - 1000 };
      mockLocalStorage.setItem('cache_expiredKey', JSON.stringify(expiredData));
      
      const result = LocalCache.get('expiredKey', 'fallback');
      expect(result).toBe('fallback');
      // Should remove the expired item
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('cache_expiredKey');
    });

    test('should handle JSON parse error', () => {
      // Set invalid JSON
      mockLocalStorage.setItem('cache_invalidKey', 'invalid json{');
      
      const result = LocalCache.get('invalidKey', 'fallback');
      expect(result).toBe('fallback');
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('set method', () => {
    test('should store data in localStorage with expiry', () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockImplementation(() => now);
      
      const success = LocalCache.set('testKey', 'test value', 30);
      
      expect(success).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      
      // Verify the structure of saved data
      const savedData = JSON.parse(mockLocalStorage._store()['cache_testKey']);
      expect(savedData.value).toBe('test value');
      expect(savedData.expiry).toBe(now + 30 * 60 * 1000);
      
      Date.now.mockRestore();
    });

    test('should store data with no expiry when ttl is 0', () => {
      const success = LocalCache.set('noExpiryKey', 'forever', 0);
      
      expect(success).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      
      const savedData = JSON.parse(mockLocalStorage._store()['cache_noExpiryKey']);
      expect(savedData.value).toBe('forever');
      expect(savedData.expiry).toBeNull();
    });

    test('should handle storage errors', () => {
      // Mock setItem to throw an error
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full');
      });
      
      const success = LocalCache.set('errorKey', 'test');
      
      expect(success).toBe(false);
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('remove method', () => {
    test('should remove item from cache', () => {
      mockLocalStorage.setItem('cache_removeKey', JSON.stringify({ value: 'to be removed' }));
      
      LocalCache.remove('removeKey');
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('cache_removeKey');
      expect(mockLocalStorage._store()['cache_removeKey']).toBeUndefined();
    });
  });

  describe('clear method', () => {
    test('should clear only cache_ prefixed items', () => {
      // Set up mixed items
      mockLocalStorage.setItem('cache_item1', '"value1"');
      mockLocalStorage.setItem('cache_item2', '"value2"');
      mockLocalStorage.setItem('regular_item', '"should stay"');
      
      LocalCache.clear();
      
      // Verify cache items are removed but non-cache items remain
      expect(mockLocalStorage._store()['cache_item1']).toBeUndefined();
      expect(mockLocalStorage._store()['cache_item2']).toBeUndefined();
      expect(mockLocalStorage._store()['regular_item']).toBe('"should stay"');
    });
  });

  describe('purgeExpired method', () => {
    test('should remove only expired items', () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockImplementation(() => now);
      
      // Setup mix of expired and valid items
      mockLocalStorage.setItem('cache_expired1', JSON.stringify({ value: 'old', expiry: now - 1000 }));
      mockLocalStorage.setItem('cache_expired2', JSON.stringify({ value: 'old', expiry: now - 2000 }));
      mockLocalStorage.setItem('cache_valid', JSON.stringify({ value: 'fresh', expiry: now + 10000 }));
      mockLocalStorage.setItem('cache_noExpiry', JSON.stringify({ value: 'eternal', expiry: null }));
      mockLocalStorage.setItem('cache_invalid', 'not-json'); // Corrupted entry
      
      const purged = LocalCache.purgeExpired();
      
      expect(purged).toBe(3); // Two expired and one invalid
      
      // Verify correct items were removed
      expect(mockLocalStorage._store()['cache_expired1']).toBeUndefined();
      expect(mockLocalStorage._store()['cache_expired2']).toBeUndefined();
      expect(mockLocalStorage._store()['cache_invalid']).toBeUndefined();
      expect(mockLocalStorage._store()['cache_valid']).toBeDefined();
      expect(mockLocalStorage._store()['cache_noExpiry']).toBeDefined();
      
      Date.now.mockRestore();
    });
  });
});
