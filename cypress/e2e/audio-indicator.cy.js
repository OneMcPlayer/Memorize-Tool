/// <reference types="cypress" />

describe('Audio Indicator', () => {
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

    // Open the TTS Test page
    cy.get('#optionsToggle').click();
    cy.get('#optionTtsTest').click();
  });

  it('should show the TTS test page', () => {
    cy.contains('h1', 'Text-to-Speech Test').should('be.visible');
  });

  it('should update status when playing audio', () => {
    // Type some text
    cy.get('textarea').clear().type('This is a test of the audio indicator.');

    // Click the play button
    cy.get('.play-button').click();

    // Check that the status is updated
    cy.get('.status').should('contain', 'Playing');

    // Check that the stop button is enabled
    cy.get('.stop-button').should('not.be.disabled');
  });

  it('should update status when stopping audio', () => {
    // Type some text
    cy.get('textarea').clear().type('This is a test of the audio indicator.');

    // Click the play button
    cy.get('.play-button').click();

    // Check that the status is updated
    cy.get('.status').should('contain', 'Playing');

    // Click the stop button
    cy.get('.stop-button').click();

    // Check that the status is updated
    cy.get('.status').should('contain', 'Playback stopped');
  });

  it('should adjust voice settings with sliders', () => {
    // Type some text first
    cy.get('textarea').clear().type('Testing voice settings.');

    // Set the TTS service to test mode
    cy.window().then(win => {
      win.ttsService.isTestMode = true;
    });

    // Click the play button with default settings
    cy.get('.play-button').click();

    // Check that the status is updated
    cy.get('.status').should('contain', 'Playing');

    // Wait for the playback to complete
    cy.wait(1000);

    // Click the stop button
    cy.get('.stop-button').click();

    // Verify the text was spoken with default settings
    cy.window().then(win => {
      expect(win.ttsService.lastSpokenText).to.equal('Testing voice settings.');
      // Default values should be used
      expect(win.ttsService.lastSpokenOptions).to.have.property('volume');
      expect(win.ttsService.lastSpokenOptions).to.have.property('rate');
      expect(win.ttsService.lastSpokenOptions).to.have.property('pitch');
    });
  });
});
