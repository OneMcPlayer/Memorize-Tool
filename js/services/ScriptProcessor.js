class ScriptProcessor {
  // Private helper function to match character names
  static matchesCharacter(line, characterNames) {
    if (!characterNames || !characterNames.length || !line) return false;
    
    // Check if the line starts with any character name followed by colon
    for (const charName of characterNames) {
      const namePattern = new RegExp(`^${charName}\\s*(?:\\(.*\\))?\\s*:`);
      if (namePattern.test(line)) {
        return true;
      }
    }
    return false;
  }

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
    
    // First pass: join multi-line dialogue and handle line continuations
    const joinedLines = [];
    let currentLine = '';
    let pendingJoin = false;
    let lastSpeaker = null;
    let insideMultilineParenthesis = false;
    let parenthesisContent = '';
    
    for (let i = 0; i < nonBlankLines.length; i++) {
      const line = nonBlankLines[i];
      
      // Handle multiline stage directions
      if (line.startsWith('(') && !line.endsWith(')')) {
        insideMultilineParenthesis = true;
        parenthesisContent = line;
        continue;
      }
      
      if (insideMultilineParenthesis) {
        parenthesisContent += '\n' + line;
        if (line.endsWith(')')) {
          // End of multiline parenthesis
          // For test compatibility, split multiline parentheses content
          const parts = parenthesisContent.split('\n');
          for (const part of parts) {
            joinedLines.push(part);
          }
          insideMultilineParenthesis = false;
          parenthesisContent = '';
        }
        continue;
      }
      
      // Handle line joining with hyphens
      if (line.endsWith('-') && i < nonBlankLines.length - 1) {
        // Remove the hyphen and join with the next line without space
        currentLine = (currentLine || '') + line.substring(0, line.length - 1);
        pendingJoin = true;
        continue;
      }
      
      // Check if this is a continuation of a multi-line dialogue
      // This happens when the previous line doesn't end with typical sentence-ending punctuation
      // and the current line starts with lowercase or is a conjunction
      const startsWithLowercase = /^[a-z]/.test(line);
      const isPreviousIncomplete = currentLine && !/[.!?:;]$/.test(currentLine);
      const isConjunctionLine = /^(?:e|ma|o|che|quindi|così|perché|inoltre)/i.test(line);
      
      // Join lines belonging to the same dialogue
      if ((startsWithLowercase || isConjunctionLine) && isPreviousIncomplete && !line.includes(':') && lastSpeaker) {
        currentLine = currentLine + ' ' + line;
        pendingJoin = true;
        continue;
      }
      
      // If we're in a pending join state and the current line is complete
      if (pendingJoin) {
        joinedLines.push(currentLine);
        
        // Check if this was a character line to track the speaker
        const characterMatch = currentLine.match(/^([A-Z][A-Z\s.']+):/);
        if (characterMatch) {
          lastSpeaker = characterMatch[1].trim();
        }
        
        currentLine = '';
        pendingJoin = false;
      }
      
      // Store current line if we have one pending
      if (currentLine) {
        joinedLines.push(currentLine);
        
        // Check if this was a character line to track the speaker
        const characterMatch = currentLine.match(/^([A-Z][A-Z\s.']+):/);
        if (characterMatch) {
          lastSpeaker = characterMatch[1].trim();
        }
      }
      
      // Start a new line
      currentLine = line;
      pendingJoin = false;
    }
    
    // Don't forget the last line
    if (currentLine) {
      joinedLines.push(currentLine);
    }
    
    // Second pass: Process the joined lines
    const processedLines = [];
    lastSpeaker = null;
    let inCharacterDialog = false;
    
    for (let i = 0; i < joinedLines.length; i++) {
      let currentLine = joinedLines[i];
      
      // Convert square bracket stage directions to parentheses
      if (currentLine.startsWith('[') && currentLine.endsWith(']')) {
        currentLine = `(${currentLine.substring(1, currentLine.length - 1)})`;
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
      
      // Process quoted format like "CHARACTER": """Dialog"""
      const quotedFormatMatch = currentLine.match(/"([^"]+)":\s*"""([^"]*)"""/);
      if (quotedFormatMatch) {
        currentLine = `${quotedFormatMatch[1]}: ${quotedFormatMatch[2]}`;
      }
      
      // Detect standard character dialogue format
      const characterMatch = currentLine.match(/^([A-Z][A-Z\s.']+):(.*)$/);
      
      // Process scene descriptions (usually starts with "La scena rappresenta...")
      if (i < 5 && currentLine.match(/^La\sscena\srappresenta/i) && !currentLine.startsWith('(')) {
        processedLines.push(`(${currentLine})`);
        continue;
      }
      
      // Handle aggressive detection option for character names without colons
      if (options.aggressiveDetection && /^[A-Z][A-Z\s.']+$/.test(currentLine) && i < joinedLines.length - 1) {
        const nextLine = joinedLines[i+1];
        if (!nextLine.includes(':') && !nextLine.startsWith('(')) {
          processedLines.push(`${currentLine}: ${nextLine}`);
          i++; // Skip the next line as we've processed it
          continue;
        }
      }
      
      // Handle character names without dialogue
      if (currentLine.match(/^[A-Z][A-Z\s.']+:$/)) {
        processedLines.push(`${currentLine} `);
        continue;
      }
      
      // Handle continued dialogue
      const startsWithUppercaseLetter = /^[A-Z]/.test(currentLine);
      if (!characterMatch && startsWithUppercaseLetter && lastSpeaker && !currentLine.startsWith('(') && inCharacterDialog) {
        // This is likely a continuation of the previous character's dialogue
        processedLines.push(`${currentLine}: ?`);
        continue;
      }
      
      // Update last speaker if this is a character line
      if (characterMatch) {
        lastSpeaker = characterMatch[1].trim();
        inCharacterDialog = true;
      } else if (currentLine.startsWith('(')) {
        inCharacterDialog = false;
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
      const isCharacterLine = this.matchesCharacter(line, characterNames);
      
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
    const skipPatterns = [
      /^(?:ACT|ATTO|SCENE|SCENA|SIPARIO)/i,
      /^PERSONAGGI$/i
    ];
    
    // Process each line
    for (let i = 0; i < scriptLines.length; i++) {
      const line = scriptLines[i];
      
      // Skip stage directions
      if (line.startsWith('(') && line.endsWith(')')) {
        continue;
      }
      
      // Skip common script elements that aren't character names
      let skipLine = false;
      for (const pattern of skipPatterns) {
        if (pattern.test(line)) {
          if (line.toLowerCase() === 'personaggi:' || line.toLowerCase() === 'personaggi') {
            // Don't skip the Personaggi heading, but process the characters below
            if (i + 1 < scriptLines.length) {
              // Process next few lines as character definitions
              let j = i + 1;
              while (j < scriptLines.length && !scriptLines[j].includes(':') && j < i + 10) {
                const characterDef = scriptLines[j];
                // Character definitions often are in format "NAME - description"
                const defMatch = characterDef.match(/^([A-Z][A-Za-z0-9\s.']+)(?:\s*-\s*(.+))?$/);
                if (defMatch) {
                  const name = defMatch[1].trim();
                  const description = defMatch[2] ? defMatch[2].trim() : '';
                  
                  // Check if name has a title
                  const isTitled = /^(?:Sig(?:nor)?a?|Prof|Dott)\.?\s+/i.test(name);
                  
                  if (!rolesMap.has(name)) {
                    rolesMap.set(name, { 
                      primaryName: name, 
                      aliases: [], 
                      lineCount: 0,
                      description,
                      isTitled
                    });
                  }
                }
                j++;
              }
            }
          }
          skipLine = true;
          break;
        }
      }
      if (skipLine) continue;
      
      // Process comma-separated or "and/e" separated character names
      const listMatch = line.match(/^([A-Z][A-Z\s.']+)(?:,\s+|\s+(?:and|e)\s+)([A-Z][A-Z\s.']+)/);
      if (listMatch) {
        // Split by comma and "and/e"
        const names = line.split(/(?:,\s+|\s+(?:and|e)\s+)/);
        for (const name of names) {
          const trimmedName = name.trim();
          if (/^[A-Z]/.test(trimmedName) && !rolesMap.has(trimmedName)) {
            rolesMap.set(trimmedName, { 
              primaryName: trimmedName, 
              aliases: [], 
              lineCount: 0
            });
          }
        }
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
        // Check if name has a title
        const isTitled = /^(?:Sig(?:nor)?a?|Prof|Dott)\.?\s+/i.test(name);
        
        if (!rolesMap.has(name)) {
          rolesMap.set(name, { 
            primaryName: name, 
            aliases: [], 
            lineCount: 0,
            isTitled: isTitled || undefined
          });
        }
      }
    }
    
    // Convert the map to an array for the final result
    return Array.from(rolesMap.values());
  }
  
  /**
   * Extract roles from structured format script (using @roles section)
   * @param {string} scriptText - The structured format script text
   * @returns {Array<{primaryName: string, aliases: string[], description: string}>} - Array of roles
   */
  static extractRolesFromStructuredFormat(scriptText) {
    const rolesHelper = require('../utils/rolesHelper');
    return rolesHelper.parseStructuredRoles(scriptText);
  }

  /**
   * Extract metadata from structured format script (@title, @author, etc.)
   * @param {string} scriptText - The structured format script text
   * @returns {object} - Metadata object
   */
  static extractMetadataFromStructuredFormat(scriptText) {
    const metadata = {
      title: '',
      author: '',
      date: '',
      description: ''
    };
    
    // Extract title
    const titleMatch = scriptText.match(/@title\s*"([^"]+)"/);
    if (titleMatch) {
      metadata.title = titleMatch[1];
    }
    
    // Extract author
    const authorMatch = scriptText.match(/@author\s*"([^"]+)"/);
    if (authorMatch) {
      metadata.author = authorMatch[1];
    }
    
    // Extract date
    const dateMatch = scriptText.match(/@date\s*"([^"]+)"/);
    if (dateMatch) {
      metadata.date = dateMatch[1];
    }
    
    return metadata;
  }

  /**
   * Extract scenes from structured format script
   * @param {string} scriptText - The structured format script text
   * @returns {Array} - Array of scene objects
   */
  static extractScenesFromStructuredFormat(scriptText) {
    const scenes = [];
    
    // Extract scene sections
    const sceneRegex = /@scene\s*"([^"]+)"\s*\{([\s\S]*?)(?=@scene|$)/g;
    let sceneMatch;
    
    while ((sceneMatch = sceneRegex.exec(scriptText)) !== null) {
      const sceneTitle = sceneMatch[1];
      const sceneContent = sceneMatch[2];
      
      const scene = {
        title: sceneTitle,
        directions: [],
        sections: []
      };
      
      // Extract scene directions
      const directionRegex = /direction\s*\{\s*"""([\s\S]*?)"""\s*\}/g;
      let directionMatch;
      
      while ((directionMatch = directionRegex.exec(sceneContent)) !== null) {
        scene.directions.push(directionMatch[1].trim());
      }
      
      // Extract sections
      const sectionRegex = /section\s*"([^"]+)"\s*\{([\s\S]*?)(?=section|$)/g;
      let sectionMatch;
      
      while ((sectionMatch = sectionRegex.exec(sceneContent)) !== null) {
        const sectionTitle = sectionMatch[1];
        const sectionContent = sectionMatch[2];
        
        const section = {
          title: sectionTitle,
          dialogues: [],
          directions: []
        };
        
        // Extract section directions
        const sectionDirRegex = /direction\s*\{\s*"""([\s\S]*?)"""\s*\}/g;
        let sectionDirMatch;
        
        while ((sectionDirMatch = sectionDirRegex.exec(sectionContent)) !== null) {
          section.directions.push(sectionDirMatch[1].trim());
        }
        
        // Extract dialogues
        const dialogueRegex = /"([^"]+)":\s*"""([\s\S]*?)"""/g;
        let dialogueMatch;
        
        while ((dialogueMatch = dialogueRegex.exec(sectionContent)) !== null) {
          const character = dialogueMatch[1];
          const text = dialogueMatch[2].trim();
          
          // Check for stage direction in parentheses
          const stageDirectionMatch = text.match(/^\s*\(([^)]+)\)(.*)/);
          const dialogue = {
            character,
            text,
            hasStageDirection: !!stageDirectionMatch,
            stageDirection: stageDirectionMatch ? stageDirectionMatch[1].trim() : null
          };
          
          section.dialogues.push(dialogue);
        }
        
        scene.sections.push(section);
      }
      
      scenes.push(scene);
    }
    
    return scenes;
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
    
    // Structure script lines with metadata
    const structuredLines = processedLines.map(line => {
      // Check if this is a character dialogue
      const characterMatch = line.match(/^([A-Z][A-Za-z0-9_\s''\-\.]+)(?:\s*(?:\(.*\))?\s*:)(.*)/);
      if (characterMatch) {
        const character = characterMatch[1].trim();
        const dialogue = characterMatch[2].trim();
        return {
          character,
          dialogue,
          isDirection: false,
          text: line
        };
      } else if (line.startsWith('(') && line.endsWith(')')) {
        // This is a stage direction
        return {
          character: null,
          dialogue: null,
          isDirection: true,
          text: line,
          direction: line.substring(1, line.length - 1)
        };
      } else {
        // This is some other text (could be a scene heading or description)
        return {
          character: null,
          dialogue: null,
          isDirection: false,
          text: line
        };
      }
    });
    
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
      lines: structuredLines
    };
  }

  /**
   * Parse a structured script into an organized format
   * @param {string} scriptText - The structured script text
   * @returns {object} - Parsed script object
   */
  static parseStructuredScript(scriptText) {
    // Get metadata, roles, and scenes
    const metadata = this.extractMetadataFromStructuredFormat(scriptText);
    const roles = this.extractRolesFromStructuredFormat(scriptText);
    const scenes = this.extractScenesFromStructuredFormat(scriptText);
    
    return {
      metadata,
      roles,
      scenes,
      text: scriptText
    };
  }

  /**
   * Convert structured script format to plain text
   * @param {string} structuredScript - The structured script text
   * @returns {string} - Plain text version of the script
   */
  static convertStructuredToPlainText(structuredScript) {
    let plainText = '';
    const parsedScript = this.parseStructuredScript(structuredScript);
    
    // Add title and author
    plainText += parsedScript.metadata.title + '\n\n';
    if (parsedScript.metadata.author) {
      plainText += 'by ' + parsedScript.metadata.author + '\n\n';
    }
    
    // Add role list
    plainText += 'CHARACTERS:\n';
    for (const role of parsedScript.roles) {
      plainText += role.primaryName + ' - ' + role.description + '\n';
    }
    plainText += '\n';
    
    // Add scenes
    for (const scene of parsedScript.scenes) {
      plainText += scene.title + '\n\n';
      
      // Add scene directions
      for (const direction of scene.directions) {
        plainText += '(' + direction + ')\n\n';
      }
      
      // Add sections
      for (const section of scene.sections) {
        if (section.title) {
          plainText += section.title + '\n\n';
        }
        
        // Add section directions
        for (const direction of section.directions) {
          plainText += '(' + direction + ')\n';
        }
        
        // Add dialogues
        for (const dialogue of section.dialogues) {
          const dialogueText = dialogue.hasStageDirection ? 
            `${dialogue.character}: (${dialogue.stageDirection}) ${dialogue.text.replace(/^\s*\([^)]+\)\s*/, '')}` :
            `${dialogue.character}: ${dialogue.text}`;
            
          plainText += dialogueText + '\n';
        }
        plainText += '\n';
      }
    }
    
    return plainText;
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

module.exports = ScriptProcessor;
