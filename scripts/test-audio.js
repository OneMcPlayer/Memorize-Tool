/**
 * Simplified script to run audio tests
 */

const { execSync } = require('child_process');

// Run the Cypress tests
console.log('Running audio tests...');
try {
  // Run the Cypress tests in interactive mode
  execSync('npx cypress open --e2e', {
    stdio: 'inherit'
  });
  
  console.log('Cypress test runner opened. Please select the audio-tests.cy.js file to run the tests.');
} catch (error) {
  console.error('Error opening Cypress:', error);
  process.exit(1);
}
