import { LocalCache } from '../../js/services/LocalCache';

// Mock localStorage properly for jest
beforeEach(() => {
  // Clear all instances and calls to constructor and all methods:
  jest.clearAllMocks();
  
  // Mock implementation
  const store = {};
  
  Object.defineProperty(global, 'localStorage', {
    value: {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => {
        store[key] = String(value);
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => {
          delete store[key];
        });
      }),
      _getStore: () => store  // Helper for tests
    },
    writable: true
  });
});

describe('LocalCache', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('set', () => {
    it('should store string values in localStorage', () => {
      LocalCache.set('testKey', 'testValue');
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'cache_testKey', 
        expect.stringContaining('"value":"testValue"')
      );
      
      const storedValue = localStorage._getStore()['cache_testKey'];
      expect(JSON.parse(storedValue)).toHaveProperty('value', 'testValue');
    });

    it('should store object values in localStorage', () => {
      const testObject = { name: 'test', value: 123 };
      LocalCache.set('testObject', testObject);
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'cache_testObject', 
        expect.stringContaining('"value":{"name":"test","value":123}')
      );
      
      const storedValue = localStorage._getStore()['cache_testObject'];
      expect(JSON.parse(storedValue).value).toEqual(testObject);
    });

    it('should handle errors by logging a warning', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      localStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });
      
      LocalCache.set('testKey', 'testValue');
      
      expect(consoleSpy).toHaveBeenCalledWith('Cache error: testKey', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('get', () => {
    it('should retrieve stored values from localStorage', () => {
      localStorage.getItem.mockReturnValueOnce(JSON.stringify({
        value: 'testValue',
        expiry: null
      }));
      
      const result = LocalCache.get('testKey');
      
      expect(localStorage.getItem).toHaveBeenCalledWith('cache_testKey');
      expect(result).toBe('testValue');
    });

    it('should retrieve and parse object values', () => {
      const testObject = { name: 'test', value: 123 };
      
      localStorage.getItem.mockReturnValueOnce(JSON.stringify({
        value: testObject,
        expiry: null
      }));
      
      const result = LocalCache.get('testObject');
      
      expect(result).toEqual(testObject);
    });

    it('should return null for non-existent keys', () => {
      const result = LocalCache.get('nonExistentKey');
      
      expect(result).toBeNull();
    });

    it('should return fallback value for non-existent keys when provided', () => {
      const fallback = { default: true };
      const result = LocalCache.get('nonExistentKey', fallback);
      
      expect(result).toBe(fallback);
    });

    it('should handle parsing errors by returning null', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      localStorage.getItem.mockReturnValueOnce('{invalid:json}');
      
      const result = LocalCache.get('invalidJson');
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cache retrieval error:'), expect.any(Error));
      expect(result).toBeNull();
      
      consoleSpy.mockRestore();
    });
  });

  describe('remove', () => {
    it('should remove item from localStorage', () => {
      localStorage.setItem('cache_testKey', 'testValue');
      
      LocalCache.remove('testKey');
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('cache_testKey');
    });
  });
});
