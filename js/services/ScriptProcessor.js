export class ScriptProcessor {
  static preProcessScript(scriptText, options = {}) {
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
    let inCharacterDialogue = false; // New flag to track if we're in a character's dialogue section
    
    // Enhanced detection when aggressive mode is enabled
    const aggressiveDetection = options.aggressiveDetection || false;
    
    // Additional patterns for aggressive detection mode
    const aggressiveCharacterPattern = /^([A-Z][A-Za-z0-9_\s''\-\.]+)(?:\s*)(?:\(.*\))?$/;
    
    // Enhanced pattern for italian script conventions
    const italianNamePattern = /^(?:(?:Sig\.(?:ra|na)?|Dott\.(?:ssa)?|Prof\.(?:ssa)?)\s+)?([A-Z][A-Za-z0-9_\s''\-\.]+)(?:\s*:?\s*)(.*)/;
    
    // Pattern to detect character names - needs to be used multiple times, so defined once
    const characterPattern = /^([A-Z][A-Za-z0-9_\s''\-\.]+)(?:\s*:?\s*)(.*)/;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      if (!line) {
        if (currentLine) {
          processedLines.push(currentLine);
          currentLine = '';
          inCharacterDialogue = false; // End dialogue section on blank line
        }
        continue;
      }

      // Handle stage directions (both single and multiline)
      if ((line.startsWith('(') || line.startsWith('[')) && !isMultilineStageDirection) {
        isStageDirection = true;
        isMultilineStageDirection = !(line.endsWith(')') || line.endsWith(']'));
      }

      if (isStageDirection) {
        if (currentLine) {
          processedLines.push(currentLine);
          currentLine = '';
          inCharacterDialogue = false; // End dialogue section on stage direction
        }
        // Convert all stage direction formats to standard parentheses
        if (line.startsWith('[') && line.endsWith(']')) {
          line = '(' + line.substring(1, line.length - 1) + ')';
        }
        processedLines.push(line);
        
        if (line.endsWith(')') || line.endsWith(']')) {
          isStageDirection = false;
        }
        continue;
      }

      // New handling for structured format with quoted character names
      const structuredMatch = line.match(/^"([^"]+)":\s*"""(.*)$/);
      if (structuredMatch && !isStageDirection) {
        if (currentLine) {
          processedLines.push(currentLine);
        }
        
        lastCharacterName = structuredMatch[1].trim();
        // Create a simplified format line instead of preserving quotes
        currentLine = `${lastCharacterName}: ${structuredMatch[2].replace(/"""/g, '')}`;
        inCharacterDialogue = true; // Start a new dialogue section
      } 
      // More robust character name matching with improved handling for uppercase names
      // This pattern looks for uppercase character names followed by a colon or continuing dialog
      else {
        const characterMatch = line.match(characterPattern);
        const italianMatch = line.match(italianNamePattern);
        
        // For aggressive mode, check for standalone uppercase names without colon
        const aggressiveMatch = aggressiveDetection && !characterMatch ? 
          line.match(aggressiveCharacterPattern) : null;
        
        // Check if this line starts a new character's dialogue
        if ((characterMatch || aggressiveMatch || italianMatch) && !isStageDirection) {
          // Only end previous character's dialogue if there was one
          if (currentLine) {
            processedLines.push(currentLine);
          }
          
          inCharacterDialogue = false; // Reset for the new character
          
          if (characterMatch) {
            lastCharacterName = characterMatch[1].trim();
            // For lines with a clear character: dialogue format
            if (characterMatch[2].trim() || line.includes(':')) {
              currentLine = `${lastCharacterName}: ${characterMatch[2].trim()}`;
              inCharacterDialogue = true;
            } else {
              // This is likely just a character name alone on a line
              // In aggressive mode, we'll treat the next line as dialogue if it's not a character name
              currentLine = lastCharacterName;
              
              // Look ahead to see if next line continues the dialogue
              if (aggressiveDetection && i + 1 < lines.length) {
                const nextLine = lines[i + 1].trim();
                // If next line doesn't match a character pattern, treat it as dialogue for this character
                if (nextLine && !nextLine.match(/^[A-Z][A-Za-z0-9_\s''\-\.]+(?:\s*:)/) 
                    && !nextLine.startsWith('(') && !nextLine.startsWith('"') 
                    && !nextLine.startsWith('[')) {
                  currentLine = `${lastCharacterName}: ${nextLine}`;
                  inCharacterDialogue = true;
                  i++; // Skip the next line since we've used it
                } else if (!nextLine || nextLine.length === 0) {
                  // If the next line is empty, just make this a character name with empty dialogue
                  currentLine = `${lastCharacterName}: `;
                  inCharacterDialogue = true;
                }
              }
            }
          } else if (italianMatch) {
            lastCharacterName = italianMatch[1].trim();
            // For lines with Italian-style character names
            if (italianMatch[2].trim() || line.includes(':')) {
              currentLine = `${lastCharacterName}: ${italianMatch[2].trim()}`;
              inCharacterDialogue = true;
            } else {
              currentLine = `${lastCharacterName}: `;
              inCharacterDialogue = true;
            }
          } else if (aggressiveMatch) {
            // Treat standalone uppercase line as a character name
            lastCharacterName = aggressiveMatch[1].trim();
            
            // Look ahead to see if next line is the dialogue
            if (i + 1 < lines.length) {
              const nextLine = lines[i + 1].trim();
              // If next line doesn't look like a character name, treat it as dialogue
              if (nextLine && !nextLine.match(/^[A-Z][A-Za-z0-9_\s''\-\.]+(?:\s*:)/) 
                  && !nextLine.startsWith('(') && !nextLine.startsWith('"')
                  && !nextLine.startsWith('[')) {
                currentLine = `${lastCharacterName}: ${nextLine}`;
                inCharacterDialogue = true;
                i++; // Skip the next line since we've used it
              } else {
                // Just save the character name with empty dialogue
                currentLine = `${lastCharacterName}: `;
                inCharacterDialogue = true;
              }
            } else {
              // End of script, just save the character name
              currentLine = `${lastCharacterName}: `;
              inCharacterDialogue = true;
            }
          }
        } else {
          if (currentLine && inCharacterDialogue) {
            // If we're in a continuing dialogue, append this line to the current dialogue
            // Fixed: This is the key part that fixes the dialogue continuation issue
            const shouldAddSpace = 
              !currentLine.endsWith('-') && 
              !currentLine.endsWith('(') && 
              !currentLine.endsWith('[') && 
              !line.startsWith(')') &&
              !line.startsWith(']') &&
              !currentLine.endsWith(' ');
              
            const connector = shouldAddSpace ? ' ' : '';
            
            // Handle terminating triple quotes in structured format
            if (line.includes('"""') && !line.startsWith('"""')) {
              // Only include text before the closing quotes
              const textBeforeClosing = line.split('"""')[0];
              currentLine += connector + textBeforeClosing;
              processedLines.push(currentLine);
              currentLine = '';
              inCharacterDialogue = false;
            } else if (line === '"""') {
              // If the line is just closing quotes, finish the current line
              processedLines.push(currentLine);
              currentLine = '';
              inCharacterDialogue = false;
            } else {
              // Continue the dialogue with the current line
              currentLine += connector + line;
            }
          } else if (lastCharacterName && !isStageDirection) {
            // This is likely a continuation of the last character's dialogue after some interruption
            currentLine = `${lastCharacterName}: ${line}`;
            inCharacterDialogue = true;
          } else {
            // This is just a line without a character associated
            currentLine = line;
          }
        }
      }

      // Check if multiline stage direction is ending
      if (isMultilineStageDirection && (line.includes(')') || line.includes(']'))) {
        isMultilineStageDirection = false;
      }
      
      // Check if stage direction is ending
      if ((line.endsWith(')') || line.endsWith(']')) && !isMultilineStageDirection) {
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
    
    // Simplified pattern - now we just look for the character name followed by colon
    // regardless of script format
    const regexPattern = `^\\s*(${escapedAliases.join('|')})\\s*:`;
    
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
    
    // Improved extraction logic
    let previousLine = '';
    let inDialogue = false;
    
    for (let i = 0; i < scriptLines.length; i++) {
      const line = scriptLines[i].trim();
      if (!line || skipPatterns.some(pattern => pattern.test(line))) {
        inDialogue = false;
        previousLine = line;
        continue;
      }

      const namePatterns = [
        /^([A-Z][A-Za-z0-9_\s''.\-]+):\s*/, // Name with colon followed by text
        /^(Sig\.(?:ra|na)?|Dott\.(?:ssa)?|Prof\.(?:ssa)?)\s+([A-Z][A-Za-z0-9_\s''.\-]+):\s*/, // Italian title + name
        /^([A-Z][A-Za-z0-9_\s''.\-]+(?:\s*(?:,|e|and)\s*[A-Z][A-Za-z0-9_\s''.\-]+)+)$/ // List of names
      ];

      // More accurate standalone name pattern
      // Checks for context to confirm it's actually a character name
      let isStandaloneCharacterName = false;
      if (/^[A-Z][A-Za-z0-9_\s''.\-]+$/.test(line)) {
        // It's an uppercase name, but we need more evidence it's a character
        // Check the next line to see if it's likely dialogue
        if (i + 1 < scriptLines.length) {
          const nextLine = scriptLines[i + 1].trim();
          // If next line isn't a character name, stage direction, or empty line,
          // this is likely a character name followed by dialogue
          if (nextLine && 
              !nextLine.match(/^[A-Z][A-Za-z0-9_\s''.\-]+:/) &&
              !nextLine.match(/^[A-Z][A-Za-z0-9_\s''.\-]+$/) &&
              !nextLine.startsWith('(') && 
              !nextLine.startsWith('[') &&
              !skipPatterns.some(pattern => pattern.test(nextLine))) {
            isStandaloneCharacterName = true;
          }
        }
      }

      let foundCharacter = false;
      
      // Check for character with colon first (most reliable pattern)
      for (const pattern of namePatterns) {
        const match = line.match(pattern);
        if (match) {
          // If it's the Italian title pattern, combine title and name
          if (pattern.toString().includes('Sig')) {
            addRole(match[1] + ' ' + match[2]);
          } 
          // Check for multiple names (separated by commas, 'e', or 'and')
          else if (match[1].includes(',') || match[1].includes(' e ') || match[1].includes(' and ')) {
            match[1].split(/(?:\s*,\s*|\s+e\s+|\s+and\s+)/).forEach(name => addRole(name));
          } else {
            addRole(match[1]);
          }
          foundCharacter = true;
          inDialogue = pattern.toString().includes(':');
          break;
        }
      }

      // If no character found via patterns but we identified a standalone name
      if (!foundCharacter && isStandaloneCharacterName) {
        addRole(line);
        inDialogue = true;
      }
      
      previousLine = line;
    }
    
    // Convert map to array for compatibility with existing code
    return Array.from(rolesMap.values());
  }
}
