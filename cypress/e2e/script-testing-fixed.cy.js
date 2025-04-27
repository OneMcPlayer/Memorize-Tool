/// <reference types="cypress" />

describe('Script Testing Feature', () => {
  beforeEach(() => {
    // Visit the application
    cy.visit('/');
    
    // Wait for the app to load
    cy.contains('Script Memorization').should('be.visible');
  });
  
  it('should navigate to script testing view', () => {
    // First check what scripts are available
    cy.get('select#scriptLibrary').then($select => {
      // Get the first available script option
      const firstOption = $select.find('option').eq(1).val(); // Skip the first placeholder option
      
      // Select the first available script
      cy.get('select#scriptLibrary').select(firstOption);
      
      // Wait for character selection to appear
      cy.contains('Select Your Character').should('be.visible');
      
      // Get the first available character
      cy.get('select#characterSelect').then($charSelect => {
        const firstChar = $charSelect.find('option').eq(1).val(); // Skip the first placeholder option
        
        // Select the first available character
        cy.get('select#characterSelect').select(firstChar);
        
        // Set context lines
        cy.get('input#precedingCount').clear().type('1');
        
        // Click the "Test My Lines" button
        cy.contains('Test My Lines').click();
        
        // Verify we're in the script testing view
        cy.contains('Script Testing Mode').should('be.visible');
        
        // Verify the action buttons are shown
        cy.contains('I Said My Line').should('be.visible');
        cy.contains('Need Help?').should('be.visible');
      });
    });
  });
  
  it('should show the line when "Need Help" is clicked', () => {
    // Navigate to script testing view using the first available script and character
    cy.get('select#scriptLibrary').then($select => {
      const firstOption = $select.find('option').eq(1).val();
      cy.get('select#scriptLibrary').select(firstOption);
      
      cy.get('select#characterSelect').then($charSelect => {
        const firstChar = $charSelect.find('option').eq(1).val();
        cy.get('select#characterSelect').select(firstChar);
        
        cy.get('input#precedingCount').clear().type('1');
        cy.contains('Test My Lines').click();
        
        // Click the "Need Help" button
        cy.contains('Need Help?').click();
        
        // Now the user's line should be visible
        cy.get('.character-line').should('be.visible');
        
        // The "Hide Line" button should be visible
        cy.contains('Hide Line').should('be.visible');
      });
    });
  });
  
  it('should hide the line when "Hide Line" is clicked', () => {
    // Navigate to script testing view using the first available script and character
    cy.get('select#scriptLibrary').then($select => {
      const firstOption = $select.find('option').eq(1).val();
      cy.get('select#scriptLibrary').select(firstOption);
      
      cy.get('select#characterSelect').then($charSelect => {
        const firstChar = $charSelect.find('option').eq(1).val();
        cy.get('select#characterSelect').select(firstChar);
        
        cy.get('input#precedingCount').clear().type('1');
        cy.contains('Test My Lines').click();
        
        // Click the "Need Help" button to show the line
        cy.contains('Need Help?').click();
        
        // Verify the line is shown
        cy.get('.character-line').should('be.visible');
        
        // Click the "Hide Line" button
        cy.contains('Hide Line').click();
        
        // The line should be hidden again
        cy.get('.character-line').should('not.exist');
      });
    });
  });
  
  it('should return to input view when back button is clicked', () => {
    // Navigate to script testing view using the first available script and character
    cy.get('select#scriptLibrary').then($select => {
      const firstOption = $select.find('option').eq(1).val();
      cy.get('select#scriptLibrary').select(firstOption);
      
      cy.get('select#characterSelect').then($charSelect => {
        const firstChar = $charSelect.find('option').eq(1).val();
        cy.get('select#characterSelect').select(firstChar);
        
        cy.get('input#precedingCount').clear().type('1');
        cy.contains('Test My Lines').click();
        
        // Click the back button
        cy.contains('Back').click();
        
        // Verify we're back in the input view
        cy.contains('Script Memorization').should('be.visible');
        cy.contains('Select a Script').should('be.visible');
      });
    });
  });
});
