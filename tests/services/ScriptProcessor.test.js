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

    // New tests for Italian script processing
    test('should handle Italian script titles and scene descriptions', () => {
      const script = 'VISITA DI CONDOGLIANZE\nLa scena rappresenta un salotto durante una visita di condoglianze.';
      const result = ScriptProcessor.preProcessScript(script);
      expect(result[0]).toBe('VISITA DI CONDOGLIANZE');
      expect(result[1]).toBe('(La scena rappresenta un salotto durante una visita di condoglianze.)');
    });

    test('should properly handle Italian character titles', () => {
      const script = 'SIGNORA PELAEZ: Siamo nati per soffrire.\nSIGNORA RIDABELLA: E\' quello che dicevo io un momento fa a Teresa.';
      const result = ScriptProcessor.preProcessScript(script);
      expect(result).toEqual([
        'SIGNORA PELAEZ: Siamo nati per soffrire.',
        'SIGNORA RIDABELLA: E\' quello che dicevo io un momento fa a Teresa.'
      ]);
    });

    test('should handle Italian stage directions like "Detti, Poi, etc."', () => {
      const script = 'TERESA: Grazie, grazie.\nDetti e Osvaldo.\nOSVALDO: Signora Teresa!';
      const result = ScriptProcessor.preProcessScript(script);
      expect(result).toEqual([
        'TERESA: Grazie, grazie.',
        '(Detti e Osvaldo.)',
        'OSVALDO: Signora Teresa!'
      ]);
    });

    test('should detect character entrances and exits in Italian', () => {
      const script = 'Entra un\'altra visitatrice, la signora Celeste.\nCELESTE: Povero signor Paolo!';
      const result = ScriptProcessor.preProcessScript(script);
      expect(result).toEqual([
        '(Entra un\'altra visitatrice, la signora Celeste.)',
        'CELESTE: Povero signor Paolo!'
      ]);
    });

    test('should handle complex stage directions', () => {
      const script = 'TERESA (al signor Pelaez): Anche tu piangevi per De Magisti?';
      const result = ScriptProcessor.preProcessScript(script);
      expect(result[0]).toBe('TERESA (al signor Pelaez): Anche tu piangevi per De Magisti?');
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

    test('should extract character lines with preceding context', () => {
      const sampleScript = [
        'JOHN: Hello there.',
        '(John walks to the door)',
        'MARY: Hi John!',
        'JOHN: How are you?',
        'JACK: I\'m here too.'
      ];
      const result = ScriptProcessor.extractCharacterLines(sampleScript, 'JOHN', 1);
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        line: '(John walks to the door)',
        isPreceding: true
      });
      expect(result[1]).toMatchObject({
        line: 'JOHN: How are you?',
        isPreceding: false
      });
    });

    test('should handle Italian character names with titles', () => {
      const sampleScript = [
        'SIGNORA PELAEZ: Siamo nati per soffrire.',
        'RIDABELLA: E\' quello che dicevo io un momento fa a Teresa.',
        'SIGNORA PELAEZ: Anche mio marito conosceva appena il povero Paolo.',
        'TERESA: Grazie, grazie.'
      ];
      const result = ScriptProcessor.extractCharacterLines(sampleScript, 'SIGNORA PELAEZ');
      expect(result).toHaveLength(2);
      expect(result[0].line).toBe('SIGNORA PELAEZ: Siamo nati per soffrire.');
      expect(result[1].line).toBe('SIGNORA PELAEZ: Anche mio marito conosceva appena il povero Paolo.');
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

    test('should extract roles from an Italian character list section', () => {
      const scriptLines = [
        'Personaggi:',
        'TERESA - Padrona di casa e vedova',
        'SIGNORA RIDABELLA - Sua amica',
        'SIGNORA PELAEZ - Visitatrice',
        'PELAEZ - Suo marito'
      ];
      const result = ScriptProcessor.extractRolesFromPlainText(scriptLines);
      expect(result).toHaveLength(4);
      expect(result.map(r => r.primaryName)).toContain('TERESA');
      expect(result.map(r => r.primaryName)).toContain('SIGNORA RIDABELLA');
      expect(result.map(r => r.primaryName)).toContain('SIGNORA PELAEZ');
      expect(result.map(r => r.primaryName)).toContain('PELAEZ');
      
      // Check descriptions
      const teresa = result.find(r => r.primaryName === 'TERESA');
      expect(teresa.description).toBe('Padrona di casa e vedova');
    });

    test('should identify titled characters from Italian scripts', () => {
      const scriptLines = [
        'SIGNORA PELAEZ: Siamo nati per soffrire.',
        'Sig. ROSSI: Buongiorno!',
        'Prof. BIANCHI: Come stai?'
      ];
      const result = ScriptProcessor.extractRolesFromPlainText(scriptLines);
      expect(result).toHaveLength(3);
      
      const pelaez = result.find(r => r.primaryName === 'SIGNORA PELAEZ');
      expect(pelaez.isTitled).toBe(true);
      
      const rossi = result.find(r => r.primaryName === 'Sig. ROSSI');
      expect(rossi.isTitled).toBe(true);
    });
  });

  // Tests for parseNonStructuredScript method
  describe('parseNonStructuredScript', () => {
    test('should handle empty input', () => {
      const result = ScriptProcessor.parseNonStructuredScript('');
      expect(result).toEqual({
        title: '',
        metadata: {
          title: '',
          author: '',
          date: '',
          description: ''
        },
        roles: [],
        lines: []
      });
    });

    test('should extract metadata from Italian scripts', () => {
      const script = 'VISITA DI CONDOGLIANZE\nLa scena rappresenta un salotto durante una visita di condoglianze.';
      const result = ScriptProcessor.parseNonStructuredScript(script);
      expect(result.title).toBe('VISITA DI CONDOGLIANZE');
      expect(result.metadata.description).toContain('La scena rappresenta un salotto');
    });

    test('should extract roles and structured lines from complex scripts', () => {
      const script = `VISITA DI CONDOGLIANZE
La scena rappresenta un salotto durante una visita di condoglianze.

TERESA: Grazie per essere venuti.
SIGNORA PELAEZ: Siamo nati per soffrire.
(Teresa piange silenziosamente)
RIDABELLA: E' quello che dicevo io un momento fa a Teresa.`;

      const result = ScriptProcessor.parseNonStructuredScript(script);
      
      // Check roles extraction
      expect(result.roles.length).toBeGreaterThanOrEqual(3);
      expect(result.roles.map(r => r.primaryName)).toContain('TERESA');
      expect(result.roles.map(r => r.primaryName)).toContain('SIGNORA PELAEZ');
      expect(result.roles.map(r => r.primaryName)).toContain('RIDABELLA');
      
      // Check structured lines
      const dialogLines = result.lines.filter(l => l.character !== null);
      expect(dialogLines.length).toBe(3);
      
      // Check stage direction
      const stageDirections = result.lines.filter(l => l.isDirection);
      expect(stageDirections.length).toBeGreaterThanOrEqual(1);
    });
  });

  // Tests for extractScenes method
  describe('extractScenes', () => {
    test('should handle basic scene extraction', () => {
      const processedLines = [
        'ACT 1',
        'SCENE 1',
        'JOHN: Hello there.',
        'MARY: Hi John!',
        'SCENE 2',
        'JOHN: How are you?',
        'JACK: I\'m here too.'
      ];
      
      const result = ScriptProcessor.extractScenes(processedLines);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('SCENE 1');
      expect(result[0].lines).toHaveLength(2);
      expect(result[1].title).toBe('SCENE 2');
      expect(result[1].lines).toHaveLength(2);
    });

    test('should extract scene descriptions', () => {
      const processedLines = [
        'ACT 1',
        'SCENE 1',
        'La scena rappresenta un salotto.',
        'LOCATION: Rome',
        'TIME: Morning',
        'JOHN: Hello there.',
        'MARY: Hi John!'
      ];
      
      const result = ScriptProcessor.extractScenes(processedLines);
      expect(result[0].description).toBe('La scena rappresenta un salotto.');
      expect(result[0].location).toBe('Rome');
      expect(result[0].time).toBe('Morning');
    });

    test('should handle Italian act/scene markers', () => {
      const processedLines = [
        'ATTO PRIMO',
        'SCENA 1',
        'TERESA: Grazie per essere venuti.',
        'ATTO SECONDO',
        'SCENA 1',
        'SIGNORA PELAEZ: Siamo nati per soffrire.'
      ];
      
      const result = ScriptProcessor.extractScenes(processedLines);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('SCENA 1');
      expect(result[1].title).toBe('SCENA 1');
    });

    test('should create a single scene if no scene markers present', () => {
      const processedLines = [
        'JOHN: Hello there.',
        'MARY: Hi John!',
        'JOHN: How are you?'
      ];
      
      const result = ScriptProcessor.extractScenes(processedLines);
      expect(result).toHaveLength(1);
      expect(result[0].lines).toHaveLength(3);
    });
  });

  // Test for processing a complete Italian theater script
  describe('complete Italian script processing', () => {
    test('should process a fragment of complex Italian theater script', () => {
      const italianScriptFragment = `VISITA DI CONDOGLIANZE  
La scena rappresenta un salotto durante una visita di condoglianze. Divano al 
centro. Poltrone e sedie intorno. All'alzarsi del sipario è seduta sul divano la signora 
Teresa, padrona di casa e vedova da qualche giorno di Paolo.

La Cameriera introduce due nuovi visitatori, i coniugi Pelaez.  

Teresa, la signora Ridabella, la signora Celeste, i Pelaez. Poi la 
signora Jone un momento. 

SIGNORA PELAEZ: Siamo nati per soffrire.    

RIDABELLA: E' quello che dicevo io un momento fa a Teresa. Le parole precise. 

SIGNORA PELAEZ: Anche mio marito conosceva appena il povero Paolo, eppure 
gli è dispiaciuto tanto. 

TERESA (al signor Pelaez): Grazie, grazie.`;

      // Process the script
      const processedLines = ScriptProcessor.preProcessScript(italianScriptFragment, { aggressiveDetection: true });
      
      // Verify key lines were processed correctly
      expect(processedLines).toContain('VISITA DI CONDOGLIANZE');
      expect(processedLines.some(line => line.startsWith('(La scena rappresenta'))).toBe(true);
      expect(processedLines.some(line => line.startsWith('(La Cameriera introduce'))).toBe(true);
      expect(processedLines.some(line => line === '(Teresa, la signora Ridabella, la signora Celeste, i Pelaez. Poi la signora Jone un momento.)')).toBe(true);
      expect(processedLines).toContain('SIGNORA PELAEZ: Siamo nati per soffrire.');
      expect(processedLines).toContain('RIDABELLA: E\' quello che dicevo io un momento fa a Teresa. Le parole precise.');
      expect(processedLines).toContain('SIGNORA PELAEZ: Anche mio marito conosceva appena il povero Paolo, eppure gli è dispiaciuto tanto.');
      expect(processedLines).toContain('TERESA (al signor Pelaez): Grazie, grazie.');
      
      // Extract roles
      const roles = ScriptProcessor.extractRolesFromPlainText(processedLines);
      
      // Verify main characters were extracted
      const characterNames = roles.map(r => r.primaryName);
      expect(characterNames).toContain('TERESA');
      expect(characterNames).toContain('SIGNORA PELAEZ');
      expect(characterNames).toContain('RIDABELLA');
      
      // Parse the full script structure
      const parsedScript = ScriptProcessor.parseNonStructuredScript(italianScriptFragment);
      
      // Check title and metadata
      expect(parsedScript.title).toBe('VISITA DI CONDOGLIANZE');
      expect(parsedScript.metadata.description).toContain('salotto durante una visita di condoglianze');
      
      // Check character lines
      const teresaLines = parsedScript.lines.filter(l => l.character === 'TERESA');
      const pelaezLines = parsedScript.lines.filter(l => l.character === 'SIGNORA PELAEZ');
      
      expect(teresaLines.length).toBeGreaterThan(0);
      expect(pelaezLines.length).toBeGreaterThan(0);
    });
  });
});