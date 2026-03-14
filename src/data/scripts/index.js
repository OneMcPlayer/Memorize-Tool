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
import aPorteChiuseJson from './a-porte-chiuse.json';
import aPorteChiuseTerzaScenaJson from './a-porte-chiuse-terza-scena.json';
import finaleDiPartitaJson from './finale-di-partita.json';
import ilCompleannoJson from './il-compleanno.json';
import ilCalapranziJson from './il-calapranzi.json';
import raccontoDInvernoJson from './racconto-dinverno.json';
import misuraPerMisuraJson from './misura-per-misura.json';
import laSignorinaJulieJson from './la-signorina-julie.json';
import casaDiBambolaJson from './casa-di-bambola.json';
import scenaFrateLorenzoJson from './scena-frate-lorenzo.json';
import tartuffoJson from './tartuffo.json';

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
  },
  {
    id: 'a-porte-chiuse',
    title: 'A PORTE CHIUSE',
    author: 'Jean-Paul Sartre',
    description: 'Excerpt between Garcin and the waiter from No Exit',
    language: 'it'
  },
  {
    id: 'a-porte-chiuse-terza-scena',
    title: 'A PORTE CHIUSE - TERZA SCENA',
    author: 'Jean-Paul Sartre',
    description: 'Third-scene excerpt featuring Garcin, Ines, and the waiter',
    language: 'it'
  },
  {
    id: 'finale-di-partita',
    title: 'FINALE DI PARTITA',
    author: 'Samuel Beckett',
    description: 'Excerpt between Hamm and Clov from Endgame',
    language: 'it'
  },
  {
    id: 'il-compleanno',
    title: 'IL COMPLEANNO',
    author: 'Harold Pinter',
    description: 'Excerpt between Goldberg and McCann from The Birthday Party',
    language: 'it'
  },
  {
    id: 'il-calapranzi',
    title: 'IL CALAPRANZI',
    author: 'Harold Pinter',
    description: 'Excerpt between Ben and Gus from The Dumb Waiter',
    language: 'it'
  },
  {
    id: 'racconto-dinverno',
    title: 'RACCONTO D\'INVERNO',
    author: 'William Shakespeare',
    description: 'Excerpt between Leonte and Camillo from The Winter\'s Tale',
    language: 'it'
  },
  {
    id: 'misura-per-misura',
    title: 'MISURA PER MISURA',
    author: 'William Shakespeare',
    description: 'Excerpt between Angelo and Isabella from Measure for Measure',
    language: 'it'
  },
  {
    id: 'la-signorina-julie',
    title: 'LA SIGNORINA JULIE',
    author: 'August Strindberg',
    description: 'Excerpt between Jean, Kristina, and Miss Julie',
    language: 'it'
  },
  {
    id: 'casa-di-bambola',
    title: 'CASA DI BAMBOLA',
    author: 'Henrik Ibsen',
    description: 'Excerpt between Nora and Krogstad from A Doll\'s House',
    language: 'it'
  },
  {
    id: 'scena-frate-lorenzo',
    title: 'SCENA FRATE LORENZO',
    author: 'William Shakespeare',
    description: 'Scene between Romeo and Friar Laurence from Romeo and Juliet',
    language: 'it'
  },
  {
    id: 'tartuffo',
    title: 'TARTUFFO',
    author: 'Moliere',
    description: 'Excerpt between Orgone, Marianna, and Dorina',
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
    case 'a-porte-chiuse':
      return aPorteChiuseJson;
    case 'a-porte-chiuse-terza-scena':
      return aPorteChiuseTerzaScenaJson;
    case 'finale-di-partita':
      return finaleDiPartitaJson;
    case 'il-compleanno':
      return ilCompleannoJson;
    case 'il-calapranzi':
      return ilCalapranziJson;
    case 'racconto-dinverno':
      return raccontoDInvernoJson;
    case 'misura-per-misura':
      return misuraPerMisuraJson;
    case 'la-signorina-julie':
      return laSignorinaJulieJson;
    case 'casa-di-bambola':
      return casaDiBambolaJson;
    case 'scena-frate-lorenzo':
      return scenaFrateLorenzoJson;
    case 'tartuffo':
      return tartuffoJson;
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
