import { parseRolesBlock } from '/Memorize-Tool/js/utils/rolesHelper.js';

export class Script {
  constructor() {
    this.metadata = {};
    this.roles = [];
    this.scenes = [];
    this.text = ''; // will hold original script text
  }

  static fromStructuredText(content) {
    // New parser function
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
      let multiLineKey = null; // e.g., "description"

      // Helper to finish multiline block
      function finishMultiline() {
        return multiLineBuffer.join('\n').trim();
      }

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue; // skip empty lines

        // HEADER TAGS
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

        // ROLES SECTION
        if (line.startsWith('@roles')) {
          currentSection = 'roles';
          continue;
        }
        if (line.startsWith('@endroles')) {
          currentSection = null;
          continue;
        }
        if (currentSection === 'roles') {
          // Use the rolesHelper function instead of inline regex parsing.
          const roleData = parseRolesBlock(line);
          if(roleData.aliases.length > 0) {
            script.roles.push(roleData);
          }
          continue;
        }

        // SCENE START
        if (line.startsWith('@scene')) {
          const match = line.match(/@scene\s+"([^"]+)"/);
          if (match) {
            if (currentScene) {
              script.scenes.push(currentScene);
            }
            currentScene = { title: match[1], context: {}, dialogue: {} };
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
          }
          continue;
        }

        // Within a scene block
        if (currentSection === 'scene') {
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
          if (line.startsWith('description:')) {
            if (line.includes('"""')) {
              const tripleQuotes = line.match(/"""/g);
              if (tripleQuotes && tripleQuotes.length >= 2) {
                const match = line.match(/description:\s*"""(.*)"""/);
                if (match) {
                  currentScene.description = match[1].trim();
                }
              } else {
                multiLineBuffer = [];
                multiLineKey = 'description';
                const startIdx = line.indexOf('"""') + 3;
                multiLineBuffer.push(line.substring(startIdx));
                currentSection = 'multiline';
              }
            }
            continue;
          }
          if (line.startsWith('dialogue {')) {
            currentSection = 'dialogue';
            continue;
          }
        }

        if (currentSection === 'dialogue') {
          if (line === '}') {
            currentSection = 'scene';
            continue;
          }
          const match = line.match(/"([^"]+)":\s*"""(.*)"""/);
          if (match) {
            const speaker = match[1];
            const text = match[2].trim();
            currentScene.dialogue[speaker] = text;
          }
          continue;
        }

        if (currentSection === 'multiline') {
          if (line.includes('"""')) {
            const endIdx = line.indexOf('"""');
            multiLineBuffer.push(line.substring(0, endIdx));
            if (multiLineKey === 'description') {
              currentScene.description = finishMultiline();
            }
            multiLineBuffer = [];
            multiLineKey = null;
            currentSection = 'scene';
          } else {
            multiLineBuffer.push(line);
          }
          continue;
        }
      }
      return script;
    }

    const parsed = parseUniScript(content);
    const script = new Script();
    script.metadata = parsed.header;
    script.roles = parsed.roles;
    script.scenes = parsed.scenes;
    script.text = content; // Save original content
    return script;
  }
}
