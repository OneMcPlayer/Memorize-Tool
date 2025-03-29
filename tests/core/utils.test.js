import { getPlainText, createValidId } from '../../js/core/utils';

describe('Core Utils', () => {
  describe('getPlainText', () => {
    it('should return text without HTML tags', () => {
      const htmlText = '<div>Hello <span>World</span></div>';
      expect(getPlainText(htmlText)).toBe('Hello World');
    });

    it('should handle text without HTML tags', () => {
      const plainText = 'Hello World';
      expect(getPlainText(plainText)).toBe('Hello World');
    });

    it('should handle empty strings', () => {
      expect(getPlainText('')).toBe('');
    });

    it('should handle null and undefined', () => {
      expect(getPlainText(null)).toBe('');
      expect(getPlainText(undefined)).toBe('');
    });
  });

  describe('createValidId', () => {
    it('should replace spaces with underscores', () => {
      expect(createValidId('hello world')).toBe('hello_world');
    });

    it('should remove special characters', () => {
      expect(createValidId('hello!@#$%^&*()world')).toBe('helloworld');
    });

    it('should convert to lowercase', () => {
      expect(createValidId('HelloWorld')).toBe('helloworld');
    });

    it('should handle empty strings', () => {
      expect(createValidId('')).toBe('');
    });
  });
});
