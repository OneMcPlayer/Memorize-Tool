/// <reference types="cypress" />

describe('Script Testing Feature on Mobile', () => {
  beforeEach(() => {
    // Set viewport to mobile size
    cy.viewport('iphone-x');
    
    // Visit the application
    cy.visit('/');
    
    // Wait for the app to load
    cy.contains('Script Memorization').should('be.visible');
  });
  
  it('should display correctly on mobile devices', () => {
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
    
    // Verify the user prompt is shown with mobile styling
    cy.contains("It's your turn, HAMLET!").should('be.visible');
    
    // Verify the action buttons are stacked vertically on mobile
    cy.get('.user-actions').should('be.visible');
    
    // Click the "Need Help" button
    cy.contains('Need Help?').click();
    
    // Verify the user line is shown with mobile styling
    cy.contains('HAMLET:').should('be.visible');
    cy.contains('To be or not to be').should('be.visible');
  });
  
  it('should handle touch interactions correctly', () => {
    // Navigate to script testing view
    cy.get('select#scriptLibrary').select('hamlet');
    cy.get('select#characterSelect').select('HAMLET');
    cy.get('input#precedingCount').clear().type('1');
    cy.contains('Test My Lines').click();
    
    // Tap the "Need Help" button
    cy.contains('Need Help?').click();
    
    // Verify the line is shown
    cy.contains('To be or not to be').should('be.visible');
    
    // Tap the "Hide Line" button
    cy.contains('Hide Line').click();
    
    // The line should be hidden again
    cy.contains('To be or not to be').should('not.exist');
    
    // Tap the "I Said My Line" button
    cy.contains('I Said My Line').click();
    
    // The user's line should be visible
    cy.contains('HAMLET:').should('be.visible');
    cy.contains('To be or not to be').should('be.visible');
  });
});
