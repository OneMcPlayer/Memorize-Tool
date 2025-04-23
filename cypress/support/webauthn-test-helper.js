// WebAuthn test helper for Cypress

// Mock credential for testing
const mockCredentialId = 'mockCredentialId123456';
const mockCredentialRawId = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]).buffer;
const mockChallenge = new Uint8Array([21, 22, 23, 24, 25, 26, 27, 28, 29, 30]).buffer;
const mockClientDataJSON = JSON.stringify({
  type: 'webauthn.create',
  challenge: Cypress.Buffer.from(mockChallenge).toString('base64'),
  origin: 'http://localhost:3000'
});
const mockAttestationObject = new Uint8Array([31, 32, 33, 34, 35, 36, 37, 38, 39, 40]).buffer;
const mockAuthenticatorData = new Uint8Array([41, 42, 43, 44, 45, 46, 47, 48, 49, 50]).buffer;
const mockSignature = new Uint8Array([51, 52, 53, 54, 55, 56, 57, 58, 59, 60]).buffer;

// Mock credential for registration
const mockRegistrationCredential = {
  id: mockCredentialId,
  rawId: mockCredentialRawId,
  response: {
    clientDataJSON: Cypress.Buffer.from(mockClientDataJSON).buffer,
    attestationObject: mockAttestationObject
  },
  type: 'public-key',
  getClientExtensionResults: () => ({})
};

// Mock credential for authentication
const mockAuthenticationCredential = {
  id: mockCredentialId,
  rawId: mockCredentialRawId,
  response: {
    clientDataJSON: Cypress.Buffer.from(mockClientDataJSON).buffer,
    authenticatorData: mockAuthenticatorData,
    signature: mockSignature,
    userHandle: null
  },
  type: 'public-key',
  getClientExtensionResults: () => ({})
};

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper function to convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Setup WebAuthn mocks in the browser
Cypress.Commands.add('setupWebAuthnMocks', () => {
  cy.window().then((win) => {
    // Store the original navigator.credentials
    const originalCredentials = win.navigator.credentials;
    
    // Mock navigator.credentials.create
    win.navigator.credentials.create = (options) => {
      console.log('Mocked credentials.create called with options:', options);
      
      // Return a promise that resolves with our mock credential
      return Promise.resolve(mockRegistrationCredential);
    };
    
    // Mock navigator.credentials.get
    win.navigator.credentials.get = (options) => {
      console.log('Mocked credentials.get called with options:', options);
      
      // Return a promise that resolves with our mock credential
      return Promise.resolve(mockAuthenticationCredential);
    };
    
    // Override the isWebAuthnSupported function if it exists
    if (typeof win.isWebAuthnSupported === 'function') {
      win.isWebAuthnSupported = () => true;
    }
    
    // Override the isLocalhost function if it exists
    if (typeof win.isLocalhost === 'function') {
      win.isLocalhost = () => true;
    }
    
    // Add helper functions to the window object for testing
    win.webauthnTest = {
      arrayBufferToBase64,
      base64ToArrayBuffer,
      mockRegistrationCredential,
      mockAuthenticationCredential,
      // Function to restore original credentials
      restoreOriginalCredentials: () => {
        win.navigator.credentials = originalCredentials;
      }
    };
  });
});

// Command to test passkey registration
Cypress.Commands.add('testPasskeyRegistration', (username) => {
  // Setup WebAuthn mocks
  cy.setupWebAuthnMocks();
  
  // Intercept the registration API call
  cy.intercept('POST', '/api/passkey/register', {
    statusCode: 200,
    body: { 
      success: true, 
      message: 'Passkey registered successfully',
      userId: 'mock-user-id'
    }
  }).as('registerRequest');
  
  // Intercept the authentication API call that follows registration
  cy.intercept('POST', '/api/passkey/authenticate', {
    statusCode: 200,
    body: { 
      success: true, 
      message: 'Authentication successful',
      user: { id: 'mock-user-id', username: username || 'testuser', email: 'test@example.com' },
      token: 'mock-token',
      expiresAt: Date.now() + 86400000 // 24 hours from now
    }
  }).as('authRequest');
  
  // Click the "Register a new passkey" link
  cy.contains('Register a new passkey').click();
  
  // Enter a username
  cy.get('#username').type(username || 'testuser');
  
  // Click the "Register Passkey" button
  cy.get('#register-button').click();
  
  // Wait for the registration API call
  cy.wait('@registerRequest').then((interception) => {
    // Verify the request payload
    expect(interception.request.body).to.have.property('username');
    expect(interception.request.body).to.have.property('credential');
    expect(interception.request.body.credential).to.have.property('id');
    expect(interception.request.body.credential).to.have.property('type', 'public-key');
  });
  
  // Wait for the authentication API call
  cy.wait('@authRequest');
  
  // Verify success message
  cy.get('#status').should('be.visible')
    .and('contain', 'Passkey registered successfully');
});

// Command to test passkey authentication
Cypress.Commands.add('testPasskeyAuthentication', () => {
  // Setup WebAuthn mocks
  cy.setupWebAuthnMocks();
  
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
  
  // Click the "Login with Passkey" button
  cy.contains('Login with Passkey').click();
  
  // Wait for the authentication API call
  cy.wait('@authRequest').then((interception) => {
    // Verify the request payload
    expect(interception.request.body).to.have.property('credential');
    expect(interception.request.body.credential).to.have.property('id');
    expect(interception.request.body.credential).to.have.property('type', 'public-key');
  });
  
  // Verify we're redirected to the main page or a success message is shown
  cy.url().should('include', '/');
  
  // Verify the token is stored in localStorage
  cy.window().then((win) => {
    expect(win.localStorage.getItem('authToken')).to.equal('mock-token');
  });
});
