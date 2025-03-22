import { ScriptProcessor } from './ScriptProcessor.js';

/**
 * Utility class for converting between script formats
 */
export class ScriptConverter {
  /**
   * Parse a basic script into structured components
   * @param {string} scriptText - The plain text script
   * @returns {Object} - Parsed script components
   */
  static parseBasicScript(scriptText) {
    if (!scriptText) {
      throw new Error('No script text provided');
    }
    
    // Process the script to normalize it
    const processedLines = ScriptProcessor.preProcessScript(scriptText);
    
    // Extract roles
    const roles = ScriptProcessor.extractRolesFromPlainText(processedLines);
    
    // Extract basic metadata
    const metadata = this.#extractBasicMetadata(scriptText);
    
    return {
      ...metadata,
      roles,
      processedLines
    };
  }
  
  /**
   * Generate a structured script in DSL format
   * @param {string} sourceText - Original script text
   * @param {Object} metadata - Script metadata
   * @param {Array} roles - Character roles
   * @returns {string} - Structured script text
   */
  static generateStructuredScript(sourceText, metadata, roles) {
    // 1. Pre-process the script text
    const processedLines = ScriptProcessor.preProcessScript(sourceText);

    // 2. Extract scenes
    const scenes = this.#extractScenes(processedLines);

    // 3. Initialize output with metadata
    let output = '';
    output += `@title "${metadata.title || 'Untitled Script'}"\n`;
    if (metadata.author) output += `@title "${metadata.author}"\n`;
    if (metadata.date) output += `@date "${metadata.date}"\n`;
    if (metadata.description) output += `@description "${metadata.description}"\n`;
    output += '\n';

    // 4. Add roles
    output += '@roles\n';
    roles.forEach(role => {
      let roleLine = role.primaryName;
      
      // Add aliases if any
      if (role.aliases && role.aliases.length) {
        roleLine += ` [${role.aliases.join(', ')}]`;
      }
      
      // Add description if any
      if (role.description) {
        roleLine += `: ${role.description}`;
      }
      
      output += `${roleLine}\n`;
    });
    output += '@endroles\n\n';

    // 5. Append scenes with dialogue
    scenes.forEach(scene => {
      output += `@scene "${scene.title}"\n`;
      
      // Add scene context if available
      if (scene.location) output += `location: "${scene.location}"\n`;
      if (scene.time) output += `time: "${scene.time}"\n`;
      
      // Add scene description if available
      if (scene.description) {
        output += `description: """${scene.description}"""\n`;
      }
      
      output += '\n';
      
      // Add dialogue
      scene.lines.forEach(line => {
        // Handle stage directions
        if (line.startsWith('(') && line.endsWith(')')) {
          output += `${line}\n`;
          return;
        }
        
        // Parse character and line text
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          const character = match[1].trim();
          const text = match[2].trim();
          
          // Use triple-quote format for dialogue
          output += `"${character}": """${text}"""\n\n`;
        } else {
          // Just add the line as-is if it doesn't match the pattern
          output += `${line}\n`;
        }
      });
      
      output += '@endscene\n\n';
    });

    return output;
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
      if (potentialTitle && !potentialTitle.includes(':')) {
        metadata.title = potentialTitle;
      }
    }
    
    return metadata;
  }
  
  /**
   * Extract scenes from processed script lines
   * @private
   * @param {string[]} processedLines - Processed script lines
   * @returns {Array} - Extracted scenes
   */
  static #extractScenes(processedLines) {
    // Look for scene markers like "ACT I", "SCENE 1", etc.
    const sceneMarkerRegex = /^(ACT|SCENE|ACT \w+,? SCENE \w+)/i;
    
    let scenes = [];
    let currentScene = {
      title: 'Scene 1',
      location: '',
      time: '',
      description: '',
      lines: []
    };
    
    // Look for settings lines that might indicate location/time
    const settingRegex = /^(SETTING|LOCATION|TIME|PLACE):\s*(.+)$/i;
    
    processedLines.forEach(line => {
      // Check if it's a scene marker
      const sceneMatch = line.match(sceneMarkerRegex);
      if (sceneMatch) {
        // Save current scene if it has content
        if (currentScene.lines.length > 0) {
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
        
        if (settingType === 'setting' || settingType === 'location' || settingType === 'place') {
          currentScene.location = value;
        } else if (settingType === 'time') {
          currentScene.time = value;
        }
        return;
      }
      
      // Otherwise, add to current scene
      currentScene.lines.push(line);
    });
    
    // Add the final scene if it has content
    if (currentScene.lines.length > 0) {
      scenes.push(currentScene);
    }
    
    // If no scenes were explicitly marked, treat the whole script as one scene
    if (scenes.length === 0 && currentScene.lines.length > 0) {
      scenes = [currentScene];
    }
    
    return scenes;
  }
}
