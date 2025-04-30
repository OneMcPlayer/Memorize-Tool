/// <reference types="cypress" />

describe('Verify Interactive Mode', () => {
  it('should load the application and verify interactive mode button exists', () => {
    // Visit the application
    cy.visit('/');
    
    // Verify the title
    cy.title().should('contain', 'Script Memorization');
    
    // Verify basic elements
    cy.contains('Script Memorization').should('be.visible');
    cy.get('#scriptLibrary').should('exist');
    
    // Select a sample script
    cy.get('#scriptLibrary').select('sample-script');
    
    // Wait for character selection to appear
    cy.contains('Select Your Character').should('be.visible');
    
    // Select a character
    cy.get('select#characterSelect').select('ALICE');
    
    // Verify the Interactive Practice button exists
    cy.contains('Interactive Practice').should('exist');
  });
});
