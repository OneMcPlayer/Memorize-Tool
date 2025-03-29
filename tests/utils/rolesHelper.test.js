import { parseRolesBlock, findRoleByName } from '../../js/utils/rolesHelper';

describe('Roles Helper', () => {
  describe('parseRolesBlock', () => {
    it('should parse a valid roles block correctly', () => {
      const rolesText = `CHARACTERS:
        HAMLET [Prince of Denmark] - A young prince grappling with his father's death
        GERTRUDE [Queen, Mother] - Hamlet's mother
        CLAUDIUS - The new king and Hamlet's uncle`;
      
      const roles = parseRolesBlock(rolesText);
      
      expect(roles).toHaveLength(3);
      expect(roles[0].name).toBe('HAMLET');
      expect(roles[0].aliases).toEqual(['Prince of Denmark']);
      expect(roles[0].description).toBe('A young prince grappling with his father\'s death');
      
      expect(roles[1].name).toBe('GERTRUDE');
      expect(roles[1].aliases).toEqual(['Queen', 'Mother']);
      expect(roles[1].description).toBe('Hamlet\'s mother');
      
      expect(roles[2].name).toBe('CLAUDIUS');
      expect(roles[2].aliases).toEqual([]);
      expect(roles[2].description).toBe('The new king and Hamlet\'s uncle');
    });

    it('should handle roles without aliases or descriptions', () => {
      const rolesText = `CHARACTERS:
        ROMEO
        JULIET - Young woman
        MERCUTIO []`;
      
      const roles = parseRolesBlock(rolesText);
      
      expect(roles).toHaveLength(3);
      expect(roles[0].name).toBe('ROMEO');
      expect(roles[0].aliases).toEqual([]);
      expect(roles[0].description).toBe('');
      
      expect(roles[1].name).toBe('JULIET');
      expect(roles[1].description).toBe('Young woman');
      
      expect(roles[2].name).toBe('MERCUTIO');
      expect(roles[2].aliases).toEqual([]);
    });

    it('should handle empty or invalid input', () => {
      expect(parseRolesBlock('')).toEqual([]);
      expect(parseRolesBlock(null)).toEqual([]);
      expect(parseRolesBlock(undefined)).toEqual([]);
    });
  });

  describe('findRoleByName', () => {
    const mockRoles = [
      { name: 'HAMLET', aliases: ['Prince', 'Son'] },
      { name: 'GERTRUDE', aliases: ['Queen', 'Mother'] },
      { name: 'GHOST', aliases: [] }
    ];

    it('should find role by exact name', () => {
      const result = findRoleByName('HAMLET', mockRoles);
      expect(result).toEqual(mockRoles[0]);
    });

    it('should find role by case-insensitive name', () => {
      const result = findRoleByName('hamlet', mockRoles);
      expect(result).toEqual(mockRoles[0]);
    });

    it('should find role by alias', () => {
      const result = findRoleByName('Queen', mockRoles);
      expect(result).toEqual(mockRoles[1]);
    });

    it('should return null for non-existent role', () => {
      const result = findRoleByName('HORATIO', mockRoles);
      expect(result).toBeNull();
    });

    it('should handle empty or invalid inputs', () => {
      expect(findRoleByName('', mockRoles)).toBeNull();
      expect(findRoleByName(null, mockRoles)).toBeNull();
      expect(findRoleByName('HAMLET', [])).toBeNull();
      expect(findRoleByName('HAMLET', null)).toBeNull();
    });
  });
});
