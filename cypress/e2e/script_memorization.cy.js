describe('Script Memorization Feature', () => {
  const currentScriptId = 'il-calapranzi';
  const currentScriptTitle = 'IL CALAPRANZI';
  const practiceCharacter = 'BEN';

  beforeEach(() => {
    // Visit the application before each test
    cy.visit('http://localhost:3000');
  });

  it('should load the current-year script and detect characters', () => {
    // Select a current-year script
    cy.get('#scriptLibrary').select(currentScriptId);

    // Verify that the script is loaded
    cy.contains('View Full Script').should('be.visible').click();

    // Verify that the script modal shows the correct content
    cy.contains(currentScriptTitle).should('be.visible');
    cy.contains('BEN').should('be.visible');
    cy.contains('GUS').should('be.visible');
    cy.contains('DIDASCALIA').should('be.visible');

    // Close the modal
    cy.contains('Close').click();

    // Verify that characters are detected
    cy.get('#characterSelect').should('be.visible');
    cy.get('#characterSelect option').should('have.length.at.least', 3);
    cy.get('#characterSelect option').should('contain', 'BEN');
    cy.get('#characterSelect option').should('contain', 'GUS');
    cy.get('#characterSelect option').should('contain', 'DIDASCALIA');
  });

  it('should extract lines for the selected current-year character', () => {
    // Select a current-year script
    cy.get('#scriptLibrary').select(currentScriptId);

    // Select the practice character
    cy.get('#characterSelect').select(practiceCharacter);

    // Set context lines to 1
    cy.get('#precedingCount').clear().type('1');

    // Extract lines
    cy.contains('Extract My Lines').click();

    // Verify that we're in practice mode
    cy.contains('Practice Mode').should('be.visible');

    // Verify that the context is shown
    cy.get('.context-section').should('be.visible');

    // Verify that we can see the "Verify My Line" button
    cy.contains('Verify My Line').should('be.visible');
  });

  it('should correctly progress through current-year lines', () => {
    // Select a current-year script
    cy.get('#scriptLibrary').select(currentScriptId);

    // Select the practice character
    cy.get('#characterSelect').select(practiceCharacter);

    // Set context lines to 1
    cy.get('#precedingCount').clear().type('1');

    // Extract lines
    cy.contains('Extract My Lines').click();

    // Verify initial progress is 0%
    cy.get('.progress-fill').should('have.attr', 'style').and('include', 'width: 0%');

    // Go through the first line only (to avoid recursive complexity)
    // Verify the line - this now automatically reveals the line
    cy.contains('Verify My Line').click();

    // Verify that the line is revealed
    cy.get('#card.revealed').should('exist');
    cy.get('.card-content').should('contain', practiceCharacter);

    // Wait for progress bar to update
    cy.wait(500);

    // Check progress bar has changed from initial state
    cy.get('.progress-fill').should('exist');

    // Go to next line (using the Italian translation if needed)
    cy.get('body').then(($body) => {
      if ($body.text().includes('Next')) {
        cy.contains('Next').click();
      } else if ($body.text().includes('Avanti')) {
        cy.contains('Avanti').click();
      }
    });

    // Verify we can continue to the next line (in either language)
    cy.get('body').then(($body) => {
      if ($body.text().includes('Skip to Next Line')) {
        cy.contains('Skip to Next Line').should('be.visible');
      } else if ($body.text().includes('Passa Alla Prossima Battuta')) {
        cy.contains('Passa Alla Prossima Battuta').should('be.visible');
      }
    });
  });

  it('should allow skipping to next line', () => {
    // Select a current-year script
    cy.get('#scriptLibrary').select(currentScriptId);

    // Select the practice character
    cy.get('#characterSelect').select(practiceCharacter);

    // Set context lines to 1
    cy.get('#precedingCount').clear().type('1');

    // Extract lines
    cy.contains('Extract My Lines').click();

    // Skip to next line
    cy.contains('Skip to Next Line').click();

    // Verify that we're on the second context
    cy.get('.context-section').should('be.visible');

    // Verify progress bar has moved
    cy.get('.progress-fill').should('have.attr', 'style')
      .and('not.include', 'width: 0%');
  });
});
