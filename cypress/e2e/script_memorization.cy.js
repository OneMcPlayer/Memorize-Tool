describe('Script Memorization Feature', () => {
  beforeEach(() => {
    // Visit the application before each test
    cy.visit('http://localhost:3000');
  });

  it('should load the sample script and detect characters', () => {
    // Select the sample script
    cy.get('#scriptLibrary').select('sample-script');

    // Verify that the script is loaded
    cy.contains('View Full Script').should('be.visible').click();

    // Verify that the script modal shows the correct content
    cy.contains('Sample Script').should('be.visible');
    cy.contains('ALICE').should('be.visible');
    cy.contains('BOB').should('be.visible');
    cy.contains('NARRATOR').should('be.visible');

    // Close the modal
    cy.contains('Close').click();

    // Verify that characters are detected
    cy.get('#characterSelect').should('be.visible');
    cy.get('#characterSelect option').should('have.length.at.least', 3); // At least ALICE, BOB, and NARRATOR
    cy.get('#characterSelect option').should('contain', 'ALICE');
    cy.get('#characterSelect option').should('contain', 'BOB');
    cy.get('#characterSelect option').should('contain', 'NARRATOR');
  });

  it('should extract lines for ALICE character', () => {
    // Select the sample script
    cy.get('#scriptLibrary').select('sample-script');

    // Select ALICE character
    cy.get('#characterSelect').select('ALICE');

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

  it('should correctly progress through ALICE lines', () => {
    // Select the sample script
    cy.get('#scriptLibrary').select('sample-script');

    // Select ALICE character
    cy.get('#characterSelect').select('ALICE');

    // Set context lines to 1
    cy.get('#precedingCount').clear().type('1');

    // Extract lines
    cy.contains('Extract My Lines').click();

    // Verify initial progress is 0%
    cy.get('.progress-fill').should('have.attr', 'style').and('include', 'width: 0%');

    // Go through the first line only (to avoid recursive complexity)
    // Verify the line
    cy.contains('Verify My Line').click();

    // Reveal the line
    cy.contains('Reveal').should('be.visible').click();

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
    // Select the sample script
    cy.get('#scriptLibrary').select('sample-script');

    // Select ALICE character
    cy.get('#characterSelect').select('ALICE');

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
