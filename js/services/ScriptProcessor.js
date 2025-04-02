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
    
    // Split by any line ending and normalize
    const lines = scriptText.split(/\r?\n/);
    
    // Filter out blank lines and trim whitespace
    const nonBlankLines = lines
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // Process line continuations with hyphens
    const processedLines = [];
    for (let i = 0; i < nonBlankLines.length; i++) {
      let currentLine = nonBlankLines[i];
      
      // Handle line joining with hyphens
      if (currentLine.endsWith('-') && i < nonBlankLines.length - 1) {
        // Remove the hyphen and join with the next line
        currentLine = currentLine.substring(0, currentLine.length - 1) + nonBlankLines[++i];
      }
      
      // Detect Italian stage directions like "Detti, Poi, etc."
      if (/^(Detti|Poi|Detti e|Detto e)/.test(currentLine) && !currentLine.startsWith('(')) {
        processedLines.push(`(${currentLine})`);
        continue;
      }
      
      // Detect character entrance and exit lines
      if (/^(Entra|Entrano|Esce|Escono)/.test(currentLine) && !currentLine.startsWith('(')) {
        processedLines.push(`(${currentLine})`);
        continue;
      }
      
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
    const result = [];
    
    for (let i = 0; i < scriptLines.length; i++) {
      const line = scriptLines[i];
      let speaker = null;
      
      // Extract speaker from line
      const speakerMatch = line.match(/^([A-Z][A-Z\s.']+)(?::|\s*\()/);
      if (speakerMatch) {
        speaker = speakerMatch[1].trim();
      }
      
      // Check if this line belongs to the character
      const isCharacterLine = matchesCharacter(line, characterNames);
      
      if (isCharacterLine) {
        // Add preceding context if requested
        if (precedingLines > 0) {
          for (let j = Math.max(0, i - precedingLines); j < i; j++) {
            result.push({
              line: scriptLines[j],
              index: j,
              isPreceding: true
            });
          }
        }
        
        // Add the character's line
        result.push({
          line,
          speaker,
          index: i,
          isPreceding: false
        });
      }
    }
    
    return result;
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
    
    const rolesMap = new Map();
    
    // Process each line
    for (let i = 0; i < scriptLines.length; i++) {
      const line = scriptLines[i];
      
      // Skip stage directions
      if (line.startsWith('(') && line.endsWith(')')) {
        continue;
      }
      
      // Check for standalone character names (all caps)
      if (/^[A-Z][A-Z\s.']+$/.test(line)) {
        const name = line.trim();
        if (!rolesMap.has(name)) {
          rolesMap.set(name, { primaryName: name, aliases: [], lineCount: 0 });
        }
        continue;
      }
      
      // Check for character roles in standard format (NAME: dialogue)
      const characterMatch = line.match(/^([A-Z][A-Za-z0-9_\s''\-\.]+)(?:\s*:)/);
      if (characterMatch) {
        const name = characterMatch[1].trim();
        if (!rolesMap.has(name)) {
          rolesMap.set(name, { primaryName: name, aliases: [], lineCount: 0 });
        }
      }
    }
    
    // Convert the map to an array for the final result
    return Array.from(rolesMap.values());
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
    const roles = this.extractRolesFromPlainText(processedLines);
    
    // Enhance role detection for complex scripts
    const additionalRoles = [];
    for (const line of processedLines) {
      // Look for character names in stage directions
      const stageMatches = line.match(/\(.*?(signor[a|e]?\s+[A-Z][a-z]+|[A-Z][a-z]+).*?\)/gi);
      if (stageMatches) {
        for (const match of stageMatches) {
          const name = match.replace(/[()]/g, '').trim().toUpperCase();
          if (name && !roles.find(r => r.primaryName === name)) {
            additionalRoles.push({ primaryName: name, aliases: [], lineCount: 0 });
          }
        }
      }
    }
    
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
    
    return {
      title,
      metadata: { title, author, date, description },
      roles: [...roles, ...additionalRoles],
      scenes: this.extractScenes(processedLines),
      lines: processedLines
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
