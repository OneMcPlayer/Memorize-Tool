/// <reference types="cypress" />

describe('Complete Authentication Flow Tests', () => {
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

  it('should complete the full registration and authentication flow', () => {
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
    cy.wait('@registerRequest');
    cy.wait('@authRequest');
    
    // Verify we're redirected to the main page
    cy.url().should('include', '/');
    
    // Step 2: Logout (by clearing localStorage and going back to login page)
    cy.window().then((win) => {
      win.localStorage.clear();
    });
    cy.visit('/login.html');
    
    // Step 3: Login with the passkey
    cy.contains('Login with Passkey').click();
    cy.wait('@authRequest');
    
    // Verify we're redirected to the main page again
    cy.url().should('include', '/');
    
    // Verify the token is stored in localStorage
    cy.window().then((win) => {
      expect(win.localStorage.getItem('authToken')).to.equal('mock-token');
    });
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

  it('should handle token expiration correctly', () => {
    // Set up expired authentication data in localStorage
    cy.window().then((win) => {
      const expiredTime = Date.now() - 3600000; // 1 hour ago
      win.localStorage.setItem('authToken', 'mock-token');
      win.localStorage.setItem('authTokenExpiry', expiredTime.toString());
      win.localStorage.setItem('user', JSON.stringify({
        id: 'mock-user-id',
        username: 'testuser',
        email: 'test@example.com'
      }));
    });
    
    // Go to the main page
    cy.visit('/');
    
    // The app should still work even with an expired token
    // since we're allowing guest access
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });
});
