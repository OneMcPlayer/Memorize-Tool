import { parseRolesBlock } from '/Memorize-Tool/js/utils/rolesHelper.js';

export class Script {
  constructor() {
    this.metadata = {};
    this.roles = [];
    this.scenes = [];
    this.text = ''; // will hold original script text
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

      let currentSection = null; // "roles", "scene", "dialogue", or "multiline"
      let currentScene = null;
      let multiLineBuffer = [];
      let multiLineKey = null;  // e.g., "description", or "dialogue-speech"
      let currentSpeaker = null;

      // Helper to finish multiline block
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
          // Use the rolesHelper function
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
            // If there was a previous scene, push it
            if (currentScene) {
              script.scenes.push(currentScene);
            }
            currentScene = { title: match[1], context: {}, description: '', dialogue: {} };
            currentSection = 'scene';
          }
          continue;
        }

        // End of a scene block
        if (line === '}') {
          if (currentSection === 'scene' && currentScene) {
            script.scenes.push(currentScene);
            currentScene = null;
            currentSection = null;
          } else if (currentSection === 'dialogue') {
            // End dialogue block, return to scene scope
            currentSection = 'scene';
          } else if (currentSection === 'multiline') {
            // We were reading a multiline description or dialogue - finalize
            if (multiLineKey === 'description') {
              currentScene.description = finishMultiline();
            } else if (multiLineKey === 'dialogue-speech') {
              // finalize this speaker's text
              const finalText = finishMultiline();
              if (!currentScene.dialogue[currentSpeaker]) {
                currentScene.dialogue[currentSpeaker] = [];
              }
              currentScene.dialogue[currentSpeaker].push(finalText);
            }
            multiLineBuffer = [];
            multiLineKey = null;
            currentSection = 'scene';
          }
          continue;
        }

        // ========================
        // WITHIN A SCENE BLOCK
        // ========================
        if (currentSection === 'scene') {
          // Basic context lines
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

          // Possibly a multi-line description
          if (line.startsWith('description:')) {
            if (line.includes('"""')) {
              // If it begins and ends in the same line
              const tripleQuotes = line.match(/"""/g);
              if (tripleQuotes && tripleQuotes.length >= 2) {
                const match = line.match(/description:\s*"""(.*)"""/);
                if (match) {
                  currentScene.description = match[1].trim();
                }
              } else {
                // Start multiline description
                multiLineBuffer = [];
                multiLineKey = 'description';
                const startIdx = line.indexOf('"""') + 3;
                multiLineBuffer.push(line.substring(startIdx));
                currentSection = 'multiline';
              }
            }
            continue;
          }

          // Start of dialogue block
          if (line.startsWith('dialogue {')) {
            currentSection = 'dialogue';
            continue;
          }
        }

        // ========================
        // DIALOGUE SECTION
        // ========================
        if (currentSection === 'dialogue') {
          // 1) Attempt to match a single-line dialogue: 
          //    "SPEAKER": """Some text"""
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

          // 2) Attempt to match start of a multi-line dialogue:
          //    "SPEAKER": """
          //    (some lines)
          //    """
          let multiLineStart = line.match(/^"([^"]+)":\s*"""(.*)$/);
          if (multiLineStart) {
            currentSpeaker = multiLineStart[1];
            // The line may have partial text after """ on the same line
            let afterTriple = multiLineStart[2] || '';
            multiLineBuffer = [];
            if (afterTriple.includes('"""')) {
              // Edge case: it might open and close on same line
              let endIdx = afterTriple.indexOf('"""');
              let leftover = afterTriple.substring(0, endIdx).trim();
              multiLineBuffer.push(leftover);
              // finalize
              const finalText = finishMultiline();
              if (!currentScene.dialogue[currentSpeaker]) {
                currentScene.dialogue[currentSpeaker] = [];
              }
              currentScene.dialogue[currentSpeaker].push(finalText);
              currentSection = 'dialogue'; // remain in dialogue
              multiLineBuffer = [];
              multiLineKey = null;
              currentSpeaker = null;
            } else {
              // Normal multi-line
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
            // We found the closing triple quotes
            // push everything before """
            let leftover = line.substring(0, endIdx).trim();
            multiLineBuffer.push(leftover);

            let finalText = finishMultiline();
            if (!currentScene.dialogue[currentSpeaker]) {
              currentScene.dialogue[currentSpeaker] = [];
            }
            currentScene.dialogue[currentSpeaker].push(finalText);

            // Cleanup
            multiLineBuffer = [];
            multiLineKey = null;
            currentSpeaker = null;
            // return to normal dialogue mode
            currentSection = 'dialogue';
          } else {
            // no triple quotes, just accumulate
            multiLineBuffer.push(line);
          }
          continue;
        }

        // ========================
        // MULTILINE DESCRIPTION
        // (already partly handled above)
        // ========================
        if (currentSection === 'multiline') {
          // Check if we reached the closing """ on this line
          let endIdx = line.indexOf('"""');
          if (endIdx !== -1) {
            // close multiline
            multiLineBuffer.push(line.substring(0, endIdx));
            const final = finishMultiline();
            if (multiLineKey === 'description') {
              currentScene.description = final;
            }
            // cleanup
            multiLineBuffer = [];
            multiLineKey = null;
            // back to scene context
            currentSection = 'scene';
          } else {
            // continue reading the description
            multiLineBuffer.push(line);
          }
          continue;
        }
      }

      // If a scene was open and not closed
      if (currentScene) {
        script.scenes.push(currentScene);
      }
      return script;
    }

    // ========================
    // DO THE PARSE
    // ========================
    const parsed = parseUniScript(content);

    // Instantiate our Script object
    const script = new Script();
    script.metadata = parsed.header;
    script.roles = parsed.roles;
    script.scenes = parsed.scenes;
    script.text = content; // original content

    return script;
  }
}