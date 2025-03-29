import { Script } from '../../js/models/Script';

describe('Script Model', () => {
  describe('parse', () => {  // Renamed from parseUniScript
    it('should parse a basic script with characters and dialog', () => {
      const script = `TITLE: Test Play
CHARACTERS:
ALICE - Main character
BOB - Supporting character

ACT 1
SCENE 1

ALICE: Hello there!
BOB: Hi Alice, how are you?
ALICE: I'm doing well, thank you.`;

      const result = Script.parse(script);
      
      expect(result.title).toBe('Test Play');
      expect(result.roles).toHaveLength(2);
      expect(result.roles[0].name).toBe('ALICE');
      expect(result.roles[1].name).toBe('BOB');
      
      expect(result.lines).toHaveLength(3);
      expect(result.lines[0].character).toBe('ALICE');
      expect(result.lines[0].text).toBe('Hello there!');
      expect(result.lines[1].character).toBe('BOB');
      expect(result.lines[2].character).toBe('ALICE');
    });

    it('should handle stage directions and scene markers', () => {
      const script = `TITLE: Directions Test
CHARACTERS:
ALICE

SCENE 1

[Alice enters from stage left]
ALICE: Hello audience!
[She bows dramatically]

SCENE 2

[Spotlight on Alice]
ALICE: Thank you for watching!`;

      const result = Script.parse(script);
      
      expect(result.lines).toHaveLength(5);
      
      // Check for stage directions
      expect(result.lines[0].character).toBe(null);
      expect(result.lines[0].text).toBe('[Alice enters from stage left]');
      expect(result.lines[0].isDirection).toBe(true);
      
      expect(result.lines[1].character).toBe('ALICE');
      expect(result.lines[1].text).toBe('Hello audience!');
      
      expect(result.lines[2].character).toBe(null);
      expect(result.lines[2].isDirection).toBe(true);
      
      // Scene marker should register correctly
      expect(result.lines[3].character).toBe(null);
      expect(result.lines[3].text).toBe('SCENE 2');
      expect(result.lines[3].isSceneHeading).toBe(true);
    });

    it('should handle multiline dialog', () => {
      const script = `TITLE: Multiline Test
CHARACTERS:
HAMLET

HAMLET: To be, or not to be, that is the question:
Whether 'tis nobler in the mind to suffer
The slings and arrows of outrageous fortune,
Or to take arms against a sea of troubles
And by opposing end them.`;

      const result = Script.parse(script);
      
      expect(result.lines).toHaveLength(1);
      expect(result.lines[0].character).toBe('HAMLET');
      expect(result.lines[0].text).toContain('To be, or not to be');
      expect(result.lines[0].text).toContain('And by opposing end them.');
      expect(result.lines[0].text.split('\n')).toHaveLength(5);
    });

    it('should handle empty or invalid input', () => {
      expect(Script.parse('')).toEqual({
        title: '',
        roles: [],
        lines: []
      });
      
      expect(Script.parse(null)).toEqual({
        title: '',
        roles: [],
        lines: []
      });
    });
  });
});
