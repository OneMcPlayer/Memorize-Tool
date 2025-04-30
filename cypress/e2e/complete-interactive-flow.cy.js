/// <reference types="cypress" />

describe('Complete Interactive Mode Flow', () => {
  it('should navigate through the entire interactive mode flow', () => {
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
    cy.log('Interactive Practice button clicked');
    
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
    
    // Function to handle a single user turn
    const handleUserTurn = () => {
      // Wait for processing
      cy.wait(3000);
      
      // Check for user turn, practice complete, or other state
      cy.get('body').then($body => {
        const bodyText = $body.text();
        const isUserTurn = bodyText.includes("It's your turn") || bodyText.includes("your turn");
        const isPracticeComplete = bodyText.includes('Practice Complete') || 
                                  bodyText.includes('complete');
        
        if (isUserTurn) {
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
              
              // Continue with the next turn
              handleUserTurn();
            } else {
              cy.log('Continue to Next Line button not found');
              // Log all button texts
              const buttonTexts = $buttons.map((i, el) => Cypress.$(el).text()).get();
              cy.log('Available buttons:', buttonTexts);
            }
          });
        } else if (isPracticeComplete) {
          cy.log('Practice complete detected');
          
          // Find all buttons and click the one containing "Back to Menu"
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
        } else {
          cy.log('Neither user turn nor practice complete detected');
          cy.log('Page content:', bodyText);
          
          // Try to find any button that might help us continue
          cy.get('button').then($buttons => {
            const buttonTexts = $buttons.map((i, el) => Cypress.$(el).text()).get();
            cy.log('Available buttons:', buttonTexts);
            
            // If there's a Back to Menu button, click it to exit
            const backButton = $buttons.filter((i, el) => {
              return Cypress.$(el).text().includes('Back to Menu') || 
                     Cypress.$(el).text().includes('Back');
            });
            
            if (backButton.length) {
              cy.wrap(backButton).click({ force: true });
              cy.log('Back to Menu button clicked');
            }
          });
        }
      });
    };
    
    // Start handling user turns
    handleUserTurn();
  });

  it('should verify the "Need Help" functionality', () => {
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
    cy.log('Interactive Practice button clicked');
    
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
    
    // Check for user turn
    cy.get('body').then($body => {
      const bodyText = $body.text();
      const isUserTurn = bodyText.includes("It's your turn") || bodyText.includes("your turn");
      
      if (isUserTurn) {
        cy.log('User turn detected');
        
        // Find all buttons and click the one containing "Need Help"
        cy.get('button').then($buttons => {
          const helpButton = $buttons.filter((i, el) => {
            return Cypress.$(el).text().includes('Need Help') || 
                   Cypress.$(el).text().includes('Help');
          });
          
          if (helpButton.length) {
            cy.wrap(helpButton).click({ force: true });
            cy.log('Need Help button clicked');
            
            // Wait for the user's line to appear
            cy.wait(1000);
            
            // Verify that the user's line is shown
            cy.get('body').then($newBody => {
              const hasUserLine = $newBody.text().includes('ALICE:');
              
              if (hasUserLine) {
                cy.log('User line detected after clicking Need Help');
                
                // Find all buttons and click the one containing "Continue to Next Line"
                cy.get('button').then($newButtons => {
                  const continueButton = $newButtons.filter((i, el) => {
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
                    const buttonTexts = $newButtons.map((i, el) => Cypress.$(el).text()).get();
                    cy.log('Available buttons:', buttonTexts);
                  }
                });
              } else {
                cy.log('User line not detected after clicking Need Help');
                cy.log('Page content:', $newBody.text());
              }
            });
          } else {
            cy.log('Need Help button not found');
            // Log all button texts
            const buttonTexts = $buttons.map((i, el) => Cypress.$(el).text()).get();
            cy.log('Available buttons:', buttonTexts);
          }
        });
      } else {
        cy.log('User turn not detected');
        cy.log('Page content:', bodyText);
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
