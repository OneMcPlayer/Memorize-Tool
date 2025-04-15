import Script from '../../js/models/Script.js';

// Mock the imported module
jest.mock('../../js/utils/rolesHelper.js', () => ({
  parseRolesBlock: jest.fn((line) => {
    // Simple mock implementation that returns a role object
    const parts = line.split(':');
    return {
      name: parts[0]?.trim() || '',
      description: parts[1]?.trim() || '',
      aliases: parts[0]?.trim() ? [parts[0].trim()] : []
    };
  }),
  parseStructuredRoles: jest.fn((text) => {
    // Add mock implementation for parseStructuredRoles
    const roles = [];
    const matches = text.match(/@roles[\s\S]*?@endroles/);
    if (matches) {
      const rolesSection = matches[0];
      const roleLines = rolesSection.split('\n').filter(line => line.includes(':'));
      for (const line of roleLines) {
        const [name, rest] = line.split(':');
        const aliasMatch = name.match(/\[(.*?)\]/);
        const cleanName = name.replace(/\[.*?\]/, '').trim();
        roles.push({
          name: cleanName,
          aliases: aliasMatch ? aliasMatch[1].split(',').map(a => a.trim()) : [],
          description: (rest || '').replace(/['"]/g, '').trim()
        });
      }
    }
    return roles;
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

    test('should parse basic structured script format with updated format', () => {
      const input = `@title "Hamlet"
@author "William Shakespeare"
@date "1601"

@roles
HAMLET: "The Prince of Denmark"
OPHELIA [OPH]: "Hamlet's love interest"
@endroles

@scene "Castle Ramparts"
{
  direction {
    """
    A cold night on the castle walls. Guards patrol nervously.
    """
  }
  
  section "I" {
    dialogue {
      "HAMLET": """
        To be or not to be, that is the question.
      """
      
      "OPHELIA": """
        My lord, how does your honor?
      """
    }
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
      expect(script.scenes[0].directions[0]).toContain('A cold night on the castle walls');
      
      const dialogues = script.scenes[0].sections[0].dialogues;
      expect(dialogues).toHaveLength(2);
      expect(dialogues[0].character).toBe('HAMLET');
      expect(dialogues[0].text.trim()).toBe('To be or not to be, that is the question.');
      expect(dialogues[1].character).toBe('OPHELIA');
      expect(dialogues[1].text.trim()).toBe('My lord, how does your honor?');
    });

    test('should parse script with multiple scenes and sections', () => {
      const input = `@title "Romeo e Giulietta"
@author "William Shakespeare"

@roles
ROMEO: "Giovane innamorato"
GIULIETTA: "Amata di Romeo"
MERCUZIO [MERC]: "Amico di Romeo"
@endroles

@scene "Giardino dei Capuleti"
{
  direction {
    """
    Un giardino illuminato dalla luna. Romeo è nascosto sotto il balcone.
    """
  }
  
  section "I" {
    dialogue {
      "ROMEO": """
        (guardando verso l'alto) Ma, cos'è quella luce alla finestra?
      """
    }
    
    direction {
      """
      Giulietta appare al balcone.
      """
    }
    
    dialogue {
      "GIULIETTA": """
        O Romeo, Romeo, perché sei tu Romeo?
      """
      
      "ROMEO": """
        (sussurrando) Parla ancora, angelo splendente!
      """
    }
  }
  
  section "II" {
    direction {
      """
      Entra Mercuzio dalla strada.
      """
    }
    
    dialogue {
      "MERCUZIO": """
        Romeo! Dove sei, amico mio?
      """
    }
  }
}

@scene "Piazza della città"
{
  direction {
    """
    Il mattino seguente. La piazza è affollata.
    """
  }
  
  section "I" {
    dialogue {
      "MERCUZIO": """
        Non hai dormito tutta la notte, Romeo?
      """
      
      "ROMEO": """
        Come potevo dormire con un cuore così pieno?
      """
    }
  }
}`;
      
      const script = Script.fromStructuredText(input);
      
      // Check basic metadata
      expect(script.metadata.title).toBe('Romeo e Giulietta');
      expect(script.metadata.author).toBe('William Shakespeare');
      
      // Check roles
      expect(script.roles).toHaveLength(3);
      const mercuzio = script.roles.find(r => r.primaryName === 'MERCUZIO');
      expect(mercuzio.aliases).toEqual(['MERC']);
      
      // Check scenes structure
      expect(script.scenes).toHaveLength(2);
      expect(script.scenes[0].title).toBe('Giardino dei Capuleti');
      expect(script.scenes[1].title).toBe('Piazza della città');
      
      // Check sections within first scene
      const firstScene = script.scenes[0];
      expect(firstScene.sections).toHaveLength(2);
      expect(firstScene.sections[0].title).toBe('I');
      expect(firstScene.sections[1].title).toBe('II');
      
      // Check dialogues in sections
      expect(firstScene.sections[0].dialogues).toHaveLength(3);
      expect(firstScene.sections[1].dialogues).toHaveLength(1);
      
      // Check specific dialogue content with stage directions
      const romeoLine = firstScene.sections[0].dialogues[0];
      expect(romeoLine.character).toBe('ROMEO');
      expect(romeoLine.text.trim()).toBe('(guardando verso l\'alto) Ma, cos\'è quella luce alla finestra?');
      expect(romeoLine.hasStageDirection).toBe(true);
      expect(romeoLine.stageDirection).toBe('guardando verso l\'alto');
      
      // Check second scene
      const secondScene = script.scenes[1];
      expect(secondScene.directions[0]).toContain('Il mattino seguente');
      expect(secondScene.sections[0].dialogues[0].character).toBe('MERCUZIO');
      expect(secondScene.sections[0].dialogues[1].character).toBe('ROMEO');
    });

    test('should parse an actual script format from scripts folder', () => {
      const input = `@title "CENTOCINQUANTA LA GALLINA CANTA"
@author "Achille Campanile"

@roles
CECILIA: "Moglie di Tito"
TITO: "Marito di Cecilia"
BATTISTA: "Il domestico"
@endroles

@scene "Salotto in casa di Tito"
{
  direction {
    """
    Tito ha la veste da camera e sfoglia un giornale. In fondo, Battista il domestico, in frac, sta impalato sotto la porta in attesa di ordini.
    """
  }
  
  section "I" {
    direction {
      """
      Cecilia, Tito, Battista.
      """
    }
    
    dialogue {
      "CECILIA": """
        (entrando in gran toletta, con un piccolo specchio in mano, nel quale si guarda) Andiamo?
      """
      
      "TITO": """
        (guarda l'orologio) È presto cara. Sono appena le nove e mezzo e per andare in casa dei vicini, basta mezzo minuto: si esce dalla nostra porta e s'infila la loro. Non amo arrivare primo ai ricevimenti.
      """
      
      "CECILIA": """
        E tu sai bene che io non voglio perdere le romanze che canterà Palewski.
      """
    }
  }
}`;
      
      const script = Script.fromStructuredText(input);
      
      // Check metadata
      expect(script.metadata.title).toBe('CENTOCINQUANTA LA GALLINA CANTA');
      expect(script.metadata.author).toBe('Achille Campanile');
      
      // Check roles
      expect(script.roles).toHaveLength(3);
      expect(script.roles.map(r => r.primaryName)).toContain('CECILIA');
      expect(script.roles.map(r => r.primaryName)).toContain('TITO');
      expect(script.roles.map(r => r.primaryName)).toContain('BATTISTA');
      
      // Check scene structure
      const scene = script.scenes[0];
      expect(scene.title).toBe('Salotto in casa di Tito');
      expect(scene.directions[0]).toContain('Tito ha la veste da camera');
      
      // Check section and dialogues
      const section = scene.sections[0];
      expect(section.title).toBe('I');
      expect(section.directions[0]).toContain('Cecilia, Tito, Battista.');
      
      // Check stage directions in dialogue
      const ceciliaLine = section.dialogues[0];
      expect(ceciliaLine.character).toBe('CECILIA');
      expect(ceciliaLine.hasStageDirection).toBe(true);
      expect(ceciliaLine.stageDirection).toContain('entrando in gran toletta');
      
      const titoLine = section.dialogues[1];
      expect(titoLine.character).toBe('TITO');
      expect(titoLine.text).toContain('È presto cara');
    });
  });

  describe('convertToStructuredFormat method', () => {
    test('should convert plain text script to structured format', () => {
      const input = `VISITA DI CONDOGLIANZE
      
La scena rappresenta un salotto durante una visita di condoglianze.

TERESA: Grazie per essere venuti.
SIGNORA PELAEZ: Siamo nati per soffrire.
(Teresa piange silenziosamente)
RIDABELLA: E' quello che dicevo io un momento fa a Teresa.`;
      
      const structuredText = Script.convertToStructuredFormat(input);
      
      // Check that the output contains structured format elements
      expect(structuredText).toMatch(/@title "VISITA DI CONDOGLIANZE"/);
      expect(structuredText).toMatch(/@roles/);
      expect(structuredText).toMatch(/TERESA: ""/);
      expect(structuredText).toMatch(/SIGNORA PELAEZ: ""/);
      expect(structuredText).toMatch(/RIDABELLA: ""/);
      expect(structuredText).toMatch(/@endroles/);
      
      // Check for scene section
      expect(structuredText).toMatch(/@scene/);
      expect(structuredText).toMatch(/direction {/);
      expect(structuredText).toMatch(/"""[\s\S]*La scena rappresenta un salotto/);
      
      // Check for dialogue
      expect(structuredText).toMatch(/dialogue {/);
      expect(structuredText).toMatch(/"TERESA": """/);
      expect(structuredText).toMatch(/Grazie per essere venuti/);
      expect(structuredText).toMatch(/"SIGNORA PELAEZ": """/);
      expect(structuredText).toMatch(/Siamo nati per soffrire/);
      
      // Check for stage directions in the structured output
      expect(structuredText).toMatch(/Teresa piange silenziosamente/);
    });

    test('should handle complex scripts with scene divisions', () => {
      const input = `ROMEO E GIULIETTA
      
ATTO I
SCENA 1 - Verona, una piazza pubblica

ROMEO: Buongiorno Mercuzio.
MERCUZIO: Ehi Romeo, sembri pensieroso quest'oggi.

SCENA 2 - Il giardino dei Capuleti

(Romeo si nasconde sotto il balcone)
GIULIETTA: (apparendo al balcone) O Romeo, Romeo, perché sei tu Romeo?`;
      
      const structuredText = Script.convertToStructuredFormat(input);
      
      // Check basic structure
      expect(structuredText).toMatch(/@title "ROMEO E GIULIETTA"/);
      expect(structuredText).toMatch(/@roles/);
      expect(structuredText).toMatch(/ROMEO: ""/);
      expect(structuredText).toMatch(/MERCUZIO: ""/);
      expect(structuredText).toMatch(/GIULIETTA: ""/);
      
      // Check for scene divisions
      expect(structuredText).toMatch(/@scene "ATTO I - SCENA 1"/);
      expect(structuredText).toMatch(/location: "Verona, una piazza pubblica"/);
      
      expect(structuredText).toMatch(/@scene "ATTO I - SCENA 2"/);
      expect(structuredText).toMatch(/location: "Il giardino dei Capuleti"/);
      
      // Check for stage directions
      expect(structuredText).toMatch(/Romeo si nasconde sotto il balcone/);
      expect(structuredText).toMatch(/apparendo al balcone/);
      
      // Check dialogue
      expect(structuredText).toMatch(/"ROMEO": """[\s\S]*Buongiorno Mercuzio/);
      expect(structuredText).toMatch(/"MERCUZIO": """[\s\S]*Ehi Romeo, sembri pensieroso quest'oggi/);
      expect(structuredText).toMatch(/"GIULIETTA": """[\s\S]*\(apparendo al balcone\) O Romeo, Romeo/);
    });
  });
});
