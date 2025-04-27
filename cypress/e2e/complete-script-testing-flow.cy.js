/// <reference types="cypress" />

describe('Complete Script Testing Flow', () => {
  beforeEach(() => {
    // Visit the application
    cy.visit('/');
    
    // Wait for the app to load
    cy.contains('Script Memorization').should('be.visible');
  });
  
  it('should complete the entire script testing flow', () => {
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
    
    // First line: Use "Need Help" to see the line
    cy.contains('Need Help?').click();
    cy.contains('To be or not to be').should('be.visible');
    cy.contains('Hide Line').click();
    
    // Say the line and proceed
    cy.contains('I Said My Line').click();
    
    // Wait for the line to be shown briefly and then hidden
    cy.wait(2500);
    
    // Second line: Say the line directly
    cy.contains('I Said My Line').click();
    
    // Wait for the line to be shown briefly and then hidden
    cy.wait(2500);
    
    // Third line: Say the line directly
    cy.contains('I Said My Line').click();
    
    // Wait for the line to be shown briefly and then hidden
    cy.wait(2500);
    
    // Verify we see the completion screen
    cy.contains('Complete!').should('be.visible');
    cy.contains('You have completed testing all your lines!').should('be.visible');
    
    // Click the restart button
    cy.contains('Restart').click();
    
    // Verify we're back in the input view
    cy.contains('Script Memorization').should('be.visible');
  });
});
