import { LocalCache } from '../../js/services/LocalCache';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    _getStore: () => store // Helper for tests
  };
})();

// Replace the global localStorage with our mock
global.localStorage = localStorageMock;

describe('LocalCache', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('set', () => {
    it('should store string values in localStorage', () => {
      LocalCache.set('testKey', 'testValue');
      
      expect(localStorage.setItem).toHaveBeenCalledWith('testKey', JSON.stringify('testValue'));
      expect(localStorage._getStore()['testKey']).toBe(JSON.stringify('testValue'));
    });

    it('should store object values in localStorage', () => {
      const testObject = { name: 'test', value: 123 };
      LocalCache.set('testObject', testObject);
      
      expect(localStorage.setItem).toHaveBeenCalledWith('testObject', JSON.stringify(testObject));
      expect(localStorage._getStore()['testObject']).toBe(JSON.stringify(testObject));
    });

    it('should handle errors by logging a warning', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock localStorage.setItem to throw an error
      localStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });
      
      LocalCache.set('testKey', 'testValue');
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cache error:'));
      
      consoleSpy.mockRestore();
    });
  });

  describe('get', () => {
    it('should retrieve stored values from localStorage', () => {
      localStorage.setItem('testKey', JSON.stringify('testValue'));
      
      const result = LocalCache.get('testKey');
      
      expect(localStorage.getItem).toHaveBeenCalledWith('testKey');
      expect(result).toBe('testValue');
    });

    it('should retrieve and parse object values', () => {
      const testObject = { name: 'test', value: 123 };
      localStorage.setItem('testObject', JSON.stringify(testObject));
      
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
      
      // Store invalid JSON
      localStorage.setItem('invalidJson', '{invalid:json}');
      
      const result = LocalCache.get('invalidJson');
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cache retrieval error:'));
      expect(result).toBeNull();
      
      consoleSpy.mockRestore();
    });
  });

  describe('remove', () => {
    it('should remove item from localStorage', () => {
      localStorage.setItem('testKey', 'testValue');
      
      LocalCache.remove('testKey');
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('testKey');
      expect(localStorage._getStore()['testKey']).toBeUndefined();
    });
  });
});
