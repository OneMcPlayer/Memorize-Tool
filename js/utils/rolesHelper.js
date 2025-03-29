// This module provides helper functions to parse a role definition line and to lookup roles by name.

function getBracketContent(text) {
  // Extracts content between [ and ]
  const match = text.match(/\[([^\]]+)\]/);
  return match ? match[1] : '';
}

function getPrimaryName(aliases) {
  // First alias is always the primary display name
  return aliases[0] || '';
}

function getRoleDescription(text) {
  // Returns the text after the colon, stripping out quotes.
  const colonIndex = text.indexOf(':');
  if (colonIndex !== -1) {
    return text.slice(colonIndex + 1).replace(/["]/g, '').trim();
  }
  return '';
}

export function parseRolesBlock(rolesText) {
  if (!rolesText) return []; // Return empty array for null/undefined/empty
  
  // Split the text by lines and parse each character line
  const lines = rolesText.split('\n');
  const roles = [];
  
  for (const line of lines) {
    if (line.trim() && !line.includes('CHARACTERS:')) {
      const match = line.match(/([A-Z]+)(?:\s*\[([^\]]+)\])?\s*-?\s*(.*)/);
      if (match) {
        const name = match[1].trim();
        const aliasStr = match[2] || '';
        const description = match[3].trim();
        const aliases = aliasStr ? aliasStr.split(',').map(a => a.trim()) : [];
        
        roles.push({
          name,
          aliases,
          description
        });
      }
    }
  }
  
  return roles;
}

export function findRoleByName(name, rolesList) {
  // Handle null/undefined inputs
  if (!name || !rolesList) return null;
  
  // Convert user input to uppercase for case-insensitive matching.
  const search = name.toUpperCase();
  
  // Check each role's name first
  for (const role of rolesList) {
    if (role.name.toUpperCase() === search) {
      return role;
    }
    
    // Then check aliases
    if (role.aliases.some(alias => alias.toUpperCase() === search)) {
      return role;
    }
  }
  
  // If not found, return null.
  return null;
}
