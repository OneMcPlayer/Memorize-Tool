export class ScriptProcessor {
  static preProcessScript(scriptText) {
    let text = scriptText.replace(/\r\n/g, '\n')
                        .replace(/\n{3,}/g, '\n\n');
    
    let lines = text.split('\n');
    let processedLines = [];
    let currentLine = '';
    let lastCharacterName = '';
    let isStageDirection = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      if (!line) {
        if (currentLine) {
          processedLines.push(currentLine);
          currentLine = '';
        }
        continue;
      }

      if (line.startsWith('(')) {
        isStageDirection = true;
      }

      // More lenient character name matching
      const characterMatch = line.match(/^([A-Z][A-Za-z\s]+)(?:\s*:?\s*)(.*)/);
      
      if (characterMatch && !isStageDirection) {
        if (currentLine) {
          processedLines.push(currentLine);
        }
        
        lastCharacterName = characterMatch[1].trim();
        currentLine = `${lastCharacterName}: ${characterMatch[2]}`;
      } else {
        if (currentLine) {
          const connector = currentLine.endsWith('-') ? '' : 
                          (currentLine.endsWith('(') || line.startsWith(')')) ? '' : ' ';
          currentLine += connector + line;
        } else if (lastCharacterName && !isStageDirection) {
          currentLine = `${lastCharacterName}: ${line}`;
        } else {
          currentLine = line;
        }
      }

      if (line.endsWith(')')) {
        isStageDirection = false;
      }
    }

    if (currentLine) {
      processedLines.push(currentLine);
    }

    return processedLines;
  }

  static extractCharacterLines(scriptLines, characterData, precedingCount) {
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

    // Create regex pattern that matches any alias
    const escapedAliases = characterAliases.map(alias => 
      alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const regexPattern = `^\\s*(${escapedAliases.join('|')})\\s*:?`;
    const regex = new RegExp(regexPattern, "i");
    
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
    return extractedLines;
  }

  /**
   * Extracts roles from an array of script lines.
   * 
   * @param {string[]} scriptLines - An array of strings representing lines from the script.
   * @returns {Map<string, {primaryName: string, aliases: string[]}>} - A map where keys are role names and values are objects containing the primary name and aliases.
   */
  static extractRolesFromPlainText(scriptLines) {
    const roles = new Map();
    
    const skipPatterns = [
      /^\(.*\)$/,
      /^(?:entra|esce|detti)/i,
      /^la scena/i,
      /^(?:sipario|atto|scena)/i,
    ];

    const addRole = (name) => {
      const cleanName = name.trim().replace(/\s+/g, ' ');
      if (!roles.has(cleanName) && cleanName.length > 1) {
        roles.set(cleanName, {
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
        /^([A-Z][A-Z\s''.\-]+)(?=:)/,  // Name before colon
        /^([A-Z][A-Z\s''.\-]+)$/,       // Standalone all-caps name
        /^([A-Z][A-Z\s''.\-]+(?:\s*(?:,|e)\s*[A-Z][A-Z\s''.\-]+)+)$/ // List of names
      ];

      for (const pattern of namePatterns) {
        const match = line.match(pattern);
        if (match) {
          if (match[1].includes(',') || match[1].includes(' e ')) {
            match[1].split(/(?:\s*,\s*|\s+e\s+)/).forEach(name => addRole(name));
          } else {
            addRole(match[1]);
          }
          break;
        }
      }
    }
    
    return roles;
  }
}
