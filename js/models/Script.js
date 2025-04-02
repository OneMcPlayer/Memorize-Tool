import { parseRolesBlock } from '../utils/rolesHelper.js';
import { ScriptProcessor } from '../services/ScriptProcessor.js';

export class Script {
  constructor() {
    this.metadata = {};
    this.roles = [];
    this.scenes = [];
    this.text = ''; // will hold original script text
    this.lines = []; // simplified representation of all lines
  }

  // Updated parse method that handles test cases correctly
  static parse(input) {
    if (!input) {
      return {
        title: '',
        roles: [],
        lines: []
      };
    }

    // Handle the specific test cases for simplicity
    // For actual production code we would want a more robust solution
    const lines = input.split('\n');
    
    const result = {
      title: '',
      roles: [],
      lines: []
    };

    // Special processing for test cases
    let currentSection = null;
    let currentCharacter = null;
    let currentDialog = [];
    let characterSection = false;
    
    // First pass to extract title and roles
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check for title
      if (line.startsWith('TITLE:')) {
        result.title = line.substring(6).trim();
        continue;
      }

      // Check for characters section
      if (line === 'CHARACTERS:') {
        characterSection = true;
        continue;
      }

      // Parse character definitions
      if (characterSection && line.includes(' - ')) {
        const parts = line.split(' - ');
        if (parts.length >= 2) {
          result.roles.push({
            name: parts[0].trim(),
            description: parts[1].trim()
          });
        }
      }
    }

    // Reset for second pass
    characterSection = false;
    
    // Second pass to process script lines
    let skipLine = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Skip title and character definition
      if (line.startsWith('TITLE:') || line === 'CHARACTERS:') {
        continue;
      }
      
      // Skip character definitions
      if (!characterSection && line.includes(' - ')) {
        const parts = line.split(' - ');
        if (parts.length >= 2 && result.roles.some(r => r.name === parts[0].trim())) {
          characterSection = true;
          continue;
        }
      }
      
      if (characterSection && line.includes(' - ')) {
        continue;
      }

      // At this point, we're past the metadata and into the actual script
      characterSection = false;
      
      // Check for scene headings
      if (line.match(/^(?:ACT|SCENE)\s+\d+$/)) {
        // End any ongoing dialog
        if (currentCharacter && currentDialog.length > 0) {
          result.lines.push({
            character: currentCharacter,
            text: currentDialog.join(' ').trim(),
            dialog: currentDialog.join(' ').trim(),
            isSceneHeading: false,
            isDirection: false
          });
          currentDialog = [];
          currentCharacter = null;
        }
        
        result.lines.push({
          character: null,
          text: line,
          isSceneHeading: true,
          isDirection: false
        });
        continue;
      }

      // Check for stage directions (both brackets and parentheses)
      if ((line.startsWith('[') && line.endsWith(']')) || 
          (line.startsWith('(') && line.endsWith(')'))) {
        // End any ongoing dialog
        if (currentCharacter && currentDialog.length > 0) {
          result.lines.push({
            character: currentCharacter,
            text: currentDialog.join(' ').trim(),
            dialog: currentDialog.join(' ').trim(),
            isSceneHeading: false,
            isDirection: false
          });
          currentDialog = [];
          currentCharacter = null;
        }
        
        result.lines.push({
          character: null,
          text: line,
          isSceneHeading: false,
          isDirection: true
        });
        continue;
      }

      // Check for character dialog
      const characterMatch = line.match(/^([A-Z][A-Z0-9_]+):\s*(.*)$/);
      if (characterMatch) {
        // End any ongoing dialog
        if (currentCharacter && currentDialog.length > 0) {
          result.lines.push({
            character: currentCharacter,
            text: currentDialog.join(' ').trim(),
            dialog: currentDialog.join(' ').trim(),
            isSceneHeading: false,
            isDirection: false
          });
          currentDialog = [];
        }
        
        currentCharacter = characterMatch[1];
        currentDialog = [characterMatch[2]];
      } else if (currentCharacter) {
        // This is a continuation of the current dialog
        currentDialog.push(line);
      }
    }

    // Add any remaining dialog
    if (currentCharacter && currentDialog.length > 0) {
      result.lines.push({
        character: currentCharacter,
        text: currentDialog.join(' ').trim(),
        dialog: currentDialog.join(' ').trim(),
        isSceneHeading: false,
        isDirection: false
      });
    }

    return result;
  }

  static fromStructuredText(content) {
    // Parser function
    function parseUniScript(dslText) {
      const lines = dslText.split('\n');
      const script = {
        header: {},
        roles: [],
        scenes: []
      };

      let currentSection = null; // "roles", "scene", "dialogue", "multiline", "multi-dialogue"
      let currentScene = null;
      let multiLineBuffer = [];
      let multiLineKey = null;  // e.g., "description" or "dialogue-speech"
      let currentSpeaker = null;

      // Helper to join and trim the multi-line buffer
      function finishMultiline() {
        return multiLineBuffer.join('\n').trim();
      }

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue; // skip empty lines

        // ========================
        // HEADER TAGS
        // ========================
        if (line.startsWith('@title')) {
          const match = line.match(/@title\s+"([^"]+)"/);
          if (match) script.header.title = match[1];
          continue;
        }
        if (line.startsWith('@author')) {
          const match = line.match(/@author\s+"([^"]+)"/);
          if (match) script.header.author = match[1];
          continue;
        }
        if (line.startsWith('@date')) {
          const match = line.match(/@date\s+"([^"]+)"/);
          if (match) script.header.date = match[1];
          continue;
        }
        if (line.startsWith('@description')) {
          const match = line.match(/@description\s+"([^"]+)"/);
          if (match) script.header.description = match[1];
          continue;
        }

        // ========================
        // ROLES SECTION
        // ========================
        if (line.startsWith('@roles')) {
          currentSection = 'roles';
          continue;
        }
        if (line.startsWith('@endroles')) {
          currentSection = null;
          continue;
        }
        if (currentSection === 'roles') {
          // Parse each role line using the helper function
          const roleData = parseRolesBlock(line);
          if (roleData.aliases.length > 0) {
            script.roles.push(roleData);
          }
          continue;
        }

        // ========================
        // SCENE START
        // ========================
        if (line.startsWith('@scene')) {
          const match = line.match(/@scene\s+"([^"]+)"/);
          if (match) {
            // Push previous scene if exists
            if (currentScene) {
              script.scenes.push(currentScene);
            }
            currentScene = { title: match[1], context: {}, description: '', dialogue: {} };
            currentSection = 'scene';
          }
          continue;
        }

        // End of a scene block or dialogue/multiline block
        if (line === '}') {
          if (currentSection === 'scene' && currentScene) {
            script.scenes.push(currentScene);
            currentScene = null;
            currentSection = null;
          } else if (currentSection === 'dialogue') {
            // End dialogue block, return to scene scope
            currentSection = 'scene';
          } else if (currentSection === 'multiline') {
            // Finalize a multiline description or dialogue block
            if (multiLineKey === 'description') {
              currentScene.description = finishMultiline();
            } else if (multiLineKey === 'dialogue-speech') {
              const finalText = finishMultiline();
              if (!currentScene.dialogue[currentSpeaker]) {
                currentScene.dialogue[currentSpeaker] = [];
              }
              currentScene.dialogue[currentSpeaker].push(finalText);
            }
            multiLineBuffer = [];
            multiLineKey = null;
            currentSection = 'scene';
          } else if (currentSection === 'multi-dialogue') {
            // <-- New branch: finalize multi-line dialogue if scene closes unexpectedly
            const finalText = finishMultiline();
            if (!currentScene.dialogue[currentSpeaker]) {
              currentScene.dialogue[currentSpeaker] = [];
            }
            currentScene.dialogue[currentSpeaker].push(finalText);
            multiLineBuffer = [];
            multiLineKey = null;
            currentSpeaker = null;
            currentSection = 'scene';
          }
          continue;
        }

        // ========================
        // WITHIN A SCENE BLOCK
        // ========================
        if (currentSection === 'scene') {
          // Process basic context properties
          if (line.startsWith('location:')) {
            currentScene.context.location = line.replace('location:', '').trim().replace(/"/g, '');
            continue;
          }
          if (line.startsWith('time:')) {
            currentScene.context.time = line.replace('time:', '').trim().replace(/"/g, '');
            continue;
          }
          if (line.startsWith('mood:')) {
            currentScene.context.mood = line.replace('mood:', '').trim().replace(/"/g, '');
            continue;
          }

          // Handle multi-line description
          if (line.startsWith('description:')) {
            if (line.includes('"""')) {
              const tripleQuotes = line.match(/"""/g);
              if (tripleQuotes && tripleQuotes.length >= 2) {
                const match = line.match(/description:\s*"""(.*)"""/);
                if (match) {
                  currentScene.description = match[1].trim();
                }
              } else {
                // Start a multi-line description block
                multiLineBuffer = [];
                multiLineKey = 'description';
                const startIdx = line.indexOf('"""') + 3;
                multiLineBuffer.push(line.substring(startIdx));
                currentSection = 'multiline';
              }
            }
            continue;
          }

          // Begin dialogue block
          if (line.startsWith('dialogue {')) {
            currentSection = 'dialogue';
            continue;
          }
        }

        // ========================
        // DIALOGUE SECTION
        // ========================
        if (currentSection === 'dialogue') {
          // Attempt a single-line dialogue: "SPEAKER": """Some text"""
          let singleLineMatch = line.match(/^"([^"]+)":\s*"""(.*?)"""\s*$/);
          if (singleLineMatch) {
            let speaker = singleLineMatch[1];
            let text = singleLineMatch[2].trim();
            if (!currentScene.dialogue[speaker]) {
              currentScene.dialogue[speaker] = [];
            }
            currentScene.dialogue[speaker].push(text);
            continue;
          }

          // Check for the start of a multi-line dialogue: "SPEAKER": """
          let multiLineStart = line.match(/^"([^"]+)":\s*"""(.*)$/);
          if (multiLineStart) {
            currentSpeaker = multiLineStart[1];
            let afterTriple = multiLineStart[2] || '';
            multiLineBuffer = [];
            if (afterTriple.includes('"""')) {
              // Edge case: opening and closing on the same line
              let endIdx = afterTriple.indexOf('"""');
              let leftover = afterTriple.substring(0, endIdx).trim();
              multiLineBuffer.push(leftover);
              const finalText = finishMultiline();
              if (!currentScene.dialogue[currentSpeaker]) {
                currentScene.dialogue[currentSpeaker] = [];
              }
              currentScene.dialogue[currentSpeaker].push(finalText);
              currentSection = 'dialogue';
              multiLineBuffer = [];
              multiLineKey = null;
              currentSpeaker = null;
            } else {
              // Start accumulating multi-line dialogue
              multiLineBuffer.push(afterTriple);
              multiLineKey = 'dialogue-speech';
              currentSection = 'multi-dialogue';
            }
            continue;
          }
        }

        // ========================
        // MULTI-DIALOGUE MODE
        // ========================
        if (currentSection === 'multi-dialogue') {
          let endIdx = line.indexOf('"""');
          if (endIdx !== -1) {
            // Found the closing triple quotes; capture any text before them
            let leftover = line.substring(0, endIdx).trim();
            multiLineBuffer.push(leftover);
            const finalText = finishMultiline();
            if (!currentScene.dialogue[currentSpeaker]) {
              currentScene.dialogue[currentSpeaker] = [];
            }
            currentScene.dialogue[currentSpeaker].push(finalText);
            multiLineBuffer = [];
            multiLineKey = null;
            currentSpeaker = null;
            currentSection = 'dialogue';
          } else {
            // Continue accumulating dialogue lines
            multiLineBuffer.push(line);
          }
          continue;
        }

        // ========================
        // MULTILINE DESCRIPTION MODE
        // ========================
        if (currentSection === 'multiline') {
          let endIdx = line.indexOf('"""');
          if (endIdx !== -1) {
            // End the multi-line description block
            multiLineBuffer.push(line.substring(0, endIdx));
            const final = finishMultiline();
            if (multiLineKey === 'description') {
              currentScene.description = final;
            }
            multiLineBuffer = [];
            multiLineKey = null;
            currentSection = 'scene';
          } else {
            // Keep accumulating the description lines
            multiLineBuffer.push(line);
          }
          continue;
        }
      }

      // Push any unclosed scene at the end
      if (currentScene) {
        script.scenes.push(currentScene);
      }
      return script;
    }

    // Parse the DSL content and populate the Script object
    const parsed = parseUniScript(content);

    const script = new Script();
    script.metadata = parsed.header;
    script.roles = parsed.roles;
    script.scenes = parsed.scenes;
    script.text = content;

    return script;
  }

  getUniqueSpeakers() {
    return Array.from(new Set(this.lines.map(line => line.speaker)));
  }
}