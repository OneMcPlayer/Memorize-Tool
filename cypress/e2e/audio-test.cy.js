/// <reference types="cypress" />

describe('Audio Test Component', () => {
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
      
      // Mock Audio constructor
      const originalAudio = win.Audio;
      win.Audio = function(src) {
        const audio = new originalAudio(src);
        
        // Override play method
        const originalPlay = audio.play;
        audio.play = function() {
          // Dispatch a custom event for testing
          const event = new CustomEvent('audio-play-called', { 
            detail: { src: this.src } 
          });
          document.dispatchEvent(event);
          
          // For direct audio test, always succeed
          if (this.src && this.src.includes('test-audio.mp3')) {
            return Promise.resolve();
          }
          
          // For Google TTS, simulate failure
          if (this.src && this.src.includes('translate_tts')) {
            return Promise.reject(new Error('play_rejected'));
          }
          
          // Default behavior
          return originalPlay.call(this);
        };
        
        return audio;
      };
    });
    
    // Open the Audio Test page
    cy.get('.options-button').click();
    cy.contains('Audio Test').click();
  });
  
  it('should display the Audio Test component', () => {
    cy.contains('h1', 'Audio Test').should('be.visible');
    cy.get('#test-select').should('be.visible');
    cy.get('.run-button').should('be.visible');
  });
  
  it('should run the Direct Audio Test successfully', () => {
    // Select Direct Audio Test
    cy.get('#test-select').select('direct');
    
    // Spy on the custom event
    const playSpy = cy.spy();
    cy.document().then(doc => {
      doc.addEventListener('audio-play-called', playSpy);
    });
    
    // Run the test
    cy.get('.run-button').click();
    
    // Check that the audio play method was called
    cy.wrap(playSpy).should('have.been.called');
    
    // Check the test results
    cy.contains('Direct Audio Test').should('be.visible');
    cy.contains('Direct audio playback test completed successfully').should('be.visible');
  });
  
  it('should show failure for Google TTS Test', () => {
    // Select Google TTS Test
    cy.get('#test-select').select('google');
    
    // Run the test
    cy.get('.run-button').click();
    
    // Check the test results
    cy.contains('Google TTS Test').should('be.visible');
    cy.contains('Type: play_rejected').should('be.visible');
    cy.contains('The TTS service failed to play audio with Google TTS').should('be.visible');
  });
  
  it('should run the Web Speech API Test successfully', () => {
    // Select Web Speech API Test
    cy.get('#test-select').select('alternative');
    
    // Spy on the custom event
    const speakSpy = cy.spy();
    cy.document().then(doc => {
      doc.addEventListener('tts-speak-called', speakSpy);
    });
    
    // Run the test
    cy.get('.run-button').click();
    
    // Check that the TTS service was called
    cy.wrap(speakSpy).should('have.been.called');
    
    // Check the test results
    cy.contains('Alternative TTS Test').should('be.visible');
    cy.contains('Web Speech API test completed successfully').should('be.visible');
  });
  
  it('should run the Direct TTS Test successfully', () => {
    // Spy on the custom event
    const speakSpy = cy.spy();
    cy.document().then(doc => {
      doc.addEventListener('tts-speak-called', speakSpy);
    });
    
    // Run the Direct TTS Test
    cy.contains('Test TTS Service').click();
    
    // Check that the TTS service was called
    cy.wrap(speakSpy).should('have.been.called');
    
    // Check the test results
    cy.get('.test-result').should('be.visible');
    cy.get('.test-result.success').should('be.visible');
    cy.contains('TTS service test completed successfully').should('be.visible');
  });
  
  it('should display browser information', () => {
    cy.get('.browser-info').should('be.visible');
    cy.contains('User Agent:').should('be.visible');
    cy.contains('Audio Context Support:').should('be.visible');
    cy.contains('Speech Synthesis Support:').should('be.visible');
  });
});
