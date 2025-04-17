/**
 * Script Library for the React version of the Script Memorization Tool
 * This file exports all available scripts and provides a function to get script content
 */

import { laRivoluzioneScript } from './la-rivoluzione';

// Sample script content for testing
const sampleScript = `NARRATOR: In a small town, two friends meet on a sunny day.
ALICE: Hello, Bob! How are you today?
BOB: I'm doing well, thank you. How about yourself?
ALICE: I'm great! I was just thinking about our project.
BOB: Oh, the science project? I've been working on it all week.
ALICE: Me too! I think we're making good progress.
BOB: Definitely. I finished the research part yesterday.
ALICE: Perfect! I've completed the introduction and methodology sections.
BOB: That's excellent news. Shall we meet at the library tomorrow?
ALICE: That sounds like a plan. What time works for you?
BOB: How about 3 PM after classes?
ALICE: 3 PM works perfectly for me. I'll bring my notes.
BOB: Great! I'll bring the research materials and my laptop.
NARRATOR: The two friends continue their conversation as they walk down the street, excited about their collaboration.`;

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
 * @returns {string} The script content or empty string if not found
 */
export const getScriptContent = (scriptId) => {
  switch (scriptId) {
    case 'sample-script':
      return sampleScript;
    case 'la-rivoluzione':
      return laRivoluzioneScript;
    default:
      console.warn(`Script with ID "${scriptId}" not found`);
      return '';
  }
};

/**
 * Get all available scripts
 * @returns {Array} Array of script metadata objects
 */
export const getAvailableScripts = () => {
  return scriptCatalog;
};
