// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// Custom command to select a script from the dropdown menu
Cypress.Commands.add('selectScript', (scriptName) => {
  cy.get('#scriptSelect').select(scriptName);
});

// Custom command to toggle hide mode
Cypress.Commands.add('toggleHideMode', () => {
  cy.get('#hideToggle').click();
});

// Custom command to handle user interaction prompt
Cypress.Commands.add('handleUserInteraction', () => {
  // Set userInteracted flag directly in the window object
  cy.window().then((win) => {
    // Check if there's a user interaction prompt
    if (win.document.querySelector('.user-interaction-prompt')) {
      // Simulate user interaction by setting the flag directly
      win.ttsService.userInteracted = true;

      // Force a re-render by dispatching a custom event
      const event = new win.CustomEvent('user-interaction-completed');
      win.document.dispatchEvent(event);
    }
  });
});