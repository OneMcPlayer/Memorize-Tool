/**
 * Utility class to convert plain text scripts to structured format
 */
export class ScriptConverter {
  /**
   * Convert a plain text script to structured format
   * @param {string} plainText - The plain text script
   * @param {Object} metadata - Script metadata (title, author, etc.)
   * @param {Array} roles - Array of role objects
   * @returns {string} - Structured format script
   */
  static convertToStructured(plainText, metadata, roles) {
    if (!plainText) return '';
    
    let structuredScript = '';
    
    // Add metadata
    if (metadata.title) {
      structuredScript += `@title "${metadata.title}"\n`;
    }
    if (metadata.author) {
      structuredScript += `@author "${metadata.author}"\n`;
    }
    if (metadata.date) {
      structuredScript += `@date "${metadata.date}"\n`;
    }
    if (metadata.description) {
      structuredScript += `@description "${metadata.description}"\n`;
    }
    
    structuredScript += '\n';
    
    // Add roles section
    structuredScript += '@roles\n';
    roles.forEach(role => {
      const aliasText = role.aliases.length > 1 
        ? role.aliases.join(' | ')
        : role.primaryName;
      
      structuredScript += `  - [${aliasText}]: "${role.description}"\n`;
    });
    structuredScript += '@endroles\n\n';
    
    // Add a default scene
    structuredScript += '@scene "Scene 1"\n{\n';
    structuredScript += '  location: "Default location"\n';
    structuredScript += '  time: "Default time"\n';
    structuredScript += '  mood: "Default mood"\n\n';
    
    // Add description
    structuredScript += '  description: """\n';
    structuredScript += '    Scene description goes here.\n';
    structuredScript += '  """\n\n';
    
    // Add dialogue section
    structuredScript += '  dialogue {\n';
    
    // Process the plain text into dialogue
    const lines = plainText.split('\n');
    let currentCharacter = null;
    let currentDialogue = [];
    
    const processCurrentDialogue = () => {
      if (currentCharacter && currentDialogue.length > 0) {
        structuredScript += `    "${currentCharacter}": """\n`;
        currentDialogue.forEach(line => {
          structuredScript += `      ${line}\n`;
        });
        structuredScript += `    """\n\n`;
        currentDialogue = [];
      }
    };
    
    lines.forEach(line => {
      line = line.trim();
      if (!line) return;
      
      // Check if line starts with a character name
      const characterMatch = line.match(/^([^:]+):\s*(.*)$/);
      
      if (characterMatch) {
        // Process previous dialogue if any
        processCurrentDialogue();
        
        currentCharacter = characterMatch[1].trim();
        const dialogueLine = characterMatch[2].trim();
        
        if (dialogueLine) {
          currentDialogue.push(dialogueLine);
        }
      } else if (line.startsWith('(') && line.endsWith(')')) {
        // Stage direction
        structuredScript += `    "@action": "${line}"\n\n`;
      } else if (currentCharacter) {
        // Continuation of previous character's dialogue
        currentDialogue.push(line);
      }
    });
    
    // Process any remaining dialogue
    processCurrentDialogue();
    
    // Close dialogue and scene
    structuredScript += '  }\n}\n';
    
    return structuredScript;
  }
  
  /**
   * Extract metadata from a plain text script
   * @param {string} plainText - The plain text script
   * @returns {Object} - Extracted metadata
   */
  static extractMetadata(plainText) {
    const metadata = {
      title: '',
      author: '',
      date: '',
      description: ''
    };
    
    // Try to extract title from first line if it looks like a title
    const lines = plainText.split('\n');
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (firstLine === firstLine.toUpperCase() && firstLine.length < 100) {
        metadata.title = firstLine;
      }
    }
    
    return metadata;
  }
}
