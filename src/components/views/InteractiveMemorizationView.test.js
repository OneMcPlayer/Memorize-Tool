import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import InteractiveMemorizationView from './InteractiveMemorizationView';
import useMicrophoneRecorder from '../../hooks/useMicrophoneRecorder';
import openaiService from '../../services/openaiService';

jest.mock('../../services/openaiService', () => ({
  __esModule: true,
  default: {
    hasApiKey: jest.fn(() => true),
    getVoices: jest.fn(() => ['alloy']),
    getTtsModels: jest.fn(() => ({
      standard: 'tts-1',
      hd: 'tts-1-hd',
      advanced: 'gpt-4o-mini-tts'
    })),
    defaultVoice: 'alloy',
    textToSpeech: jest.fn(() => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' }))),
    playAudio: jest.fn(() => Promise.resolve()),
    speechToText: jest.fn(() => Promise.resolve('')),
    setTtsModel: jest.fn()
  }
}));

jest.mock('../../hooks/useMicrophoneRecorder', () => jest.fn());

jest.mock('../../utils', () => ({
  showToast: jest.fn()
}));

describe('InteractiveMemorizationView', () => {
  const translations = { en: {} };
  let recorderState;

  beforeEach(() => {
    recorderState = {
      currentBlob: null
    };

    openaiService.hasApiKey.mockReturnValue(true);
    openaiService.getVoices.mockReturnValue(['alloy']);
    openaiService.getTtsModels.mockReturnValue({
      standard: 'tts-1',
      hd: 'tts-1-hd',
      advanced: 'gpt-4o-mini-tts'
    });
    openaiService.textToSpeech.mockResolvedValue(new Blob(['audio'], { type: 'audio/mpeg' }));
    openaiService.playAudio.mockResolvedValue();
    openaiService.speechToText.mockResolvedValue('');

    useMicrophoneRecorder.mockReturnValue({
      isSupported: false,
      hasPermission: false,
      isRecording: false,
      error: null,
      requestPermission: jest.fn(() => Promise.resolve(false)),
      startRecording: jest.fn(() => Promise.resolve()),
      stopRecording: jest.fn(() => Promise.resolve(null)),
      cancelRecording: jest.fn()
    });
  });

  it('reveals the user line when help is requested', async () => {
    render(
      <InteractiveMemorizationView
        scriptLines={[
          'ROMEO: Buon giorno, padre.',
          'FRATE LORENZO: Benedicite!'
        ]}
        extractedLines={[
          {
            index: 0,
            line: 'Buon giorno, padre.',
            speaker: 'ROMEO'
          }
        ]}
        userCharacter="ROMEO"
        onBack={jest.fn()}
        translations={translations}
        currentLang="en"
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: /start practice/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /need help/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /need help/i }));

    await waitFor(() => {
      expect(screen.getByText(/ROMEO:/i)).toBeInTheDocument();
      expect(screen.getByText(/Buon giorno, padre\./i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue to next line/i })).toBeInTheDocument();
    });
  });

  it('transcribes recorded audio before evaluation cancels the recorder', async () => {
    const recordedBlob = new Blob(['audio'], { type: 'audio/webm' });

    openaiService.textToSpeech.mockResolvedValue(new Blob(['audio'], { type: 'audio/mpeg' }));
    openaiService.playAudio.mockResolvedValue();
    openaiService.speechToText.mockResolvedValue('Hello, Bob! How are you today?');

    useMicrophoneRecorder.mockImplementation(() => ({
      isSupported: true,
      hasPermission: true,
      isRecording: true,
      error: null,
      requestPermission: jest.fn(() => Promise.resolve(true)),
      startRecording: jest.fn(() => Promise.resolve()),
      stopRecording: jest.fn(
        () =>
          new Promise(resolve => {
            setTimeout(() => resolve(recorderState.currentBlob), 0);
          })
      ),
      cancelRecording: jest.fn(() => {
        recorderState.currentBlob = null;
      })
    }));

    render(
      <InteractiveMemorizationView
        scriptLines={[
          'NARRATOR: In a small town, two friends meet on a sunny day.',
          'ALICE: Hello, Bob! How are you today?'
        ]}
        extractedLines={[
          {
            index: 1,
            line: 'Hello, Bob! How are you today?',
            speaker: 'ALICE'
          }
        ]}
        userCharacter="ALICE"
        onBack={jest.fn()}
        translations={translations}
        currentLang="en"
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: /start practice/i }));

    await waitFor(() => {
      expect(openaiService.textToSpeech).toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /i said my line/i })).toBeInTheDocument();
    });

    recorderState.currentBlob = recordedBlob;
    fireEvent.click(screen.getByRole('button', { name: /i said my line/i }));

    await waitFor(() => {
      expect(openaiService.speechToText).toHaveBeenCalledWith(recordedBlob);
    });

    await waitFor(() => {
      expect(screen.getByText(/accuracy: 100%/i)).toBeInTheDocument();
      expect(screen.getByText(/transcript:/i)).toBeInTheDocument();
    });
  });
});
