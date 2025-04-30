/// <reference types="cypress" />

describe('Debug Interactive Mode Test', () => {
  it('should navigate through the interactive mode with debug mode enabled', () => {
    // Visit the application
    cy.visit('/');
    
    // Select a sample script
    cy.get('#scriptLibrary').select('sample-script');
    
    // Wait for character selection to appear
    cy.contains('Select Your Character').should('be.visible');
    
    // Select a character
    cy.get('select#characterSelect').select('ALICE');
    
    // Click the Interactive Practice button
    cy.contains('Interactive Practice').click();
    
    // Verify the interactive memorization view is loaded
    cy.contains('Interactive Memorization Practice').should('be.visible');
    
    // Verify the start button exists and click it
    cy.contains('button', 'Start Practice').should('exist').click();
    
    // Wait for the system to process (debug mode should skip API calls)
    cy.wait(3000);
    
    // Verify the "I Said My Line" button appears
    cy.contains('button', 'I Said My Line').should('exist').click();
    
    // Verify that the user's line is shown with the "Continue to Next Line" button
    cy.contains('button', 'Continue to Next Line').should('exist').click();
    
    // Verify we can go back to the menu
    cy.contains('button', 'Back to Menu').should('exist').click();
    
    // Verify we're back at the main view
    cy.contains('Script Memorization').should('be.visible');
  });
});
