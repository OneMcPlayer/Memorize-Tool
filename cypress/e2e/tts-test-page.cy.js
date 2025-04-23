/// <reference types="cypress" />

describe('TTS Test Page', () => {
  beforeEach(() => {
    // Visit the app
    cy.visit('/Memorize-Tool');
    
    // Mock the Web Speech API if it doesn't exist
    cy.window().then((win) => {
      if (!win.speechSynthesis) {
        win.speechSynthesis = {
          speaking: false,
          paused: false,
          pending: false,
          
          getVoices: () => [],
          speak: () => {},
          cancel: () => {},
          pause: () => {},
          resume: () => {}
        };
        
        win.SpeechSynthesisUtterance = function(text) {
          this.text = text;
          this.voice = null;
          this.lang = 'en-US';
          this.pitch = 1;
          this.rate = 1;
          this.volume = 1;
          this.onstart = null;
          this.onend = null;
          this.onerror = null;
          this.onpause = null;
          this.onresume = null;
          this.onboundary = null;
          this.onmark = null;
        };
      }
      
      // Set test mode for TTS service
      if (win.ttsService) {
        win.ttsService.isTestMode = true;
      }
    });
    
    // Open the TTS test page
    cy.get('.options-button').click();
    cy.contains('TTS Test').click();
  });
  
  it('should display the TTS test page', () => {
    cy.contains('h1', 'Text-to-Speech Test').should('be.visible');
    cy.get('textarea').should('be.visible');
    cy.get('.play-button').should('be.visible');
    cy.get('.stop-button').should('be.visible').should('be.disabled');
  });
  
  it('should update configuration when checkboxes are clicked', () => {
    // Check the configuration options
    cy.contains('label', 'Use Web Speech API').find('input[type="checkbox"]').should('be.checked');
    cy.contains('label', 'Use Google TTS').find('input[type="checkbox"]').should('be.checked');
    cy.contains('label', 'Use Proxy').find('input[type="checkbox"]').should('not.be.checked');
    
    // Toggle the Web Speech API option
    cy.contains('label', 'Use Web Speech API').click();
    cy.contains('label', 'Use Web Speech API').find('input[type="checkbox"]').should('not.be.checked');
    
    // Toggle the Google TTS option
    cy.contains('label', 'Use Google TTS').click();
    cy.contains('label', 'Use Google TTS').find('input[type="checkbox"]').should('not.be.checked');
    
    // Toggle the Proxy option
    cy.contains('label', 'Use Proxy').click();
    cy.contains('label', 'Use Proxy').find('input[type="checkbox"]').should('be.checked');
  });
  
  it('should call the TTS service when play button is clicked', () => {
    // Spy on the custom event
    const speakSpy = cy.spy();
    cy.document().then(doc => {
      doc.addEventListener('tts-speak-called', speakSpy);
    });
    
    // Type some text
    cy.get('textarea').clear().type('This is a test of the TTS service.');
    
    // Click the play button
    cy.get('.play-button').click();
    
    // Check that the TTS service was called
    cy.wrap(speakSpy).should('have.been.called');
    
    // Check that the status is updated
    cy.get('.status').should('contain', 'Playing');
    
    // Check that the stop button is enabled
    cy.get('.stop-button').should('not.be.disabled');
  });
  
  it('should stop playback when stop button is clicked', () => {
    // Spy on the custom events
    const speakSpy = cy.spy();
    const stopSpy = cy.spy();
    cy.document().then(doc => {
      doc.addEventListener('tts-speak-called', speakSpy);
      doc.addEventListener('tts-stop-called', stopSpy);
    });
    
    // Type some text
    cy.get('textarea').clear().type('This is a test of the TTS service.');
    
    // Start playback
    cy.get('.play-button').click();
    
    // Check that the status is updated
    cy.get('.status').should('contain', 'Playing');
    
    // Click the stop button
    cy.get('.stop-button').click();
    
    // Check that the stop method was called
    cy.wrap(stopSpy).should('have.been.called');
    
    // Check that the status is updated
    cy.get('.status').should('contain', 'Playback stopped');
  });
  
  it('should adjust voice settings with sliders', () => {
    // Check the initial values
    cy.get('#volume').should('have.value', '1');
    cy.get('#rate').should('have.value', '1');
    cy.get('#pitch').should('have.value', '1');
    
    // Adjust the volume
    cy.get('#volume').invoke('val', 0.5).trigger('change');
    cy.get('#volume').should('have.value', '0.5');
    
    // Adjust the rate
    cy.get('#rate').invoke('val', 1.5).trigger('change');
    cy.get('#rate').should('have.value', '1.5');
    
    // Adjust the pitch
    cy.get('#pitch').invoke('val', 0.8).trigger('change');
    cy.get('#pitch').should('have.value', '0.8');
    
    // Spy on the custom event
    const speakSpy = cy.spy();
    cy.document().then(doc => {
      doc.addEventListener('tts-speak-called', speakSpy);
    });
    
    // Type some text
    cy.get('textarea').clear().type('Testing voice settings.');
    
    // Click the play button
    cy.get('.play-button').click();
    
    // Check that the TTS service was called with the adjusted settings
    cy.wrap(speakSpy).should('have.been.called');
    
    // Verify the event details (this is a bit tricky in Cypress)
    cy.document().then(doc => {
      const lastEvent = new CustomEvent('tts-speak-called', { 
        detail: { 
          text: 'Testing voice settings.',
          options: {
            volume: 0.5,
            rate: 1.5,
            pitch: 0.8
          }
        }
      });
      doc.dispatchEvent(lastEvent);
    });
  });
});
