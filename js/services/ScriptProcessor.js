export class ScriptProcessor {
  static preProcessScript(scriptText) {
    if (!scriptText) {
      console.warn('Empty script text provided to preprocessor');
      return [];
    }
    
    // Normalize line endings and remove excessive blank lines
    let text = scriptText.replace(/\r\n/g, '\n')
                        .replace(/\n{3,}/g, '\n\n');
    
    let lines = text.split('\n');
    let processedLines = [];
    let currentLine = '';
    let lastCharacterName = '';
    let isStageDirection = false;
    let isMultilineStageDirection = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      if (!line) {
        if (currentLine) {
          processedLines.push(currentLine);
          currentLine = '';
        }
        continue;
      }

      // Handle stage directions (both single and multiline)
      if (line.startsWith('(') && !isMultilineStageDirection) {
        isStageDirection = true;
        isMultilineStageDirection = !line.includes(')');
      }

      // More robust character name matching with improved handling for uppercase names
      // This pattern looks for uppercase character names followed by a colon or continuing dialog
      const characterMatch = line.match(/^([A-Z][A-Za-z0-9_\s''\-]+)(?:\s*:?\s*)(.*)/);
      
      if (characterMatch && !isStageDirection) {
        if (currentLine) {
          processedLines.push(currentLine);
        }
        
        lastCharacterName = characterMatch[1].trim();
        currentLine = `${lastCharacterName}: ${characterMatch[2]}`;
      } else {
        if (currentLine) {
          // Improved line joining logic
          const shouldAddSpace = 
            !currentLine.endsWith('-') && 
            !currentLine.endsWith('(') && 
            !line.startsWith(')') &&
            !currentLine.endsWith(' ');
            
          const connector = shouldAddSpace ? ' ' : '';
          currentLine += connector + line;
        } else if (lastCharacterName && !isStageDirection) {
          currentLine = `${lastCharacterName}: ${line}`;
        } else {
          currentLine = line;
        }
      }

      // Check if multiline stage direction is ending
      if (isMultilineStageDirection && line.includes(')')) {
        isMultilineStageDirection = false;
      }
      
      // Check if stage direction is ending
      if (line.endsWith(')') && !isMultilineStageDirection) {
        isStageDirection = false;
      }
    }

    if (currentLine) {
      processedLines.push(currentLine);
    }

    return processedLines;
  }

  static extractCharacterLines(scriptLines, characterData, precedingCount) {
    if (!scriptLines || !scriptLines.length) {
      console.warn('No script lines provided for character extraction');
      return [];
    }
    
    if (!characterData) {
      console.warn('No character data provided for extraction');
      return [];
    }
    
    // Handle either string, array, or object with aliases
    let characterAliases;
    if (typeof characterData === 'string') {
      characterAliases = [characterData];
    } else if (Array.isArray(characterData)) {
      characterAliases = characterData;
    } else if (characterData?.aliases) {
      // Use all aliases including primary name
      characterAliases = [characterData.primaryName, ...characterData.aliases];
    } else {
      throw new Error('Invalid character data provided');
    }
    
    // Filter out empty aliases
    characterAliases = characterAliases.filter(alias => alias && typeof alias === 'string');
    
    if (!characterAliases.length) {
      console.warn('No valid character aliases found');
      return [];
    }

    // Create regex pattern that matches any alias
    const escapedAliases = characterAliases.map(alias => 
      alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const regexPattern = `^\\s*(${escapedAliases.join('|')})\\s*:?`;
    const regex = new RegExp(regexPattern, "i");
    
    console.debug(`Character regex pattern: ${regexPattern}`);
    
    const extractedLines = [];
    for (let i = 0; i < scriptLines.length; i++) {
      if (regex.test(scriptLines[i])) {
        extractedLines.push({ 
          index: i, 
          line: scriptLines[i],
          speaker: scriptLines[i].match(/^([^:]+):/)?.[1]?.trim() || ''
        });
      }
    }
    
    console.debug(`Extracted ${extractedLines.length} lines for character`);
    return extractedLines;
  }

  /**
   * Extracts roles from an array of script lines.
   * 
   * @param {string[]} scriptLines - An array of strings representing lines from the script.
   * @returns {Array<{primaryName: string, aliases: string[], description: string}>} - An array of role objects
   */
  static extractRolesFromPlainText(scriptLines) {
    if (!scriptLines || !scriptLines.length) {
      console.warn('No script lines provided for role extraction');
      return [];
    }
    
    const rolesMap = new Map();
    
    const skipPatterns = [
      /^\(.*\)$/,                      // Stage directions
      /^(?:entra|esce|detti)/i,        // Stage directions in Italian
      /^la scena/i,                    // Scene descriptions in Italian
      /^(?:sipario|atto|scena)/i,      // Act/scene markers in Italian
      /^act|scene/i,                   // Act/scene markers in English
      /^enter|exit/i,                  // Enter/exit in English
    ];

    const addRole = (name) => {
      const cleanName = name.trim().replace(/\s+/g, ' ');
      if (!rolesMap.has(cleanName) && cleanName.length > 1) {
        rolesMap.set(cleanName, {
          primaryName: cleanName,
          aliases: [cleanName],
          description: ''
        });
      }
    };

    for (let i = 0; i < scriptLines.length; i++) {
      const line = scriptLines[i].trim();
      if (!line || skipPatterns.some(pattern => pattern.test(line))) {
        continue;
      }

      const namePatterns = [
        /^([A-Z][A-Za-z0-9_\s''.\-]+)(?=:)/,  // Name before colon
        /^([A-Z][A-Za-z0-9_\s''.\-]+)$/,      // Standalone all-caps name
        /^([A-Z][A-Za-z0-9_\s''.\-]+(?:\s*(?:,|e|and)\s*[A-Z][A-Za-z0-9_\s''.\-]+)+)$/ // List of names
      ];

      for (const pattern of namePatterns) {
        const match = line.match(pattern);
        if (match) {
          // Check for multiple names (separated by commas, 'e', or 'and')
          if (match[1].includes(',') || match[1].includes(' e ') || match[1].includes(' and ')) {
            match[1].split(/(?:\s*,\s*|\s+e\s+|\s+and\s+)/).forEach(name => addRole(name));
          } else {
            addRole(match[1]);
          }
          break;
        }
      }
    }
    
    // Convert map to array for compatibility with existing code
    return Array.from(rolesMap.values());
  }
}
