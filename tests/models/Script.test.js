import { Script } from '../../js/models/Script.js';

// Mock the imported module
jest.mock('/Memorize-Tool/js/utils/rolesHelper.js', () => ({
  parseRolesBlock: jest.fn((line) => {
    // Simple mock implementation that returns a role object
    const parts = line.split(':');
    return {
      name: parts[0]?.trim() || '',
      description: parts[1]?.trim() || '',
      aliases: parts[0]?.trim() ? [parts[0].trim()] : []
    };
  })
}));

describe('Script Model', () => {
  describe('parse method', () => {
    test('should handle empty input', () => {
      const result = Script.parse('');
      expect(result).toEqual({
        title: '',
        roles: [],
        lines: []
      });
    });
    
    test('should parse script title', () => {
      const input = 'TITLE: Romeo and Juliet';
      const result = Script.parse(input);
      expect(result.title).toBe('Romeo and Juliet');
    });
    
    test('should parse character definitions', () => {
      const input = `TITLE: Test Play
CHARACTERS:
ROMEO - Young lover
JULIET - His beloved`;
      const result = Script.parse(input);
      
      expect(result.roles).toHaveLength(2);
      expect(result.roles[0]).toEqual({ name: 'ROMEO', description: 'Young lover' });
      expect(result.roles[1]).toEqual({ name: 'JULIET', description: 'His beloved' });
    });
    
    test('should parse character dialog', () => {
      const input = `TITLE: Test Dialog
CHARACTERS:
ROMEO - Young lover
JULIET - His beloved

ROMEO: But soft, what light through yonder window breaks?
JULIET: O Romeo, Romeo! wherefore art thou Romeo?`;
      
      const result = Script.parse(input);
      
      expect(result.lines).toHaveLength(2);
      expect(result.lines[0]).toEqual({
        character: 'ROMEO',
        text: 'But soft, what light through yonder window breaks?',
        dialog: 'But soft, what light through yonder window breaks?',
        isSceneHeading: false,
        isDirection: false
      });
      expect(result.lines[1]).toEqual({
        character: 'JULIET',
        text: 'O Romeo, Romeo! wherefore art thou Romeo?',
        dialog: 'O Romeo, Romeo! wherefore art thou Romeo?',
        isSceneHeading: false,
        isDirection: false
      });
    });
    
    test('should parse scene headings', () => {
      const input = `TITLE: Test Play
CHARACTERS:
ROMEO - Young lover
JULIET - His beloved

ACT 1
SCENE 1

ROMEO: Hello there!`;
      
      const result = Script.parse(input);
      
      expect(result.lines).toHaveLength(3);
      expect(result.lines[0]).toEqual({
        character: null,
        text: 'ACT 1',
        isSceneHeading: true,
        isDirection: false
      });
      expect(result.lines[1]).toEqual({
        character: null,
        text: 'SCENE 1',
        isSceneHeading: true,
        isDirection: false
      });
    });
    
    test('should parse stage directions', () => {
      const input = `TITLE: Test Play
CHARACTERS:
ROMEO - Young lover
JULIET - His beloved

[Romeo enters from stage left]
ROMEO: Hello there!
[Juliet appears at the balcony]`;
      
      const result = Script.parse(input);
      
      expect(result.lines).toHaveLength(3);
      expect(result.lines[0]).toEqual({
        character: null,
        text: '[Romeo enters from stage left]',
        isSceneHeading: false,
        isDirection: true
      });
      expect(result.lines[2]).toEqual({
        character: null,
        text: '[Juliet appears at the balcony]',
        isSceneHeading: false,
        isDirection: true
      });
    });
    
    test('should handle multiline dialog', () => {
      const input = `TITLE: Test Play
CHARACTERS:
ROMEO - Young lover

ROMEO: This is the first line of dialog.
And this is the second line that should be joined.
And even a third line for good measure.`;
      
      const result = Script.parse(input);
      
      expect(result.lines).toHaveLength(1);
      expect(result.lines[0]).toEqual({
        character: 'ROMEO',
        text: 'This is the first line of dialog. And this is the second line that should be joined. And even a third line for good measure.',
        dialog: 'This is the first line of dialog. And this is the second line that should be joined. And even a third line for good measure.',
        isSceneHeading: false,
        isDirection: false
      });
    });
  });

  describe('fromStructuredText method', () => {
    test('should parse basic structured script format', () => {
      const input = `@title "Hamlet"
@author "William Shakespeare"
@date "1601"

@roles
HAMLET: The Prince of Denmark {alias: HAM, HAM.}
OPHELIA: Hamlet's love interest {alias: OPH.}
@endroles

@scene "Castle Ramparts" {
  location: "Elsinore Castle"
  time: "Night"
  description: """A cold night on the castle walls"""
  
  dialogue {
    "HAMLET": """To be or not to be, that is the question."""
    "OPHELIA": """My lord, how does your honor?"""
  }
}`;
      
      const script = Script.fromStructuredText(input);
      
      expect(script.metadata).toEqual({
        title: 'Hamlet',
        author: 'William Shakespeare',
        date: '1601'
      });
      
      expect(script.text).toBe(input);
      
      expect(script.scenes).toHaveLength(1);
      expect(script.scenes[0].title).toBe('Castle Ramparts');
      expect(script.scenes[0].context.location).toBe('Elsinore Castle');
      expect(script.scenes[0].context.time).toBe('Night');
      expect(script.scenes[0].description).toBe('A cold night on the castle walls');
      
      expect(script.scenes[0].dialogue.HAMLET).toContain('To be or not to be, that is the question.');
      expect(script.scenes[0].dialogue.OPHELIA).toContain('My lord, how does your honor?');
    });
  });
});
