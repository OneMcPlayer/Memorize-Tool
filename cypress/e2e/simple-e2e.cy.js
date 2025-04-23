/// <reference types="cypress" />

describe('Simple End-to-End Flow Tests', () => {
  it('should allow guest access to the application', () => {
    // Visit the login page
    cy.visit('/login.html');
    
    // Skip login
    cy.contains('Skip login and continue as guest').click();
    
    // Verify we're on the main page
    cy.url().should('eq', Cypress.config().baseUrl + '/');
    
    // Check that the page loaded
    cy.get('body').should('exist');
  });
  
  it('should maintain login state across page reloads', () => {
    // Visit the login page
    cy.visit('/login.html');
    
    // Set up mock authentication data in localStorage
    cy.window().then((win) => {
      const expiryTime = Date.now() + 3600000; // 1 hour from now
      win.localStorage.setItem('authToken', 'mock-token');
      win.localStorage.setItem('authTokenExpiry', expiryTime.toString());
      win.localStorage.setItem('user', JSON.stringify({
        id: 'mock-user-id',
        username: 'testuser',
        email: 'test@example.com'
      }));
    });
    
    // Go to the main page
    cy.visit('/');
    
    // Verify we're not redirected back to login
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });
});
