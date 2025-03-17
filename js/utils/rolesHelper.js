// This module provides helper functions to parse a role definition line and to lookup roles by name.

function getBracketContent(text) {
  // Extracts content between [ and ]
  const match = text.match(/\[([^\]]+)\]/);
  return match ? match[1] : '';
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
  // Example input: "- [SEGRETARIO | Il SEGRETARIO perpetuo]: "Figura burocratica...""  
  // 1. Extract the bracket content: "SEGRETARIO | Il SEGRETARIO perpetuo"
  const bracketContent = getBracketContent(rolesText);
  // 2. Split on the pipe symbol and trim each alias.
  const aliases = bracketContent.split('|').map(s => s.trim());
  // 3. Return an object with these aliases and the role description.
  return {
    aliases,
    description: getRoleDescription(rolesText)
  };
}

export function findRoleByName(name, rolesList) {
  // Convert user input to uppercase for case-insensitive matching.
  const search = name.toUpperCase();
  // Check each role's aliases.
  for (const role of rolesList) {
    for (const alias of role.aliases) {
      if (alias.toUpperCase() === search) {
        return role; // Found a match.
      }
    }
  }
  // If not found, return null.
  return null;
}
