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

  static extractCharacterLines(scriptLines, character, precedingCount) {
    // Make the matching case-insensitive and more flexible
    const escapedCharacter = character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^\\s*${escapedCharacter}\\s*:?`, "i");
    
    const extractedLines = [];
    for (let i = 0; i < scriptLines.length; i++) {
      if (regex.test(scriptLines[i])) {
        extractedLines.push({ index: i, line: scriptLines[i] });
      }
    }
    return extractedLines;
  }
}
