/// <reference types="cypress" />

describe('Speech-to-Text Test', () => {
  beforeEach(() => {
    // Visit the app
    cy.visit('/');
    
    // Mock localStorage for API key
    cy.window().then((win) => {
      win.localStorage.setItem('openai_api_key', 'test-api-key-for-cypress');
      win.localStorage.setItem('openai_demo_mode', 'true');
    });
    
    // Open the options menu
    cy.get('.options-button').click();
    
    // Enable advanced mode if not already enabled
    cy.get('#experimentalModeToggle').then(($checkbox) => {
      if (!$checkbox.is(':checked')) {
        cy.get('#experimentalModeToggle').click();
      }
    });
    
    // Click on STT Test
    cy.contains('STT Test').click();
  });
  
  it('should load the STT test component', () => {
    // Verify the component is loaded
    cy.contains('h1', 'Speech-to-Text Test').should('be.visible');
    cy.get('.test-mode-toggle').should('be.visible');
    cy.get('.recording-controls').should('be.visible');
  });
  
  it('should simulate recording and processing in test mode', () => {
    // Verify test mode is enabled
    cy.get('.test-mode-toggle input[type="checkbox"]').should('be.checked');
    
    // Start recording
    cy.get('.record-button').click();
    
    // Wait for simulated recording to complete
    cy.contains('Recording in test mode (simulated)...').should('be.visible');
    cy.contains('Recording completed (simulated)', { timeout: 5000 }).should('be.visible');
    
    // Process the audio
    cy.get('.process-button').click();
    
    // Verify processing status
    cy.contains('Processing audio...').should('be.visible');
    
    // Wait for processing to complete and check the result
    cy.contains('Processing completed', { timeout: 5000 }).should('be.visible');
    
    // Check that we got the demo response
    cy.get('.transcription-box').should('contain', "I'm saying my line as expected. This is a demo response.");
  });
  
  it('should toggle test mode', () => {
    // Test mode should be enabled by default
    cy.get('.test-mode-toggle input[type="checkbox"]').should('be.checked');
    cy.contains('Test mode is ON').should('be.visible');
    
    // Toggle test mode off
    cy.get('.test-mode-toggle input[type="checkbox"]').click();
    cy.contains('Test mode is OFF').should('be.visible');
    
    // Toggle test mode back on
    cy.get('.test-mode-toggle input[type="checkbox"]').click();
    cy.contains('Test mode is ON').should('be.visible');
  });
  
  it('should use the fake audio input when recording with real microphone', () => {
    // Turn off test mode to use the real recording flow (but still with fake audio)
    cy.get('.test-mode-toggle input[type="checkbox"]').click();
    cy.contains('Test mode is OFF').should('be.visible');
    
    // Start recording (this will use the fake audio input configured in cypress.config.js)
    cy.get('.record-button').click();
    
    // Wait for recording to start
    cy.contains('Recording...').should('be.visible');
    
    // Stop recording after a short time
    cy.wait(2000);
    cy.get('.record-button.recording').click();
    
    // Wait for recording to complete
    cy.contains('Recording completed', { timeout: 5000 }).should('be.visible');
    
    // Process the audio
    cy.get('.process-button').click();
    
    // Verify processing status
    cy.contains('Processing audio...').should('be.visible');
    
    // Wait for processing to complete and check the result
    cy.contains('Processing completed', { timeout: 5000 }).should('be.visible');
    
    // Since we're in demo mode, we should still get the demo response
    cy.get('.transcription-box').should('contain', "I'm saying my line as expected. This is a demo response.");
  });
});
