/// <reference types="cypress" />

describe('Simple Interactive Mode Demo', () => {
  it('should load the application and navigate to interactive mode', () => {
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
    cy.get('button.memorization-practice-button').should('exist');
    
    // Click the Interactive Practice button
    cy.get('button.memorization-practice-button').click();
    
    // Wait for the view to load
    cy.wait(2000);
    
    // Verify we can go back to the main view
    cy.contains('button', 'Back to Menu').click();
    
    // Verify we're back at the main view
    cy.contains('Script Memorization').should('be.visible');
  });
});
