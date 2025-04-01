import { parseRolesBlock, findRoleByName } from '../../js/utils/rolesHelper.js';

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
});
