/**
 * Script Library for the React version of the Script Memorization Tool
 * This file exports all available scripts and provides a function to get script content
 */

// Import JSON script files
import sampleScriptJson from './sample-script.json';
import laRivoluzioneJson from './la-rivoluzione.json';
import inventoreCavalloJson from './inventore-cavallo.json';
import eranoUnPoNervosiJson from './erano-un-po-nervosi.json';
import seGliUominiAvesseroLaCodaJson from './se-gli-uomini-avessero-la-coda.json';
import unaMoglieNervosaJson from './una-moglie-nervosa.json';
import visitaCondoglianzeJson from './visita-condoglianze.json';
import laGallinaCantaJson from './150-la-gallina-canta.json';

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
  },
  {
    id: 'inventore-cavallo',
    title: 'L\'INVENTORE DEL CAVALLO',
    author: 'Achille Campanile',
    description: 'A humorous play about a man who claims to have invented the horse',
    language: 'it'
  },
  {
    id: 'erano-un-po-nervosi',
    title: 'ERANO UN PO\' NERVOSI',
    author: 'Achille Campanile',
    description: 'A comedy about nervous characters',
    language: 'it'
  },
  {
    id: 'se-gli-uomini-avessero-la-coda',
    title: 'SE GLI UOMINI AVESSERO LA CODA',
    author: 'Achille Campanile',
    description: 'A satirical play imagining if humans had tails',
    language: 'it'
  },
  {
    id: 'una-moglie-nervosa',
    title: 'UNA MOGLIE NERVOSA',
    author: 'Achille Campanile',
    description: 'A comedy about a nervous wife',
    language: 'it'
  },
  {
    id: 'visita-condoglianze',
    title: 'VISITA DI CONDOGLIANZE',
    author: 'Achille Campanile',
    description: 'A humorous play about a condolence visit',
    language: 'it'
  },
  {
    id: '150-la-gallina-canta',
    title: '150 - LA GALLINA CANTA',
    author: 'Achille Campanile',
    description: 'A comedy about a singing hen',
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
    case 'inventore-cavallo':
      return inventoreCavalloJson;
    case 'erano-un-po-nervosi':
      return eranoUnPoNervosiJson;
    case 'se-gli-uomini-avessero-la-coda':
      return seGliUominiAvesseroLaCodaJson;
    case 'una-moglie-nervosa':
      return unaMoglieNervosaJson;
    case 'visita-condoglianze':
      return visitaCondoglianzeJson;
    case '150-la-gallina-canta':
      return laGallinaCantaJson;
    default:
      // Script not found
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

  // Make sure to properly format each line with the speaker and dialogue
  return scriptJson.lines.map(line => `${line.speaker}: ${line.line}`).join('\n');
};

/**
 * Get all available scripts
 * @returns {Array} Array of script metadata objects
 */
export const getAvailableScripts = () => {
  return scriptCatalog;
};
