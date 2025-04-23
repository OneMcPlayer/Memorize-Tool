/// <reference types="cypress" />

describe('TTS Service', () => {
  beforeEach(() => {
    // Visit the app
    cy.visit('/');

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
  });

  it('should expose the TTS service to the window object', () => {
    cy.window().should('have.property', 'ttsService');
  });

  it('should have the correct methods and properties', () => {
    cy.window().then((win) => {
      expect(win.ttsService).to.have.property('speak');
      expect(win.ttsService).to.have.property('stop');
      expect(win.ttsService).to.have.property('isTestMode');
      expect(win.ttsService).to.have.property('lastSpokenText');
      expect(win.ttsService).to.have.property('lastSpokenOptions');
    });
  });

  it('should track calls to speak method', () => {
    cy.window().then((win) => {
      // Set test mode
      win.ttsService.isTestMode = true;

      // Call speak method
      win.ttsService.speak('Test speech', { volume: 0.8, rate: 1.2, pitch: 1.1 });

      // Check that the call was tracked
      expect(win.ttsService.speakCalled).to.be.true;
      expect(win.ttsService.lastSpokenText).to.equal('Test speech');
      expect(win.ttsService.lastSpokenOptions).to.deep.include({
        volume: 0.8,
        rate: 1.2,
        pitch: 1.1
      });
    });
  });

  it('should update lastSpokenText when speak is called', () => {
    cy.window().then(win => {
      // Call speak method
      win.ttsService.speak('Test event dispatch');

      // Check that lastSpokenText was updated
      expect(win.ttsService.lastSpokenText).to.equal('Test event dispatch');
    });
  });

  it('should dispatch custom events when stop is called', () => {
    // Create a spy for the custom event
    const stopSpy = cy.spy();

    cy.document().then(doc => {
      // Add event listener
      doc.addEventListener('tts-stop-called', stopSpy);

      // Call stop method
      cy.window().then(win => {
        win.ttsService.stop();
      });

      // Check that the event was dispatched
      cy.wrap(stopSpy).should('have.been.called');
    });
  });
});
