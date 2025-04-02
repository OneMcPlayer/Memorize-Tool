import { ScriptProcessor } from './ScriptProcessor.js';
import CharacterDictionary from '../models/CharacterDictionary.js';

/**
 * Utility class for converting between script formats
 */
export class ScriptConverter {
  constructor() {
    this.characterDictionary = new CharacterDictionary();
    // Preload some known characters and aliases
    this.characterDictionary.addCharacter('John', ['Johnny', 'J']);
    this.characterDictionary.addCharacter('Elizabeth', ['Liz', 'Beth']);
  }

  /**
   * Parse a basic script into structured components
   * @param {string} scriptText - The plain text script
   * @returns {Object} - Parsed script components
   */
  static parseBasicScript(scriptText) {
    if (!scriptText) {
      throw new Error('No script text provided');
    }
    
    // Use the consolidated parsing logic from ScriptProcessor
    return ScriptProcessor.parseNonStructuredScript(scriptText);
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
    const scenes = ScriptProcessor.extractScenes(processedLines);

    // 3. Initialize output with metadata
    let output = '';
    output += `@title "${metadata.title || 'Untitled Script'}"\n`;
    if (metadata.author) output += `@author "${metadata.author}"\n`;
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
      
      // Add dialogue section
      output += 'dialogue {\n';
      
      scene.lines.forEach(line => {
        // Handle stage directions
        if (line.startsWith('(') && line.endsWith(')')) {
          output += `  ${line}\n`;
          return;
        }
        
        // Parse character and line text
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          const character = match[1].trim();
          const text = match[2].trim();
          
          // Use triple-quote format for dialogue
          output += `  "${character}": """${text}"""\n\n`;
        } else {
          // Just add the line as-is if it doesn't match the pattern
          output += `  ${line}\n`;
        }
      });
      
      output += '}\n\n';
    });

    return output;
  }

  processScript(script) {
    // ...existing code...
    script.lines.forEach(line => {
      const speaker = this.identifySpeaker(line.speaker);
      // ...existing code to process the line...
    });
    // ...existing code...
  }

  identifySpeaker(speaker) {
    const mainCharacter = this.characterDictionary.findCharacterByAlias(speaker);
    return mainCharacter || speaker; // Return the main character or the original speaker
  }

  validateCharacters(script) {
    const uniqueSpeakers = new Set(script.lines.map(line => line.speaker));
    uniqueSpeakers.forEach(speaker => {
      const mainCharacter = this.characterDictionary.findCharacterByAlias(speaker);
      if (!mainCharacter) {
        console.log(`Unrecognized speaker: ${speaker}`);
        // Optionally prompt user for validation
      }
    });
  }
}

export default ScriptConverter;
