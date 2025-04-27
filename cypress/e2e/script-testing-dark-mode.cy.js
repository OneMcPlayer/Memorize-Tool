/// <reference types="cypress" />

describe('Script Testing Feature in Dark Mode', () => {
  beforeEach(() => {
    // Visit the application
    cy.visit('/');
    
    // Wait for the app to load
    cy.contains('Script Memorization').should('be.visible');
    
    // Enable dark mode
    cy.get('button[aria-label="Toggle dark mode"]').click();
    
    // Verify dark mode is enabled
    cy.get('body').should('have.class', 'dark-mode');
  });
  
  it('should display correctly in dark mode', () => {
    // Select a script from the library
    cy.get('select#scriptLibrary').select('hamlet');
    
    // Wait for character selection to appear
    cy.contains('Select Your Character').should('be.visible');
    
    // Select a character
    cy.get('select#characterSelect').select('HAMLET');
    
    // Set context lines
    cy.get('input#precedingCount').clear().type('1');
    
    // Click the "Test My Lines" button
    cy.contains('Test My Lines').click();
    
    // Verify we're in the script testing view
    cy.contains('Script Testing Mode').should('be.visible');
    
    // Verify the user prompt is shown with dark mode styling
    cy.contains("It's your turn, HAMLET!").should('be.visible');
    cy.get('.user-prompt').should('be.visible');
    
    // Verify the action buttons are shown with dark mode styling
    cy.contains('I Said My Line').should('be.visible');
    cy.contains('Need Help?').should('be.visible');
    
    // Click the "Need Help" button
    cy.contains('Need Help?').click();
    
    // Verify the user line is shown with dark mode styling
    cy.contains('HAMLET:').should('be.visible');
    cy.contains('To be or not to be').should('be.visible');
    cy.get('.user-line').should('be.visible');
  });
});
