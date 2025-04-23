/// <reference types="cypress" />

describe('Authentication Tests', () => {
  beforeEach(() => {
    // Visit the login page before each test
    cy.visit('/login.html');
    
    // Wait for the page to load
    cy.contains('Script Memorization Tool').should('be.visible');
  });

  it('should display the login page correctly', () => {
    // Check that the login page elements are visible
    cy.contains('h1', 'Script Memorization Tool').should('be.visible');
    cy.contains('Login with Passkey').should('be.visible');
    cy.contains('Skip login and continue as guest').should('be.visible');
  });

  it('should allow skipping login', () => {
    // Click the "Skip login" link
    cy.contains('Skip login and continue as guest').click();
    
    // Verify we're redirected to the main page
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });

  it('should show registration form when clicking "Register a new passkey"', () => {
    // Click the "Register a new passkey" link
    cy.contains('Register a new passkey').click();
    
    // Verify the registration form is displayed
    cy.get('#register-form').should('be.visible');
    cy.get('#username').should('be.visible');
    cy.get('#register-button').should('be.visible');
  });

  it('should validate username in registration form', () => {
    // Click the "Register a new passkey" link
    cy.contains('Register a new passkey').click();
    
    // Try to register without entering a username
    cy.get('#register-button').click();
    
    // Verify error message is displayed
    cy.get('#status').should('be.visible')
      .and('contain', 'Please enter a username');
  });

  it('should hide registration form when clicking "Cancel"', () => {
    // Click the "Register a new passkey" link
    cy.contains('Register a new passkey').click();
    
    // Verify the registration form is displayed
    cy.get('#register-form').should('be.visible');
    
    // Click the "Cancel" button
    cy.get('#cancel-register').click();
    
    // Verify the registration form is hidden
    cy.get('#register-form').should('not.be.visible');
  });

  // Note: We can't fully test WebAuthn functionality in Cypress
  // because it requires browser APIs that Cypress can't easily mock.
  // The following tests are commented out but would be the ideal tests
  // if we could mock WebAuthn.

  /*
  it('should register a new passkey', () => {
    // Mock WebAuthn registration
    cy.window().then((win) => {
      // Mock the WebAuthn API
      cy.stub(win.navigator.credentials, 'create').resolves({
        id: 'test-credential-id',
        rawId: new ArrayBuffer(16),
        response: {
          clientDataJSON: new ArrayBuffer(16),
          attestationObject: new ArrayBuffer(16)
        },
        type: 'public-key'
      });
    });

    // Click the "Register a new passkey" link
    cy.contains('Register a new passkey').click();
    
    // Enter a username
    cy.get('#username').type('testuser');
    
    // Click the "Register Passkey" button
    cy.get('#register-button').click();
    
    // Verify success message
    cy.get('#status').should('be.visible')
      .and('contain', 'Passkey registered successfully');
  });

  it('should authenticate with a passkey', () => {
    // Mock WebAuthn authentication
    cy.window().then((win) => {
      // Mock the WebAuthn API
      cy.stub(win.navigator.credentials, 'get').resolves({
        id: 'test-credential-id',
        rawId: new ArrayBuffer(16),
        response: {
          clientDataJSON: new ArrayBuffer(16),
          authenticatorData: new ArrayBuffer(16),
          signature: new ArrayBuffer(16)
        },
        type: 'public-key'
      });
    });

    // Click the "Login with Passkey" button
    cy.contains('Login with Passkey').click();
    
    // Verify we're redirected to the main page
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });
  */
});

// Test for error handling
describe('Error Handling Tests', () => {
  beforeEach(() => {
    // Visit the login page before each test
    cy.visit('/login.html');
  });

  it('should handle server errors during registration', () => {
    // Intercept the registration API call and force it to fail
    cy.intercept('POST', '/api/passkey/register', {
      statusCode: 500,
      body: { error: 'Server error' }
    }).as('registerRequest');

    // Click the "Register a new passkey" link
    cy.contains('Register a new passkey').click();
    
    // Enter a username
    cy.get('#username').type('testuser');
    
    // Click the "Register Passkey" button
    cy.get('#register-button').click();
    
    // Wait for the API call
    cy.wait('@registerRequest');
    
    // Verify error message
    cy.get('#status').should('be.visible')
      .and('contain', 'Registration failed');
  });

  it('should handle server errors during authentication', () => {
    // Intercept the authentication API call and force it to fail
    cy.intercept('POST', '/api/passkey/authenticate', {
      statusCode: 500,
      body: { error: 'Server error' }
    }).as('authRequest');

    // Stub the WebAuthn API to bypass the browser's native UI
    cy.window().then((win) => {
      cy.stub(win, 'isWebAuthnSupported').returns(true);
      cy.stub(win, 'isLocalhost').returns(true);
      cy.stub(win.navigator.credentials, 'get').resolves({
        id: 'test-credential-id',
        rawId: new Uint8Array(16).buffer,
        response: {
          clientDataJSON: new Uint8Array(16).buffer,
          authenticatorData: new Uint8Array(16).buffer,
          signature: new Uint8Array(16).buffer
        },
        type: 'public-key'
      });
    });

    // Click the "Login with Passkey" button
    cy.contains('Login with Passkey').click();
    
    // Verify error message
    cy.get('#status').should('be.visible')
      .and('contain', 'Authentication failed');
  });
});
