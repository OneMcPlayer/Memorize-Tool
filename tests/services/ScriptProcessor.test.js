import { ScriptProcessor } from '../../js/services/ScriptProcessor';

describe('ScriptProcessor', () => {
  beforeEach(() => {
    // Spy on console methods
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Tests for preProcessScript method
  describe('preProcessScript', () => {
    test('should handle empty script text', () => {
      const result = ScriptProcessor.preProcessScript('');
      expect(result).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith('Empty script text provided to preprocessor');
    });

    test('should normalize line endings and excessive blank lines', () => {
      const script = 'Line 1\r\n\r\n\r\nLine 2';
      const result = ScriptProcessor.preProcessScript(script);
      expect(result).toEqual(['Line 1', 'Line 2']);
    });

    test('should process standard character dialogue format', () => {
      const script = 'JOHN: Hello there.\nMARY: Hi John!';
      const result = ScriptProcessor.preProcessScript(script);
      expect(result).toEqual(['JOHN: Hello there.', 'MARY: Hi John!']);
    });

    test('should handle stage directions in parentheses', () => {
      const script = 'JOHN: Hello there.\n(John walks to the door)\nMARY: Hi John!';
      const result = ScriptProcessor.preProcessScript(script);
      expect(result).toEqual(['JOHN: Hello there.', '(John walks to the door)', 'MARY: Hi John!']);
    });

    test('should convert square bracket stage directions to parentheses', () => {
      const script = 'JOHN: Hello there.\n[John walks to the door]\nMARY: Hi John!';
      const result = ScriptProcessor.preProcessScript(script);
      expect(result).toEqual(['JOHN: Hello there.', '(John walks to the door)', 'MARY: Hi John!']);
    });

    test('should handle multiline stage directions', () => {
      const script = 'JOHN: Hello there.\n(John walks to the\ndoor and opens it)\nMARY: Hi John!';
      const result = ScriptProcessor.preProcessScript(script);
      expect(result).toEqual([
        'JOHN: Hello there.',
        '(John walks to the',
        'door and opens it)',
        'MARY: Hi John!'
      ]);
    });

    test('should process structured format with quoted character names', () => {
      const script = '"JOHN": """Hello there."""\n"MARY": """Hi John!"""';
      const result = ScriptProcessor.preProcessScript(script);
      expect(result).toEqual(['JOHN: Hello there.', 'MARY: Hi John!']);
    });

    test('should handle Italian script conventions', () => {
      const script = 'Sig. ROSSI: Buongiorno!\nProf. BIANCHI: Come stai?';
      const result = ScriptProcessor.preProcessScript(script);
      expect(result).toEqual(['Sig. ROSSI: Buongiorno!', 'Prof. BIANCHI: Come stai?']);
    });

    test('should use aggressive detection when option enabled', () => {
      const script = 'JOHN\nHello there.\nMARY\nHi John!';
      const result = ScriptProcessor.preProcessScript(script, { aggressiveDetection: true });
      expect(result).toEqual(['JOHN: Hello there.', 'MARY: Hi John!']);
    });

    test('should handle character names without dialogue', () => {
      const script = 'JOHN:\nMARY: Hi John!';
      const result = ScriptProcessor.preProcessScript(script);
      expect(result).toEqual(['JOHN: ', 'MARY: Hi John!']);
    });

    test('should handle continued dialogue on subsequent lines', () => {
      const script = 'JOHN: Hello there.\nHow are you doing today?\nMARY: I\'m good.';
      const result = ScriptProcessor.preProcessScript(script);
      expect(result).toEqual(['JOHN: Hello there.', 'How are you doing today: ?', 'MARY: I\'m good.']);
    });

    test('should handle line joining with proper spacing', () => {
      const script = 'JOHN: Hello-\nthere.\nMARY: I\'m good.';
      const result = ScriptProcessor.preProcessScript(script);
      expect(result).toEqual(['JOHN: Hello-there.', 'MARY: I\'m good.']);
    });
  });

  // Tests for extractCharacterLines method
  describe('extractCharacterLines', () => {
    const sampleScript = [
      'JOHN: Hello there.',
      '(John walks to the door)',
      'MARY: Hi John!',
      'JOHN: How are you?',
      'JACK: I\'m here too.'
    ];

    test('should handle empty script lines', () => {
      const result = ScriptProcessor.extractCharacterLines([], 'JOHN');
      expect(result).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith('No script lines provided for character extraction');
    });

    test('should handle missing character data', () => {
      const result = ScriptProcessor.extractCharacterLines(sampleScript, null);
      expect(result).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith('No character data provided for extraction');
    });

    test('should extract character lines by string name', () => {
      const result = ScriptProcessor.extractCharacterLines(sampleScript, 'JOHN');
      expect(result).toHaveLength(2);
      expect(result[0].line).toBe('JOHN: Hello there.');
      expect(result[1].line).toBe('JOHN: How are you?');
    });

    test('should extract character lines by array of aliases', () => {
      const result = ScriptProcessor.extractCharacterLines(sampleScript, ['JOHN', 'JOHNNY']);
      expect(result).toHaveLength(2);
      expect(result[0].line).toBe('JOHN: Hello there.');
      expect(result[1].line).toBe('JOHN: How are you?');
    });

    test('should extract character lines by character object with aliases', () => {
      const character = {
        primaryName: 'JOHN',
        aliases: ['JOHNNY', 'J']
      };
      const result = ScriptProcessor.extractCharacterLines(sampleScript, character);
      expect(result).toHaveLength(2);
      expect(result[0].line).toBe('JOHN: Hello there.');
      expect(result[1].line).toBe('JOHN: How are you?');
    });

    test('should handle invalid character data', () => {
      expect(() => {
        ScriptProcessor.extractCharacterLines(sampleScript, { invalid: 'format' });
      }).toThrow('Invalid character data provided');
    });

    test('should extract speaker name from the line', () => {
      const result = ScriptProcessor.extractCharacterLines(sampleScript, 'JOHN');
      expect(result[0].speaker).toBe('JOHN');
      expect(result[1].speaker).toBe('JOHN');
    });

    test('should return empty array if no character lines match', () => {
      const result = ScriptProcessor.extractCharacterLines(sampleScript, 'NONEXISTENT');
      expect(result).toEqual([]);
    });
  });

  // Tests for extractRolesFromPlainText method
  describe('extractRolesFromPlainText', () => {
    test('should handle empty script lines', () => {
      const result = ScriptProcessor.extractRolesFromPlainText([]);
      expect(result).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith('No script lines provided for role extraction');
    });

    test('should identify roles from character dialogue format', () => {
      const scriptLines = [
        'JOHN: Hello there.',
        'MARY: Hi John!',
        'JACK: I\'m here too.'
      ];
      const result = ScriptProcessor.extractRolesFromPlainText(scriptLines);
      expect(result).toHaveLength(3);
      expect(result.map(r => r.primaryName)).toContain('JOHN');
      expect(result.map(r => r.primaryName)).toContain('MARY');
      expect(result.map(r => r.primaryName)).toContain('JACK');
    });

    test('should identify roles from standalone character names', () => {
      const scriptLines = [
        'JOHN',
        'Hello there.',
        'MARY',
        'Hi John!'
      ];
      const result = ScriptProcessor.extractRolesFromPlainText(scriptLines);
      expect(result.map(r => r.primaryName)).toContain('JOHN');
      expect(result.map(r => r.primaryName)).toContain('MARY');
    });

    test('should skip stage directions', () => {
      const scriptLines = [
        'JOHN: Hello there.',
        '(John walks to the door)',
        'entra MARY',
        'MARY: Hi John!'
      ];
      const result = ScriptProcessor.extractRolesFromPlainText(scriptLines);
      expect(result).toHaveLength(2);
      expect(result.map(r => r.primaryName)).toContain('JOHN');
      expect(result.map(r => r.primaryName)).toContain('MARY');
    });

    test('should identify roles from comma-separated names', () => {
      const scriptLines = [
        'JOHN, MARY, JACK'
      ];
      const result = ScriptProcessor.extractRolesFromPlainText(scriptLines);
      expect(result).toHaveLength(3);
      expect(result.map(r => r.primaryName)).toContain('JOHN');
      expect(result.map(r => r.primaryName)).toContain('MARY');
      expect(result.map(r => r.primaryName)).toContain('JACK');
    });

    test('should identify roles from "and" or "e" separated names', () => {
      const scriptLines = [
        'JOHN and MARY',
        'JACK e JILL'
      ];
      const result = ScriptProcessor.extractRolesFromPlainText(scriptLines);
      expect(result).toHaveLength(4);
      expect(result.map(r => r.primaryName)).toContain('JOHN');
      expect(result.map(r => r.primaryName)).toContain('MARY');
      expect(result.map(r => r.primaryName)).toContain('JACK');
      expect(result.map(r => r.primaryName)).toContain('JILL');
    });

    test('should skip act/scene markers and other common script elements', () => {
      const scriptLines = [
        'ACT I',
        'SCENE 1',
        'JOHN: Hello there.',
        'sipario',
        'ATTO SECONDO',
        'MARY: Hi John!'
      ];
      const result = ScriptProcessor.extractRolesFromPlainText(scriptLines);
      expect(result).toHaveLength(2);
      expect(result.map(r => r.primaryName)).toContain('JOHN');
      expect(result.map(r => r.primaryName)).toContain('MARY');
    });
  });
});