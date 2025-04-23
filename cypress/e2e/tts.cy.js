/// <reference types="cypress" />

describe('Text-to-Speech Functionality', () => {
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

    // Enter script text directly in the textarea
    cy.get('.tab-btn').eq(1).click(); // Click the second tab (Paste)
    cy.get('#scriptInput').type('CHARACTER1: This is a test line.\nCHARACTER2: This is another test line.');

    // Wait for character detection
    cy.wait(500);

    // Select a character
    cy.get('.character-select').select('CHARACTER1');

    // Set context lines
    cy.get('#precedingCount').clear().type('2');

    // Start practice
    cy.get('button').contains('Start Practice').click();

    // Open the script reader
    cy.get('button').contains('View Script').click();
  });

  it('should show the script reader with playback controls', () => {
    // Check that the script reader is displayed
    cy.get('.script-reader').should('be.visible');

    // Check that the play button is displayed
    cy.get('[data-test="play-button"]').should('be.visible');

    // Check that the stop button is displayed but disabled
    cy.get('[data-test="stop-button"]').should('be.visible').should('be.disabled');
  });

  it('should call the TTS service when play button is clicked', () => {
    // Spy on the custom event
    const speakSpy = cy.spy();
    cy.document().then(doc => {
      doc.addEventListener('tts-speak-called', speakSpy);
    });

    // Click the play button
    cy.get('[data-test="play-button"]').click();

    // Check that the TTS service was called
    cy.wrap(speakSpy).should('have.been.called');

    // Check that the audio indicator is displayed
    cy.get('[data-test="audio-playing-indicator"]').should('be.visible');

    // Check that the pause button is now displayed
    cy.get('[data-test="pause-button"]').should('be.visible');

    // Check that the stop button is enabled
    cy.get('[data-test="stop-button"]').should('be.visible').should('not.be.disabled');
  });

  it('should stop playback when stop button is clicked', () => {
    // Spy on the custom events
    const speakSpy = cy.spy();
    const stopSpy = cy.spy();
    cy.document().then(doc => {
      doc.addEventListener('tts-speak-called', speakSpy);
      doc.addEventListener('tts-stop-called', stopSpy);
    });

    // Start playback
    cy.get('[data-test="play-button"]').click();

    // Wait for the audio indicator to appear
    cy.get('[data-test="audio-playing-indicator"]').should('be.visible');

    // Click the stop button
    cy.get('[data-test="stop-button"]').click();

    // Check that the stop method was called
    cy.wrap(stopSpy).should('have.been.called');

    // Check that the audio indicator is no longer displayed
    cy.get('[data-test="audio-playing-indicator"]').should('not.exist');

    // Check that the play button is displayed again
    cy.get('[data-test="play-button"]').should('be.visible');
  });

  it('should pause playback when pause button is clicked', () => {
    // Spy on the custom events
    const speakSpy = cy.spy();
    const stopSpy = cy.spy();
    cy.document().then(doc => {
      doc.addEventListener('tts-speak-called', speakSpy);
      doc.addEventListener('tts-stop-called', stopSpy);
    });

    // Start playback
    cy.get('[data-test="play-button"]').click();

    // Wait for the audio indicator to appear
    cy.get('[data-test="audio-playing-indicator"]').should('be.visible');

    // Click the pause button
    cy.get('[data-test="pause-button"]').click();

    // Check that the stop method was called (pause uses stop internally)
    cy.wrap(stopSpy).should('have.been.called');

    // Check that the audio indicator is no longer displayed
    cy.get('[data-test="audio-playing-indicator"]').should('not.exist');

    // Check that the resume button is displayed
    cy.get('[data-test="play-button"]').should('be.visible').contains('Resume');
  });

  it('should resume playback when resume button is clicked', () => {
    // Spy on the custom events
    const speakSpy = cy.spy();
    cy.document().then(doc => {
      doc.addEventListener('tts-speak-called', speakSpy);
    });

    // Start playback
    cy.get('[data-test="play-button"]').click();

    // Wait for the audio indicator to appear
    cy.get('[data-test="audio-playing-indicator"]').should('be.visible');

    // Click the pause button
    cy.get('[data-test="pause-button"]').click();

    // Check that the resume button is displayed
    cy.get('[data-test="play-button"]').contains('Resume').should('be.visible');

    // Reset the spy
    cy.document().then(doc => {
      doc.removeEventListener('tts-speak-called', speakSpy);
      doc.addEventListener('tts-speak-called', speakSpy);
    });

    // Click the resume button
    cy.get('[data-test="play-button"]').contains('Resume').click();

    // Check that the TTS service was called again
    cy.wrap(speakSpy).should('have.been.called');

    // Check that the audio indicator is displayed again
    cy.get('[data-test="audio-playing-indicator"]').should('be.visible');
  });

  it('should display the current line being spoken', () => {
    // Start playback
    cy.get('[data-test="play-button"]').click();

    // Check that the current line is displayed
    cy.get('.current-line').should('be.visible');

    // Check that the current line contains the speaker and text
    cy.get('.current-line').should('contain', 'CHARACTER1');
    cy.get('.current-line').should('contain', 'This is a test line');
  });
});
