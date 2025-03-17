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
}
