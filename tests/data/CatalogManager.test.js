import { CatalogManager } from '../../js/data/CatalogManager';

describe('CatalogManager', () => {
  describe('validateCatalogEntry', () => {
    it('should validate a correct catalog entry', () => {
      const validEntry = {
        title: 'Hamlet',
        format: 'structured',
        path: './scripts/hamlet.script'
      };
      
      expect(CatalogManager.validateCatalogEntry(validEntry)).toBe(true);
    });

    it('should validate a catalog entry with plain format', () => {
      const validEntry = {
        title: 'Hamlet',
        format: 'plain',
        path: './scripts/hamlet.txt'
      };
      
      expect(CatalogManager.validateCatalogEntry(validEntry)).toBe(true);
    });

    it('should reject an entry with missing title', () => {
      const invalidEntry = {
        format: 'structured',
        path: './scripts/hamlet.script'
      };
      
      expect(CatalogManager.validateCatalogEntry(invalidEntry)).toBe(false);
    });

    it('should reject an entry with missing format', () => {
      const invalidEntry = {
        title: 'Hamlet',
        path: './scripts/hamlet.script'
      };
      
      expect(CatalogManager.validateCatalogEntry(invalidEntry)).toBe(false);
    });

    it('should reject an entry with missing path', () => {
      const invalidEntry = {
        title: 'Hamlet',
        format: 'structured'
      };
      
      expect(CatalogManager.validateCatalogEntry(invalidEntry)).toBe(false);
    });

    it('should reject an entry with invalid format value', () => {
      const invalidEntry = {
        title: 'Hamlet',
        format: 'unknown',
        path: './scripts/hamlet.script'
      };
      
      expect(CatalogManager.validateCatalogEntry(invalidEntry)).toBe(false);
    });

    it('should reject null or undefined', () => {
      expect(CatalogManager.validateCatalogEntry(null)).toBe(false);
      expect(CatalogManager.validateCatalogEntry(undefined)).toBe(false);
    });
  });

  describe('sanitizePath', () => {
    it('should leave a path with ./ prefix unchanged', () => {
      const path = './scripts/hamlet.script';
      expect(CatalogManager.sanitizePath(path)).toBe(path);
    });

    it('should add ./ prefix to a path without it', () => {
      const path = 'scripts/hamlet.script';
      expect(CatalogManager.sanitizePath(path)).toBe('./scripts/hamlet.script');
    });

    it('should handle empty string', () => {
      expect(CatalogManager.sanitizePath('')).toBe('./');
    });
  });
});
