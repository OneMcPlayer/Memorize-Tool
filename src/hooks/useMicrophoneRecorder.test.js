import { getPreferredAudioConstraints, getPreferredMimeType } from './useMicrophoneRecorder';

describe('useMicrophoneRecorder helpers', () => {
  const originalMediaRecorder = window.MediaRecorder;

  afterEach(() => {
    window.MediaRecorder = originalMediaRecorder;
  });

  it('returns the enhanced audio constraints used for recording', () => {
    expect(getPreferredAudioConstraints()).toEqual({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
      }
    });
  });

  it('prefers opus webm when the browser supports it', () => {
    window.MediaRecorder = {
      isTypeSupported: jest.fn(type => type === 'audio/webm;codecs=opus')
    };

    expect(getPreferredMimeType()).toBe('audio/webm;codecs=opus');
  });

  it('falls back through supported recorder mime types', () => {
    window.MediaRecorder = {
      isTypeSupported: jest.fn(type => type === 'audio/mp4')
    };

    expect(getPreferredMimeType()).toBe('audio/mp4');
  });
});
