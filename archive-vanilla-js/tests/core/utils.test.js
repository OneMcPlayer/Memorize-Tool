import { getPlainText, createValidId } from '../../js/core/utils.js';

describe('Core Utils Module', () => {
  describe('getPlainText function', () => {
    test('should remove HTML tags from a string', () => {
      expect(getPlainText('<p>Hello world</p>')).toBe('Hello world');
      expect(getPlainText('<div><span>Test</span> text</div>')).toBe('Test text');
    });

    test('should handle complex HTML', () => {
      expect(getPlainText('<div class="container"><p>Paragraph <strong>with</strong> formatting</p></div>'))
        .toBe('Paragraph with formatting');
    });

    test('should handle null input', () => {
      expect(getPlainText(null)).toBe('');
    });

    test('should handle undefined input', () => {
      expect(getPlainText(undefined)).toBe('');
    });

    test('should trim whitespace', () => {
      expect(getPlainText('  <p>Text with spaces</p>  ')).toBe('Text with spaces');
    });
  });

  describe('createValidId function', () => {
    test('should convert spaces to underscores', () => {
      expect(createValidId('hello world')).toBe('hello_world');
    });

    test('should convert to lowercase', () => {
      expect(createValidId('HELLO WORLD')).toBe('hello_world');
    });

    test('should remove special characters', () => {
      expect(createValidId('hello!@#$%^&*()')).toBe('hello');
    });

    test('should handle multiple spaces', () => {
      expect(createValidId('hello   world')).toBe('hello_world');
    });

    test('should handle empty input', () => {
      expect(createValidId('')).toBe('');
    });

    test('should handle null input', () => {
      expect(createValidId(null)).toBe('');
    });
  });
});
