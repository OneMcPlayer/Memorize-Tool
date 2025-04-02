export class ScriptProcessor {
  /**
   * Main method for pre-processing script text into standardized format.
   * This is the central parsing function for non-structured scripts.
   * @param {string} scriptText - The raw script text
   * @param {object} options - Parsing options
   * @returns {string[]} - Processed script lines
   */
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
    let isSceneDescription = false; // Flag to identify scene descriptions
    let lastSceneHeading = ''; // Track the last scene heading for better context
    
    // Enhanced detection when aggressive mode is enabled
    const aggressiveDetection = options.aggressiveDetection || false;
    
    // Additional patterns for aggressive detection mode
    const aggressiveCharacterPattern = /^([A-Z][A-Za-z0-9_\s''\-\.]+)(?:\s*)(?:\(.*\))?$/;
    
    // Enhanced pattern for italian script conventions with more title variants
    const italianNamePattern = /^(?:(?:Sig\.(?:ra|na)?|Dott\.(?:ssa)?|Prof\.(?:ssa)?|SIGNOR(?:A|E|I)?|DOTTOR(?:E|ESSA)?|PROFESSOR(?:E|ESSA)?)\s+)?([A-Z][A-Za-z0-9_\s''\-\.]+)(?:\s*:?\s*)(.*)/i;
    
    // Pattern to detect character names - needs to be used multiple times, so defined once
    const characterPattern = /^([A-Z][A-Za-z0-9_\s''\-\.]+)(?:\s*:?\s*)(.*)/;

    // Pattern for scene headings like "La scena rappresenta..." or "The scene is set in..."
    const sceneDescPattern = /^(?:La\s+scena|The\s+scene|SCENA|SCENE|Il sipario si alza|Sipario)/i;
    
    // Pattern for character lists like "Characters: John, Mary, etc."
    const characterListPattern = /^(?:Characters|Personaggi|PERSONAGGI|CHARACTERS|Dramatis\s+Personae):/i;
    
    // Pattern for Italian act/scene markers
    const actSceneMarkerPattern = /^(?:ATTO|SCENA|ATTO\s+[\w]+(?:,|\s)\s*SCENA\s+[\w]+)/i;
    
    // Better handling for stage directions in various formats
    const possibleStageDirectionsPattern = /^(?:Entra(?:no)?|Exit(?:s)?|Enter(?:s)?|Esce|Escono|Detti|Poi(?:\s+\w+)+|Quindi|Quindi(?:\s+\w+)+)/i;

    let isCharacterList = false; // To track if we're in a character list section

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      if (!line) {
        if (currentLine) {
          processedLines.push(currentLine);
          currentLine = '';
          inCharacterDialogue = false; // End dialogue section on blank line
          isSceneDescription = false; // End scene description on blank line
        }
        continue;
      }
      
      // Check for character list sections
      if (characterListPattern.test(line)) {
        isCharacterList = true;
        if (currentLine) {
          processedLines.push(currentLine);
          currentLine = '';
        }
        processedLines.push(line);
        continue;
      }

      // Handle act/scene markers
      if (actSceneMarkerPattern.test(line)) {
        if (currentLine) {
          processedLines.push(currentLine);
          currentLine = '';
        }
        lastSceneHeading = line;
        processedLines.push(line);
        isSceneDescription = false;
        inCharacterDialogue = false;
        isCharacterList = false;
        continue;
      }

      // Handle scene descriptions
      if (sceneDescPattern.test(line) || isSceneDescription) {
        if (!isSceneDescription) {
          // This is the start of a scene description
          isSceneDescription = true;
          if (currentLine) {
            processedLines.push(currentLine);
            currentLine = '';
          }
        }
        
        // Convert scene descriptions to stage directions for consistency
        if (!line.startsWith('(') && !line.endsWith(')')) {
          line = `(${line})`;
        }
        processedLines.push(line);
        continue;
      }

      // Handle stage directions (both single and multiline)
      if ((line.startsWith('(') || line.startsWith('[')) && !isMultilineStageDirection || 
          possibleStageDirectionsPattern.test(line) || isStageDirection) {
        
        isStageDirection = true;
        // Check if this is the start of a multiline direction
        if (!isMultilineStageDirection && (line.startsWith('(') || line.startsWith('[')) && 
            !(line.endsWith(')') || line.endsWith(']'))) {
          isMultilineStageDirection = true;
        }

        if (currentLine) {
          processedLines.push(currentLine);
          currentLine = '';
          inCharacterDialogue = false; // End dialogue section on stage direction
        }
        
        // Convert all stage directions to standard parentheses format
        if (line.startsWith('[') && line.endsWith(']')) {
          line = '(' + line.substring(1, line.length - 1) + ')';
        } else if (!line.startsWith('(') && possibleStageDirectionsPattern.test(line)) {
          // If it's a stage direction without parentheses, wrap it
          line = `(${line})`;
        }
        
        processedLines.push(line);
        
        // Check if the stage direction ends on this line
        if ((line.endsWith(')') || line.endsWith(']')) && !isMultilineStageDirection) {
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
                    && !nextLine.startsWith('[') && 
                    !possibleStageDirectionsPattern.test(nextLine)) {
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
            // Italian name patterns - handle titles like "SIGNORA PELAEZ" properly
            lastCharacterName = italianMatch[1].trim();
            if (italianMatch[0].includes('SIGNOR') || italianMatch[0].includes('DOTTOR') || 
                italianMatch[0].includes('PROFESSOR') || italianMatch[0].includes('Sig.') || 
                italianMatch[0].includes('Dott.') || italianMatch[0].includes('Prof.')) {
              // Extract the title and name
              const titlePart = italianMatch[0].split(/\s+/).filter(p => p.length > 0)[0];
              lastCharacterName = `${titlePart} ${lastCharacterName}`;
            }
            
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
                  && !nextLine.startsWith('[') && !possibleStageDirectionsPattern.test(nextLine)) {
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
          } else if (isCharacterList) {
            // If we're in a character list section, process the line as is
            processedLines.push(line);
            currentLine = '';
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

  /**
   * Extract lines spoken by a specific character.
   * @param {string[]} scriptLines - Processed script lines
   * @param {string|Array|Object} characterData - Character name or data
   * @param {number} precedingCount - Number of preceding lines to include
   * @returns {Array} - Extracted character lines
   */
  static extractCharacterLines(scriptLines, characterData, precedingCount = 0) {
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
    
    // First, find all lines that match the character
    const matchedLineIndices = [];
    for (let i = 0; i < scriptLines.length; i++) {
      if (regex.test(scriptLines[i])) {
        matchedLineIndices.push(i);
      }
    }
    
    // Now process each matched line, including preceding context
    matchedLineIndices.forEach(index => {
      // Add preceding lines if requested
      if (precedingCount > 0) {
        const startIndex = Math.max(0, index - precedingCount);
        for (let j = startIndex; j < index; j++) {
          extractedLines.push({
            index: j,
            line: scriptLines[j],
            speaker: scriptLines[j].match(/^([^:]+):/)?.[1]?.trim() || '',
            isPreceding: true
          });
        }
      }
      
      // Add the matched line
      extractedLines.push({
        index: index,
        line: scriptLines[index],
        speaker: scriptLines[index].match(/^([^:]+):/)?.[1]?.trim() || '',
        isPreceding: false
      });
    });
    
    console.debug(`Extracted ${extractedLines.length} lines for character`);
    return extractedLines;
  }

  /**
   * Extract roles from an array of processed script lines.
   * @param {string[]} scriptLines - An array of processed script lines
   * @returns {Array<{primaryName: string, aliases: string[], description: string}>} - Array of role objects
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
      /^poi|quindi|the curtain|il sipario|personaggi|characters/i, // Additional markers
    ];

    const addRole = (name, description = '') => {
      const cleanName = name.trim().replace(/\s+/g, ' ');
      if (!rolesMap.has(cleanName) && cleanName.length > 1) {
        // Check if the name has a title like SIGNORA, Sig., etc.
        const isTitled = /^(SIGNOR[A|E|I]?|DOTTOR[ESSA]?|PROFESSOR[ESSA]?|Sig\.|Dott\.|Prof\.)/i.test(cleanName);
        
        rolesMap.set(cleanName, {
          primaryName: cleanName,
          aliases: [cleanName],
          description: description,
          isTitled: isTitled
        });
      } else if (rolesMap.has(cleanName) && description && !rolesMap.get(cleanName).description) {
        // Update existing role with description if not already set
        const role = rolesMap.get(cleanName);
        role.description = description;
        rolesMap.set(cleanName, role);
      }
    };
    
    // Check for structured character list like "CHARACTER - Description"
    const charDescPattern = /^([A-Z][A-Za-z0-9_\s''.\-]+)\s+-\s+(.+)$/;
    
    // Check for character lists like "Characters: John, Mary, etc."
    let inCharacterList = false;
    let characterListSectionEnded = false;
    
    // Improved extraction logic
    let previousLine = '';
    let inDialogue = false;
    
    for (let i = 0; i < scriptLines.length; i++) {
      const line = scriptLines[i].trim();
      if (!line) {
        inDialogue = false;
        previousLine = line;
        continue;
      }
      
      // Check if this is a character list section header
      if (/^(?:Characters|Personaggi|PERSONAGGI|CHARACTERS|Dramatis\s+Personae):/i.test(line)) {
        inCharacterList = true;
        characterListSectionEnded = false;
        continue;
      }
      
      // If in a character list section, process differently
      if (inCharacterList && !characterListSectionEnded) {
        // Check if the character list section has ended
        if (skipPatterns.some(pattern => pattern.test(line)) || 
            /^[A-Z][\w\s]+:/.test(line) || // Dialogue line with character name
            line.startsWith('(') || line.startsWith('[')) { // Stage direction
          characterListSectionEnded = true;
          inCharacterList = false;
        } else {
          // This might be a character with description
          const charDescMatch = line.match(charDescPattern);
          if (charDescMatch) {
            addRole(charDescMatch[1], charDescMatch[2]);
          } else {
            // Could be a list of characters on one line
            const possibleCharacters = line.split(/,|\se\s|\sand\s/).map(s => s.trim()).filter(s => s.length > 0);
            if (possibleCharacters.length > 0) {
              possibleCharacters.forEach(char => addRole(char));
            }
          }
          continue;
        }
      }

      // Skip known non-character lines
      if (skipPatterns.some(pattern => pattern.test(line))) {
        inDialogue = false;
        previousLine = line;
        continue;
      }

      const namePatterns = [
        /^([A-Z][A-Za-z0-9_\s''.\-]+):\s*/, // Name with colon followed by text
        /^(Sig\.(?:ra|na)?|Dott\.(?:ssa)?|Prof\.(?:ssa)?|SIGNOR[A|E|I]?|DOTTOR[E|ESSA]?|PROFESSOR[E|ESSA]?)\s+([A-Z][A-Za-z0-9_\s''.\-]+):\s*/, // Italian title + name
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
          // If next line isn't a stage direction, or empty line,
          // this is likely a character name followed by dialogue
          if (nextLine && 
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
          if (pattern.toString().includes('Sig') || pattern.toString().includes('SIGNOR')) {
            const title = match[1];
            const name = match[2];
            addRole(`${title} ${name}`);
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
  
  /**
   * Main entry point for parsing non-structured scripts.
   * This method coordinates the parsing of plain text scripts and returns a complete result.
   * @param {string} scriptText - The raw script text
   * @param {object} options - Parsing options
   * @returns {object} - Complete parsed script information
   */
  static parseNonStructuredScript(scriptText, options = {}) {
    if (!scriptText) {
      return {
        title: '',
        metadata: {
          title: '',
          author: '',
          date: '',
          description: ''
        },
        roles: [],
        lines: []
      };
    }
    
    // Process the script to normalize it with aggressive detection for better results
    const processedLines = this.preProcessScript(scriptText, { ...options, aggressiveDetection: true });
    
    // Extract roles
    const roles = this.extractRolesFromPlainText(processedLines);
    
    // Extract basic metadata
    const metadata = this.#extractBasicMetadata(scriptText);
    
    // Process into structured lines with characters, dialog, etc.
    const parsedLines = this.#processIntoStructuredLines(processedLines);
    
    return {
      title: metadata.title || '',
      metadata,
      roles,
      processedLines, // Raw processed lines
      lines: parsedLines // Structured line objects
    };
  }
  
  /**
   * Extract basic metadata from script text
   * @private
   * @param {string} scriptText - The script text
   * @returns {Object} - Extracted metadata
   */
  static #extractBasicMetadata(scriptText) {
    const metadata = {
      title: '',
      author: '',
      date: '',
      description: ''
    };
    
    // Try to extract title from first line
    const lines = scriptText.split('\n');
    if (lines.length > 0) {
      const potentialTitle = lines[0].trim();
      if (potentialTitle && !potentialTitle.includes(':') && 
          !potentialTitle.startsWith('(') && !potentialTitle.startsWith('[')) {
        metadata.title = potentialTitle;
        
        // If the second line looks like a subtitle or description, add it
        if (lines.length > 1 && lines[1].trim() && 
            !lines[1].includes(':') && !lines[1].startsWith('(') && !lines[1].startsWith('[')) {
          metadata.description = lines[1].trim();
        }
      }
      
      // Look for specific metadata markers
      lines.slice(0, 15).forEach(line => {
        const titleMatch = line.match(/^(?:TITLE|TITLE:|TITOLO|TITOLO:)\s*(.+)/i);
        const authorMatch = line.match(/^(?:BY|AUTHOR|AUTHOR:|AUTORE|AUTORE:|DI)\s*(.+)/i);
        const dateMatch = line.match(/^(?:DATE|DATE:|DATA|DATA:)\s*(.+)/i);
        const descMatch = line.match(/^(?:DESCRIPTION|DESCRIPTION:|DESCRIZIONE|DESCRIZIONE:)\s*(.+)/i);
        
        if (titleMatch) metadata.title = titleMatch[1].trim();
        if (authorMatch) metadata.author = authorMatch[1].trim();
        if (dateMatch) metadata.date = dateMatch[1].trim();
        if (descMatch) metadata.description = descMatch[1].trim();
      });
      
      // Look for scene descriptions that might contain location info
      const sceneDescPattern = /^(?:La\s+scena|The\s+scene|SCENA|SCENE)\s+(?:rappresenta|è|si\s+svolge|shows|is|takes\s+place\s+in)\s+(.+)/i;
      lines.slice(0, 20).forEach(line => {
        const sceneMatch = line.match(sceneDescPattern);
        if (sceneMatch && !metadata.description) {
          metadata.description = sceneMatch[0].trim();
        }
      });
    }
    
    return metadata;
  }
  
  /**
   * Process lines into structured format with character, text, dialog properties
   * @private
   * @param {string[]} processedLines - Pre-processed script lines
   * @returns {Array} - Structured line objects
   */
  static #processIntoStructuredLines(processedLines) {
    const structuredLines = [];
    let currentCharacter = null;
    
    // Improved pattern for scene headings
    const sceneHeadingPattern = /^(?:ACT|SCENE|ATTO|SCENA|ACT \w+,?\s+SCENE \w+)/i;
    
    // Pattern for stage directions
    const stageDirectionPattern = /^(?:\(.*\)|\[.*\]|Entra(?:no)?|Exit(?:s)?|Enter(?:s)?|Esce|Escono|Detti)/i;
    
    // Pattern for character lists
    const characterListPattern = /^(?:Characters|Personaggi|PERSONAGGI|Dramatis\s+Personae)/i;
    
    for (let i = 0; i < processedLines.length; i++) {
      const line = processedLines[i].trim();
      if (!line) continue;
      
      // Check for scene headings
      if (sceneHeadingPattern.test(line)) {
        structuredLines.push({
          character: null,
          speaker: null,
          text: line,
          isSceneHeading: true,
          isDirection: false
        });
        continue;
      }
      
      // Check for character lists
      if (characterListPattern.test(line)) {
        structuredLines.push({
          character: null,
          speaker: null,
          text: line,
          isSceneHeading: false,
          isDirection: false,
          isCharacterList: true
        });
        continue;
      }
      
      // Check for stage directions
      if (stageDirectionPattern.test(line)) {
        structuredLines.push({
          character: null,
          speaker: null,
          text: line,
          isSceneHeading: false,
          isDirection: true
        });
        continue;
      }
      
      // Check for character dialog
      const characterMatch = line.match(/^([^:]+):\s*(.*)/);
      if (characterMatch) {
        currentCharacter = characterMatch[1].trim();
        const dialogText = characterMatch[2].trim();
        
        structuredLines.push({
          character: currentCharacter,
          speaker: currentCharacter,
          text: line,
          dialog: dialogText,
          isSceneHeading: false,
          isDirection: false
        });
      } else if (currentCharacter) {
        // This could be continued dialog, but we're not sure
        // In a more sophisticated version, we might append to the previous entry
        structuredLines.push({
          character: null,
          speaker: null,
          text: line,
          isSceneHeading: false,
          isDirection: false
        });
      } else {
        // Just a line of text without clear attribution
        structuredLines.push({
          character: null,
          speaker: null,
          text: line,
          isSceneHeading: false,
          isDirection: false
        });
      }
    }
    
    return structuredLines;
  }
  
  /**
   * Extract scenes from processed script lines
   * @param {string[]} processedLines - Processed script lines
   * @returns {Array} - Extracted scenes
   */
  static extractScenes(processedLines) {
    // Look for scene markers like "ACT I", "SCENE 1", "ATTO PRIMO", etc.
    const sceneMarkerRegex = /^(ACT|SCENE|ATTO|SCENA|ACT \w+,?\s+SCENE \w+)/i;
    
    let scenes = [];
    let currentScene = {
      title: 'Scene 1',
      location: '',
      time: '',
      description: '',
      lines: []
    };
    
    // Look for settings lines that might indicate location/time
    const settingRegex = /^(SETTING|LOCATION|TIME|PLACE|LUOGO|DATA|ORA):\s*(.+)$/i;
    
    // Look for scene descriptions
    const sceneDescPattern = /^(?:La\s+scena|The\s+scene|SCENA|SCENE)\s+(?:rappresenta|è|si\s+svolge|shows|is|takes\s+place\s+in)\s+(.+)/i;
    
    processedLines.forEach(line => {
      // Check if it's a scene description
      const descMatch = line.match(sceneDescPattern);
      if (descMatch && !currentScene.description) {
        if (line.startsWith('(') && line.endsWith(')')) {
          currentScene.description = line.substring(1, line.length - 1).trim();
        } else {
          currentScene.description = line.trim();
        }
        return;
      }
      
      // Check if it's a scene marker
      const sceneMatch = line.match(sceneMarkerRegex);
      if (sceneMatch) {
        // Save current scene if it has content
        if (currentScene.lines.length > 0 || currentScene.description) {
          scenes.push(currentScene);
        }
        
        // Start a new scene
        currentScene = {
          title: line.trim(),
          location: '',
          time: '',
          description: '',
          lines: []
        };
        return;
      }
      
      // Check if it's a setting line
      const settingMatch = line.match(settingRegex);
      if (settingMatch) {
        const settingType = settingMatch[1].toLowerCase();
        const value = settingMatch[2].trim();
        
        if (settingType === 'setting' || settingType === 'location' || 
            settingType === 'place' || settingType === 'luogo') {
          currentScene.location = value;
        } else if (settingType === 'time' || settingType === 'ora' || settingType === 'data') {
          currentScene.time = value;
        }
        return;
      }
      
      // Otherwise, add to current scene
      currentScene.lines.push(line);
    });
    
    // Add the final scene if it has content
    if (currentScene.lines.length > 0 || currentScene.description) {
      scenes.push(currentScene);
    }
    
    // If no scenes were explicitly marked, treat the whole script as one scene
    if (scenes.length === 0 && (currentScene.lines.length > 0 || currentScene.description)) {
      scenes = [currentScene];
    }
    
    return scenes;
  }
}
