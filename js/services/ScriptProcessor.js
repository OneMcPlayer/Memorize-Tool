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
    
    // Additional patterns for aggressive detection mode - for standalone uppercase names
    const aggressiveCharacterPattern = /^([A-Z][A-Za-z0-9_\s''\-\.]+)(?:\s*)(?:\(.*\))?$/;
    
    // Enhanced pattern for italian script conventions with more title variants
    const italianNamePattern = /^(?:(?:Sig\.(?:ra|na)?|Dott\.(?:ssa)?|Prof\.(?:ssa)?|SIGNOR(?:A|E|I)?|DOTTOR(?:E|ESSA)?|PROFESSOR(?:E|ESSA)?)\s+)?([A-Z][A-Za-z0-9_\s''\-\.]+)(?:\s*:?\s*)(.*)/i;
    
    // Pattern to detect character with inline stage directions
    const characterWithDirectionPattern = /^([A-Z][A-Za-z0-9_\s''\-\.]+)\s+(\([^)]+\)):\s*(.*)/;
    
    // Pattern to detect regular character names - needs to be used multiple times, so defined once
    const characterPattern = /^([A-Z][A-Za-z0-9_\s''\-\.]+)(?:\s*:?\s*)(.*)/;

    // Pattern for scene headings like "La scena rappresenta..." or "The scene is set in..."
    const sceneDescPattern = /^(?:La\s+scena|The\s+scene|SCENA|SCENE|Il sipario si alza|Sipario)/i;
    
    // Pattern for character lists like "Characters: John, Mary, etc."
    const characterListPattern = /^(?:Characters|Personaggi|PERSONAGGI|CHARACTERS|Dramatis\s+Personae):/i;
    
    // Pattern for Italian act/scene markers
    const actSceneMarkerPattern = /^(?:ATTO|SCENA|ATTO\s+[\w]+(?:,|\s)\s*SCENA\s+[\w]+)/i;
    
    // Better handling for stage directions in various formats - expanded to include Italian entrance/exit patterns
    const possibleStageDirectionsPattern = /^(?:Entra(?:no)?|Exit(?:s)?|Enter(?:s)?|Esce|Escono|Detti|Poi(?:\s+\w+)+|Quindi|Quindi(?:\s+\w+)+)/i;

    let isCharacterList = false; // To track if we're in a character list section
    let isFirstLine = true;     // To track if we're processing the first line
    
    // Check for plain text (not part of a dialogue)
    const isPlainText = (line) => {
        // No character marker, not a stage direction, etc.
        return !line.includes(':') && 
               !line.startsWith('(') && 
               !line.startsWith('[') &&
               !possibleStageDirectionsPattern.test(line) &&
               !sceneDescPattern.test(line) &&
               !actSceneMarkerPattern.test(line) &&
               !characterListPattern.test(line);
    };

    // First pass - handle aggressive detection for standalone character names
    if (aggressiveDetection) {
      const tempLines = [];
      let i = 0;
      while (i < lines.length) {
        const line = lines[i].trim();
        
        // Check if this is a standalone character name (uppercase, no colon)
        if (line.match(aggressiveCharacterPattern) && !line.includes(':')) {
          // Look ahead to see if the next line is the dialogue
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            // If next line doesn't look like a character or stage direction, it's dialogue
            if (nextLine && 
                !nextLine.match(/^[A-Z][A-Za-z0-9_\s''\-\.]+(?:\s*:)/) && 
                !nextLine.startsWith('(') && 
                !nextLine.startsWith('[') && 
                !possibleStageDirectionsPattern.test(nextLine)) {
              // Combine the two lines
              tempLines.push(`${line}: ${nextLine}`);
              i += 2; // Skip both lines
              continue;
            }
          }
        }
        
        // If not processed as a character name, keep the original line
        tempLines.push(line);
        i++;
      }
      
      // Update lines with the preprocessed version
      lines = tempLines;
    }

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Handle title on first line - keep it exactly as is
      if (isFirstLine && line && !line.includes(':') && !line.startsWith('(') && !line.startsWith('[')) {
        processedLines.push(line);
        isFirstLine = false;
        continue;
      }
      isFirstLine = false;
      
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

      // Handle entrance and exit stage directions
      if (possibleStageDirectionsPattern.test(line) && !line.startsWith('(') && !line.endsWith(')')) {
        // Wrap entrance/exit text in parentheses
        line = `(${line})`;
        processedLines.push(line);
        continue;
      }
      
      // Handle stage directions (both single and multiline)
      if ((line.startsWith('(') || line.startsWith('[')) && !isMultilineStageDirection || 
          isStageDirection) {
        
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
        } else if (!line.startsWith('(') && !line.endsWith(')')) {
          // If it's a stage direction without parentheses, wrap it
          line = `(${line})`;
        }
        
        processedLines.push(line);
        
        // Check if the stage direction ends on this line
        if ((line.endsWith(')') || line.endsWith(']'))) {
          isStageDirection = false;
          isMultilineStageDirection = false;
        }
        continue;
      }

      // Special case for complex Italian scripts with character lists in the form:
      // "Teresa, la signora Ridabella, la signora Celeste, i Pelaez. Poi la signora Jone un momento."
      if (line.includes(',') && !line.includes(':') && 
          line.split(',').some(part => part.trim().match(/^[A-Z][A-Za-z\s]+$/))) {
        // This looks like a character list, treat as a stage direction
        if (currentLine) {
          processedLines.push(currentLine);
          currentLine = '';
        }
        if (!line.startsWith('(') && !line.endsWith(')')) {
          line = `(${line})`;
        }
        processedLines.push(line);
        continue;
      }

      // Check for character with inline stage direction - like "JOHN (smiling):"
      const charWithDirectionMatch = line.match(characterWithDirectionPattern);
      if (charWithDirectionMatch && !isStageDirection) {
        if (currentLine) {
          processedLines.push(currentLine);
        }
        
        // Keep the stage direction as part of the character name
        const charName = charWithDirectionMatch[1].trim();
        const direction = charWithDirectionMatch[2].trim();
        const dialogText = charWithDirectionMatch[3].trim();
        
        lastCharacterName = charName;
        currentLine = `${charName} ${direction}: ${dialogText}`;
        inCharacterDialogue = true;
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
            currentLine = '';
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
              currentLine = `${lastCharacterName}: `;
              inCharacterDialogue = true;
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
            currentLine = `${lastCharacterName}: `;
            inCharacterDialogue = true;
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

            // Special handling for hyphenated line breaks - join without space
            if (currentLine.endsWith('-')) {
              // Remove the hyphen and join directly to the next line without adding a space
              currentLine = currentLine.substring(0, currentLine.length - 1) + line;
            } else {
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
                // Regular continuing dialogue
                currentLine += connector + line;
              }
            }
          } else {
            // Not continuing dialogue - add the line as is
            if (currentLine) {
              processedLines.push(currentLine);
            }
            currentLine = line;
          }
        }
      }
    }
    
    // Don't forget to add the last line if it exists
    if (currentLine) {
      processedLines.push(currentLine);
    }
    
    return processedLines;
  }

  /**
   * Extract all lines spoken by a specific character
   * @param {string[]} scriptLines - Processed script lines
   * @param {string|string[]|object} character - Character identifier (name, array of names, or character object)
   * @param {number} precedingLines - Number of context lines to include before each character line
   * @returns {Array<{line: string, index: number, speaker: string, isPreceding: boolean}>}
   */
  static extractCharacterLines(scriptLines, character, precedingLines = 0) {
    if (!scriptLines || !scriptLines.length) {
      console.warn('No script lines provided for character extraction');
      return [];
    }
    
    if (!character) {
      console.warn('No character data provided for extraction');
      return [];
    }
    
    // Normalize character data to an array of possible names
    let characterNames = [];
    if (typeof character === 'string') {
      characterNames = [character];
    } else if (Array.isArray(character)) {
      characterNames = character;
    } else if (character.primaryName) {
      characterNames = [character.primaryName];
      if (character.aliases && Array.isArray(character.aliases)) {
        characterNames = characterNames.concat(character.aliases);
      }
    } else {
      throw new Error('Invalid character data provided');
    }
    
    // Extract character's lines and preceding context
    const characterLines = [];
    let contextBuffer = [];
    
    for (let i = 0; i < scriptLines.length; i++) {
      const line = scriptLines[i];
      
      // Extract speaker from the line if present
      let speaker = null;
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        speaker = line.substring(0, colonIndex).trim();
      }
      
      // Keep track of recent lines for context
      if (precedingLines > 0) {
        contextBuffer.push({ 
          line, 
          index: i, 
          speaker,
          isPreceding: true
        });
        
        // Keep the buffer at the right size
        if (contextBuffer.length > precedingLines) {
          contextBuffer.shift();
        }
      }
      
      // Check if this is a line by our target character
      const isCharacterLine = speaker && characterNames.some(name => 
        speaker === name || speaker.startsWith(name + ' (')
      );
      
      if (isCharacterLine) {
        // Add preceding context if requested
        if (precedingLines > 0) {
          // Add all except this line from the context buffer
          for (let j = 0; j < contextBuffer.length - 1; j++) {
            characterLines.push(contextBuffer[j]);
          }
          contextBuffer = [];
        }
        
        // Add the character's line itself
        characterLines.push({ 
          line, 
          index: i, 
          speaker,
          isPreceding: false
        });
      }
    }
    
    return characterLines;
  }
  
  /**
   * Extract all character roles from plain text script lines
   * @param {string[]} scriptLines - Processed script lines
   * @returns {Array<{primaryName: string, aliases: string[], isTitled: boolean, description: string}>}
   */
  static extractRolesFromPlainText(scriptLines) {
    if (!scriptLines || !scriptLines.length) {
      console.warn('No script lines provided for role extraction');
      return [];
    }
    
    const roles = new Map(); // Using a Map to ensure uniqueness by character name
    let inCharacterList = false;
    
    // Common patterns
    const characterPattern = /^([A-Z][A-Za-z0-9_\s''\-\.]+)(?:\s*:)/;
    const characterListEntryPattern = /^([A-Z][A-Za-z0-9_\s''\-\.]+)(?:\s*[-–]\s*)(.+)$/;
    const characterListSectionPattern = /^(?:Characters|Personaggi|PERSONAGGI|CHARACTERS|Dramatis\s+Personae):/i;
    const actSceneMarkerPattern = /^(?:ACT|SCENE|ATTO|SCENA|ATTO\s+[\w]+(?:,|\s)\s*SCENA\s+[\w]+)/i;
    
    // Skip these common script elements
    const skipPatterns = [
      /^ACT\s+[\w]+$/i,
      /^SCENE\s+[\w]+$/i,
      /^ATTO\s+[\w]+$/i, 
      /^SCENA\s+[\w]+$/i,
      /^\(.*\)$/, // Stage directions
      /^\[.*\]$/, // Alternative stage directions
      /^La scena rappresenta/i, // Scene descriptions
      /^The scene is set/i,
      /^sipario/i, // Curtain
      /^entra(?:no)?/i, // Entrances
      /^esce(?:ono)?/i, // Exits
      /^exit(?:s)?/i,
      /^enter(?:s)?/i
    ];

    for (let i = 0; i < scriptLines.length; i++) {
      const line = scriptLines[i].trim();
      
      if (!line) continue; // Skip empty lines
      
      // Skip common script elements that aren't character names
      if (skipPatterns.some(pattern => pattern.test(line)) || actSceneMarkerPattern.test(line)) {
        continue;
      }
      
      // Check if we're entering a character list section
      if (characterListSectionPattern.test(line)) {
        inCharacterList = true;
        continue;
      }
      
      // If in a character list section, look for character entries (Name - Description)
      if (inCharacterList) {
        const characterListMatch = line.match(characterListEntryPattern);
        if (characterListMatch) {
          const name = characterListMatch[1].trim();
          const description = characterListMatch[2].trim();
          
          // Check if the character has a title
          const isTitled = /^(?:Sig\.|Dott\.|Prof\.|SIGNOR(?:A|E|I)?|DOTTOR(?:E|ESSA)?|PROFESSOR(?:E|ESSA)?)\s+/.test(name);
          
          roles.set(name, {
            primaryName: name,
            aliases: [],
            isTitled,
            description
          });
          
          continue;
        }
        
        // End of character list if we encounter a line not in character list format
        if (line.match(characterPattern)) {
          inCharacterList = false;
        } else if (!line.includes('-')) {
          // Check for a transition to dialogue or regular content
          if (i + 1 < scriptLines.length && scriptLines[i + 1].includes(':')) {
            inCharacterList = false;
          }
        }
      }
      
      // Process standard character dialogue format (NAME: dialogue)
      const characterMatch = line.match(characterPattern);
      if (characterMatch) {
        const name = characterMatch[1].trim();
        
        // Check if the character has a title
        const isTitled = /^(?:Sig\.|Dott\.|Prof\.|SIGNOR(?:A|E|I)?|DOTTOR(?:E|ESSA)?|PROFESSOR(?:E|ESSA)?)\s+/.test(name);
        
        if (!roles.has(name)) {
          roles.set(name, {
            primaryName: name,
            aliases: [],
            isTitled,
            description: ''
          });
        }
        
        continue;
      }
      
      // Process comma-separated lists of characters (e.g., "JOHN, MARY, JACK")
      // and characters separated by "and" or "e" (Italian "and")
      const separatedNamesPatterns = [
        /^([A-Z][A-Za-z0-9_\s''\-\.]+)(?:,\s+)([A-Z][A-Za-z0-9_\s''\-\.]+)(?:,\s+)?([A-Z][A-Za-z0-9_\s''\-\.]+)?(?:,\s+)?([A-Z][A-Za-z0-9_\s''\-\.]+)?/,
        /^([A-Z][A-Za-z0-9_\s''\-\.]+)(?:\s+and\s+)([A-Z][A-Za-z0-9_\s''\-\.]+)/,
        /^([A-Z][A-Za-z0-9_\s''\-\.]+)(?:\s+e\s+)([A-Z][A-Za-z0-9_\s''\-\.]+)/
      ];
      
      for (const pattern of separatedNamesPatterns) {
        const match = line.match(pattern);
        if (match) {
          // Process each captured group (may contain null for optional captures)
          for (let j = 1; j < match.length; j++) {
            if (match[j]) {
              const name = match[j].trim();
              if (!roles.has(name) && name.length > 0) {
                const isTitled = /^(?:Sig\.|Dott\.|Prof\.|SIGNOR(?:A|E|I)?|DOTTOR(?:E|ESSA)?|PROFESSOR(?:E|ESSA)?)\s+/.test(name);
                
                roles.set(name, {
                  primaryName: name,
                  aliases: [],
                  isTitled,
                  description: ''
                });
              }
            }
          }
          break; // Break after first matching pattern
        }
      }
    }
    
    // Convert the map to an array for the final result
    return Array.from(roles.values());
  }
  
  /**
   * Parse a non-structured script text into a structured format
   * @param {string} scriptText - The raw script text
   * @param {object} options - Parsing options
   * @returns {object} - Structured script data
   */
  static parseNonStructuredScript(scriptText, options = {}) {
    // Default value for empty scripts
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
    
    // Process the raw text into standardized lines
    const processedLines = this.preProcessScript(scriptText, options);
    
    // Extract basic metadata
    let title = '';
    let author = '';
    let date = '';
    let description = '';
    
    // First line is typically the title
    if (processedLines.length > 0) {
      title = processedLines[0];
    }
    
    // Look for scene descriptions and other metadata
    for (let i = 1; i < Math.min(10, processedLines.length); i++) {
      const line = processedLines[i];
      
      // Scene descriptions often contain key metadata
      if (line.startsWith('(')) {
        if (!description) {
          description = line.replace(/^\(|\)$/g, '').trim();
        }
      }
      
      // Look for possible author
      if (line.match(/^By\s+|^Di\s+|^Author:?\s+|^Autore:?\s+/i) && !author) {
        author = line.replace(/^By\s+|^Di\s+|^Author:?\s+|^Autore:?\s+/i, '').trim();
      }
      
      // Look for possible date
      const dateMatch = line.match(/\b((?:19|20)\d{2})\b/);
      if (dateMatch && !date) {
        date = dateMatch[1];
      }
    }
    
    // Extract all character roles from the processed lines
    const roles = this.extractRolesFromPlainText(processedLines);
    
    // Convert processed lines to structured format
    const structuredLines = [];
    
    for (let i = 0; i < processedLines.length; i++) {
      const line = processedLines[i];
      
      // Skip the title line which we already processed
      if (i === 0 && line === title) {
        continue;
      }
      
      const structuredLine = {
        index: i,
        text: line,
        character: null,
        dialogue: '',
        isDirection: false,
        isSceneHeading: false
      };
      
      // Check if this is a stage direction
      if (line.startsWith('(') && line.endsWith(')')) {
        structuredLine.isDirection = true;
        structuredLine.text = line.substring(1, line.length - 1);
        structuredLines.push(structuredLine);
        continue;
      }
      
      // Check if this is a scene or act heading
      if (line.match(/^(?:ACT|SCENE|ATTO|SCENA)\s+[\w]+/i)) {
        structuredLine.isSceneHeading = true;
        structuredLines.push(structuredLine);
        continue;
      }
      
      // Parse character dialogue
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const characterName = line.substring(0, colonIndex).trim();
        const dialogue = line.substring(colonIndex + 1).trim();
        
        structuredLine.character = characterName;
        structuredLine.dialogue = dialogue;
      }
      
      structuredLines.push(structuredLine);
    }
    
    return {
      title,
      metadata: { title, author, date, description },
      roles,
      lines: structuredLines
    };
  }

  /**
   * Extract scenes from processed script lines
   * @param {string[]} processedLines - Processed script lines
   * @returns {Array<{title: string, description: string, location: string, time: string, lines: string[]}>}
   */
  static extractScenes(processedLines) {
    if (!processedLines || !processedLines.length) {
      return [{ title: '', description: '', location: '', time: '', lines: [] }];
    }
    
    const scenes = [];
    let currentScene = {
      title: '',
      description: '',
      location: '',
      time: '',
      lines: []
    };
    
    let currentAct = '';
    let inSceneDescription = false;
    
    // Patterns for scene and act headers
    const sceneHeaderPattern = /^(?:SCENE|SCENA)\s+[\w]+/i;
    const actHeaderPattern = /^(?:ACT|ATTO)\s+[\w]+/i;
    const combinedHeaderPattern = /^(?:ATTO|ACT)\s+[\w]+(?:,|\s)\s*(?:SCENA|SCENE)\s+[\w]+/i;
    
    // Patterns for scene description parts
    const locationPattern = /^(?:LOCATION|LUOGO|POSTO|PLACE):\s+(.+)$/i;
    const timePattern = /^(?:TIME|TEMPO|ORA):\s+(.+)$/i;
    
    for (let i = 0; i < processedLines.length; i++) {
      const line = processedLines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Check for act header
      if (actHeaderPattern.test(line)) {
        currentAct = line;
        continue;
      }
      
      // Check for combined act and scene header
      if (combinedHeaderPattern.test(line)) {
        // Start a new scene
        if (currentScene.lines.length > 0) {
          scenes.push(currentScene);
        }
        
        currentScene = {
          title: line,
          description: '',
          location: '',
          time: '',
          lines: []
        };
        inSceneDescription = true;
        continue;
      }
      
      // Check for scene header
      if (sceneHeaderPattern.test(line)) {
        // Start a new scene
        if (currentScene.lines.length > 0) {
          scenes.push(currentScene);
        }
        
        currentScene = {
          title: line,
          description: '',
          location: '',
          time: '',
          lines: []
        };
        inSceneDescription = true;
        continue;
      }
      
      // Process scene description parts
      if (inSceneDescription) {
        const locationMatch = line.match(locationPattern);
        if (locationMatch) {
          currentScene.location = locationMatch[1];
          continue;
        }
        
        const timeMatch = line.match(timePattern);
        if (timeMatch) {
          currentScene.time = timeMatch[1];
          continue;
        }
        
        // Assume this is a general scene description if it doesn't match specific patterns
        // and it's right after the scene header
        if (!currentScene.description && !line.includes(':')) {
          // Remove parentheses if this is a wrapped stage direction
          if (line.startsWith('(') && line.endsWith(')')) {
            currentScene.description = line.substring(1, line.length - 1);
          } else {
            currentScene.description = line;
          }
          continue;
        }
        
        // End of scene description when we hit a character dialogue line
        if (line.includes(':')) {
          inSceneDescription = false;
        }
      }
      
      // Add line to current scene
      currentScene.lines.push(line);
    }
    
    // Don't forget to add the last scene
    if (currentScene.lines.length > 0 || scenes.length === 0) {
      scenes.push(currentScene);
    }
    
    return scenes;
  }
}
