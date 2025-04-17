/**
 * Script Library for the React version of the Script Memorization Tool
 * This file exports all available scripts and provides a function to get script content
 */

// Import JSON script files
import sampleScriptJson from './sample-script.json';
import laRivoluzioneJson from './la-rivoluzione.json';

// Script catalog
export const scriptCatalog = [
  {
    id: 'sample-script',
    title: 'Sample Script',
    description: 'A simple conversation between two friends about a school project',
    language: 'en'
  },
  {
    id: 'la-rivoluzione',
    title: 'LA RIVOLUZIONE',
    author: 'Achille Campanile',
    description: 'A satirical play about a revolution and a prefect with a mechanical arm',
    language: 'it'
  }
];

/**
 * Get script content by ID
 * @param {string} scriptId - The ID of the script to retrieve
 * @returns {string|object} The script content (string for backward compatibility, object for JSON format)
 */
export const getScriptContent = (scriptId) => {
  switch (scriptId) {
    case 'sample-script':
      return sampleScriptJson;
    case 'la-rivoluzione':
      return laRivoluzioneJson;
    default:
      console.warn(`Script with ID "${scriptId}" not found`);
      return '';
  }
};

/**
 * Convert JSON script to text format for backward compatibility
 * @param {object} scriptJson - The script in JSON format
 * @returns {string} The script in text format
 */
export const convertJsonScriptToText = (scriptJson) => {
  if (!scriptJson || !scriptJson.lines) {
    return '';
  }

  return scriptJson.lines.map(line => `${line.speaker}: ${line.line}`).join('\n');
};

/**
 * Get all available scripts
 * @returns {Array} Array of script metadata objects
 */
export const getAvailableScripts = () => {
  return scriptCatalog;
};
