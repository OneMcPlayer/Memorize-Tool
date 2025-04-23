/// <reference types="cypress" />

describe('Simplified Authentication Flow Tests', () => {
  beforeEach(() => {
    // Visit the login page before each test
    cy.visit('/login.html', {
      onBeforeLoad(win) {
        // Create a stub for WebAuthn API
        const credentialsMock = {
          create: cy.stub().resolves({
            id: 'test-credential-id',
            rawId: new Uint8Array(16).buffer,
            response: {
              clientDataJSON: new Uint8Array(16).buffer,
              attestationObject: new Uint8Array(16).buffer
            },
            type: 'public-key'
          }),
          get: cy.stub().resolves({
            id: 'test-credential-id',
            rawId: new Uint8Array(16).buffer,
            response: {
              clientDataJSON: new Uint8Array(16).buffer,
              authenticatorData: new Uint8Array(16).buffer,
              signature: new Uint8Array(16).buffer
            },
            type: 'public-key'
          })
        };
        
        // Replace the credentials API
        cy.stub(win.navigator, 'credentials').value(credentialsMock);
        
        // Override the isWebAuthnSupported function
        win.isWebAuthnSupported = () => true;
        
        // Override the isLocalhost function
        win.isLocalhost = () => true;
        
        // Mock the arrayBufferToBase64 function
        win.arrayBufferToBase64 = (buffer) => {
          return 'mock-base64-string';
        };
      }
    });
  });

  it('should register a new passkey', () => {
    // Intercept the registration API call
    cy.intercept('POST', '/api/passkey/register', {
      statusCode: 200,
      body: { success: true, message: 'Passkey registered successfully', userId: 'mock-user-id' }
    }).as('registerRequest');

    // Intercept the authentication API call
    cy.intercept('POST', '/api/passkey/authenticate', {
      statusCode: 200,
      body: { 
        success: true, 
        message: 'Authentication successful',
        user: { id: 'mock-user-id', username: 'testuser', email: 'test@example.com' },
        token: 'mock-token',
        expiresAt: Date.now() + 86400000 // 24 hours from now
      }
    }).as('authRequest');

    // Step 1: Register a new passkey
    cy.contains('Register a new passkey').click();
    cy.get('#username').type('testuser');
    cy.get('#register-button').click();
    
    // Wait for the registration API call
    cy.wait('@registerRequest');
    
    // Wait for the authentication API call
    cy.wait('@authRequest');
    
    // Verify we're redirected to the main page
    cy.url().should('include', '/');
  });

  it('should authenticate with a passkey', () => {
    // Intercept the authentication API call
    cy.intercept('POST', '/api/passkey/authenticate', {
      statusCode: 200,
      body: { 
        success: true, 
        message: 'Authentication successful',
        user: { id: 'mock-user-id', username: 'testuser', email: 'test@example.com' },
        token: 'mock-token',
        expiresAt: Date.now() + 86400000 // 24 hours from now
      }
    }).as('authRequest');

    // Login with the passkey
    cy.contains('Login with Passkey').click();
    
    // Wait for the authentication API call
    cy.wait('@authRequest');
    
    // Verify we're redirected to the main page
    cy.url().should('include', '/');
  });

  it('should maintain authentication across page reloads', () => {
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
    
    // Reload the page
    cy.reload();
    
    // Verify we're still on the main page
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });
});
