describe('Memorize Tool - Basic Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load the application', () => {
    cy.get('title').should('contain', 'Script Memorization Tool');
    cy.get('#app').should('exist');
  });

  it('should have language selector', () => {
    cy.get('#languageSelect').should('exist');
    cy.get('#languageSelect').should('contain', 'English');
    cy.get('#languageSelect').should('contain', 'Italiano');
  });

  it('should have theme toggle button', () => {
    cy.get('#themeToggle').should('exist');
    cy.get('#themeToggle').click();
    // Check for theme change with the dark-mode class instead of data-theme attribute
    cy.get('body').should('have.class', 'dark-mode');
  });

  it('should open options menu', () => {
    cy.get('#optionsToggle').should('exist');
    cy.get('#optionsToggle').click();
    cy.get('#optionsMenu').should('be.visible');
    cy.get('#optionAbout').should('exist');
    cy.get('#optionHelp').should('exist');
  });
});