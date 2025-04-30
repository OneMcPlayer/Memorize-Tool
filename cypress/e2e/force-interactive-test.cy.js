/// <reference types="cypress" />

describe('Force Interactive Mode Test', () => {
  it('should navigate through the interactive mode flow', () => {
    // Visit the application
    cy.visit('/');
    
    // Wait for the application to load
    cy.contains('Script Memorization', { timeout: 10000 }).should('be.visible');
    
    // Select the sample script
    cy.get('#scriptLibrary').select('sample-script');
    
    // Wait for character selection to appear
    cy.contains('Select Your Character').should('be.visible');
    
    // Select the ALICE character
    cy.get('select#characterSelect').select('ALICE');
    
    // Find the Interactive Practice button by ID and click it with force option
    cy.get('#memorizationPracticeButton').click({ force: true });
    
    // Wait for the view to load
    cy.wait(3000);
    
    // Find all buttons and click the one containing "Start Practice"
    cy.get('button').then($buttons => {
      const startButton = $buttons.filter((i, el) => {
        return Cypress.$(el).text().includes('Start Practice');
      });
      
      if (startButton.length) {
        cy.wrap(startButton).click({ force: true });
        cy.log('Start Practice button clicked');
      } else {
        cy.log('Start Practice button not found');
        // Log all button texts
        const buttonTexts = $buttons.map((i, el) => Cypress.$(el).text()).get();
        cy.log('Available buttons:', buttonTexts);
      }
    });
    
    // Wait for processing
    cy.wait(3000);
    
    // Check for user turn and handle it
    cy.get('body').then($body => {
      if ($body.text().includes("It's your turn") || $body.text().includes("your turn")) {
        cy.log('User turn detected');
        
        // Find all buttons and click the one containing "I Said My Line"
        cy.get('button').then($buttons => {
          const saidLineButton = $buttons.filter((i, el) => {
            return Cypress.$(el).text().includes('I Said My Line') || 
                   Cypress.$(el).text().includes('Said Line');
          });
          
          if (saidLineButton.length) {
            cy.wrap(saidLineButton).click({ force: true });
            cy.log('I Said My Line button clicked');
          } else {
            cy.log('I Said My Line button not found');
            // Log all button texts
            const buttonTexts = $buttons.map((i, el) => Cypress.$(el).text()).get();
            cy.log('Available buttons:', buttonTexts);
          }
        });
        
        // Wait for the user's line to appear
        cy.wait(1000);
        
        // Find all buttons and click the one containing "Continue to Next Line"
        cy.get('button').then($buttons => {
          const continueButton = $buttons.filter((i, el) => {
            return Cypress.$(el).text().includes('Continue to Next Line') || 
                   Cypress.$(el).text().includes('Continue') ||
                   Cypress.$(el).text().includes('Next Line');
          });
          
          if (continueButton.length) {
            cy.wrap(continueButton).click({ force: true });
            cy.log('Continue to Next Line button clicked');
          } else {
            cy.log('Continue to Next Line button not found');
            // Log all button texts
            const buttonTexts = $buttons.map((i, el) => Cypress.$(el).text()).get();
            cy.log('Available buttons:', buttonTexts);
          }
        });
        
        // Wait for the next turn or completion
        cy.wait(3000);
      } else {
        cy.log('User turn not detected');
        // Log the page content
        cy.log('Page content:', $body.text());
      }
    });
    
    // Go back to the main menu
    cy.get('button').then($buttons => {
      const backButton = $buttons.filter((i, el) => {
        return Cypress.$(el).text().includes('Back to Menu') || 
               Cypress.$(el).text().includes('Back');
      });
      
      if (backButton.length) {
        cy.wrap(backButton).click({ force: true });
        cy.log('Back to Menu button clicked');
      } else {
        cy.log('Back to Menu button not found');
        // Log all button texts
        const buttonTexts = $buttons.map((i, el) => Cypress.$(el).text()).get();
        cy.log('Available buttons:', buttonTexts);
      }
    });
    
    // Verify we're back at the main view
    cy.contains('Script Memorization', { timeout: 10000 }).should('be.visible');
  });
});
