import { parseRolesBlock, findRoleByName, parseStructuredRoles } from '../../js/utils/rolesHelper.js';

describe('RolesHelper Utils', () => {
  describe('parseRolesBlock function', () => {
    test('should parse simple role definitions', () => {
      const input = 'ROMEO - Young lover';
      const result = parseRolesBlock(input);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'ROMEO',
        aliases: [],
        description: 'Young lover'
      });
    });
    
    test('should parse multiple roles', () => {
      const input = 'ROMEO - Young lover\nJULIET - His beloved';
      const result = parseRolesBlock(input);
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('ROMEO');
      expect(result[1].name).toBe('JULIET');
    });
    
    test('should parse roles with aliases', () => {
      const input = 'ROMEO [ROM, R] - Young lover';
      const result = parseRolesBlock(input);
      
      expect(result[0].aliases).toEqual(['ROM', 'R']);
    });
    
    test('should handle no description', () => {
      const input = 'ROMEO';
      const result = parseRolesBlock(input);
      
      expect(result[0].description).toBe('');
    });
    
    test('should ignore CHARACTERS: header', () => {
      const input = 'CHARACTERS:\nROMEO - Young lover';
      const result = parseRolesBlock(input);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('ROMEO');
    });
    
    test('should handle empty input', () => {
      expect(parseRolesBlock('')).toEqual([]);
      expect(parseRolesBlock(null)).toEqual([]);
      expect(parseRolesBlock(undefined)).toEqual([]);
    });
  });
  
  describe('findRoleByName function', () => {
    const rolesList = [
      { name: 'ROMEO', aliases: ['ROM', 'R'], description: 'Young lover' },
      { name: 'JULIET', aliases: ['JUL', 'J'], description: 'His beloved' }
    ];
    
    test('should find role by primary name', () => {
      const result = findRoleByName('ROMEO', rolesList);
      expect(result).toEqual(rolesList[0]);
    });
    
    test('should find role by alias', () => {
      const result = findRoleByName('ROM', rolesList);
      expect(result).toEqual(rolesList[0]);
    });
    
    test('should be case-insensitive', () => {
      const result = findRoleByName('romeo', rolesList);
      expect(result).toEqual(rolesList[0]);
    });
    
    test('should return null for non-existent role', () => {
      const result = findRoleByName('MERCUTIO', rolesList);
      expect(result).toBeNull();
    });
    
    test('should handle null/undefined inputs', () => {
      expect(findRoleByName(null, rolesList)).toBeNull();
      expect(findRoleByName(undefined, rolesList)).toBeNull();
      expect(findRoleByName('ROMEO', null)).toBeNull();
      expect(findRoleByName('ROMEO', undefined)).toBeNull();
    });
  });

  describe('parseStructuredRoles function', () => {
    test('should parse roles from structured format', () => {
      const input = `@roles
ROMEO: "Young lover"
JULIET: "His beloved"
@endroles`;

      const result = parseStructuredRoles(input);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'ROMEO',
        aliases: [],
        description: 'Young lover'
      });
      expect(result[1]).toEqual({
        name: 'JULIET',
        aliases: [],
        description: 'His beloved'
      });
    });

    test('should parse roles with aliases in structured format', () => {
      const input = `@roles
ROMEO [ROM, R]: "Young lover"
JULIET [JUL, J]: "His beloved"
@endroles`;

      const result = parseStructuredRoles(input);
      
      expect(result).toHaveLength(2);
      expect(result[0].aliases).toEqual(['ROM', 'R']);
      expect(result[1].aliases).toEqual(['JUL', 'J']);
    });

    test('should handle roles without descriptions', () => {
      const input = `@roles
ROMEO: ""
JULIET: ""
@endroles`;

      const result = parseStructuredRoles(input);
      
      expect(result).toHaveLength(2);
      expect(result[0].description).toBe('');
      expect(result[1].description).toBe('');
    });

    test('should handle mixed formats of roles', () => {
      const input = `@roles
ROMEO [ROM]: "Young lover"
JULIET: "His beloved"
MERCUTIO: ""
@endroles`;

      const result = parseStructuredRoles(input);
      
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('ROMEO');
      expect(result[0].aliases).toEqual(['ROM']);
      expect(result[1].name).toBe('JULIET');
      expect(result[1].aliases).toEqual([]);
      expect(result[2].name).toBe('MERCUTIO');
      expect(result[2].description).toBe('');
    });

    test('should extract roles from real script example', () => {
      const input = `@roles
CECILIA: "Moglie di Tito"
TITO: "Marito di Cecilia"
BATTISTA: "Il domestico"
AVVOCATO_BIANCHI [BIANCHI]: "Avvocato"
AVVOCATO_NERI [NERI]: "Avvocato"
@endroles`;

      const result = parseStructuredRoles(input);
      
      expect(result).toHaveLength(5);
      
      // Check specific roles
      const battista = result.find(r => r.name === 'BATTISTA');
      expect(battista).toBeDefined();
      expect(battista.description).toBe('Il domestico');
      expect(battista.aliases).toEqual([]);
      
      // Check role with alias
      const bianchi = result.find(r => r.name === 'AVVOCATO_BIANCHI');
      expect(bianchi).toBeDefined();
      expect(bianchi.description).toBe('Avvocato');
      expect(bianchi.aliases).toEqual(['BIANCHI']);
    });

    test('should handle empty or invalid input', () => {
      expect(parseStructuredRoles('')).toEqual([]);
      expect(parseStructuredRoles(null)).toEqual([]);
      expect(parseStructuredRoles(undefined)).toEqual([]);
      
      // Invalid format without @roles tags
      const invalid = `ROMEO: "Young lover"
JULIET: "His beloved"`;
      expect(parseStructuredRoles(invalid)).toEqual([]);
    });

    test('should handle multiline descriptions', () => {
      const input = `@roles
ROMEO: "Young lover
from Verona"
JULIET: "His beloved
from the Capulet family"
@endroles`;

      const result = parseStructuredRoles(input);
      
      expect(result).toHaveLength(2);
      expect(result[0].description).toBe('Young lover\nfrom Verona');
      expect(result[1].description).toBe('His beloved\nfrom the Capulet family');
    });
  });
});
