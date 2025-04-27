/// <reference types="cypress" />

describe('Script Testing Feature', () => {
  beforeEach(() => {
    // Visit the application
    cy.visit('/');
    
    // Wait for the app to load
    cy.contains('Script Memorization').should('be.visible');
  });
  
  it('should navigate to script testing view', () => {
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
    
    // Verify the user prompt is shown
    cy.contains("It's your turn, HAMLET!").should('be.visible');
    
    // Verify the action buttons are shown
    cy.contains('I Said My Line').should('be.visible');
    cy.contains('Need Help?').should('be.visible');
  });
  
  it('should show the line when "Need Help" is clicked', () => {
    // Navigate to script testing view
    cy.get('select#scriptLibrary').select('hamlet');
    cy.get('select#characterSelect').select('HAMLET');
    cy.get('input#precedingCount').clear().type('1');
    cy.contains('Test My Lines').click();
    
    // Initially, the user's line should not be visible
    cy.contains('To be or not to be').should('not.exist');
    
    // Click the "Need Help" button
    cy.contains('Need Help?').click();
    
    // Now the user's line should be visible
    cy.contains('HAMLET:').should('be.visible');
    cy.contains('To be or not to be').should('be.visible');
    
    // The "Hide Line" button should be visible
    cy.contains('Hide Line').should('be.visible');
  });
  
  it('should hide the line when "Hide Line" is clicked', () => {
    // Navigate to script testing view
    cy.get('select#scriptLibrary').select('hamlet');
    cy.get('select#characterSelect').select('HAMLET');
    cy.get('input#precedingCount').clear().type('1');
    cy.contains('Test My Lines').click();
    
    // Click the "Need Help" button to show the line
    cy.contains('Need Help?').click();
    
    // Verify the line is shown
    cy.contains('To be or not to be').should('be.visible');
    
    // Click the "Hide Line" button
    cy.contains('Hide Line').click();
    
    // The line should be hidden again
    cy.contains('To be or not to be').should('not.exist');
    
    // The user prompt should be visible again
    cy.contains("It's your turn, HAMLET!").should('be.visible');
  });
  
  it('should show the line briefly when "I Said My Line" is clicked', () => {
    // Navigate to script testing view
    cy.get('select#scriptLibrary').select('hamlet');
    cy.get('select#characterSelect').select('HAMLET');
    cy.get('input#precedingCount').clear().type('1');
    cy.contains('Test My Lines').click();
    
    // Click the "I Said My Line" button
    cy.contains('I Said My Line').click();
    
    // The user's line should be visible
    cy.contains('HAMLET:').should('be.visible');
    cy.contains('To be or not to be').should('be.visible');
    
    // After a delay, the line should be hidden again
    // Note: In Cypress, we need to wait for the UI to update
    cy.wait(2500); // Wait a bit longer than the 2000ms delay in the component
    
    // The line should be hidden again
    cy.contains('To be or not to be').should('not.exist');
  });
  
  it('should return to input view when back button is clicked', () => {
    // Navigate to script testing view
    cy.get('select#scriptLibrary').select('hamlet');
    cy.get('select#characterSelect').select('HAMLET');
    cy.get('input#precedingCount').clear().type('1');
    cy.contains('Test My Lines').click();
    
    // Click the back button
    cy.contains('Back').click();
    
    // Verify we're back in the input view
    cy.contains('Script Memorization').should('be.visible');
    cy.contains('Select a Script').should('be.visible');
  });
});
