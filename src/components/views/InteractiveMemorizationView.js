import React, { useState, useEffect, useRef, useCallback } from 'react';
import openaiService from '../../services/openaiService';
import ApiKeyInput from '../common/ApiKeyInput';
import './InteractiveMemorizationView.css';

/**
 * Interactive Memorization View
 *
 * This component implements a feature where the system plays all other roles
 * using OpenAI's TTS API.
 *
 * NOTE: Speech-to-text (STT) functionality is temporarily disabled.
 * Currently, the system pauses when it's the user's turn and shows their line
 * when they click the "I Said My Line" button.
 *
 * The original functionality (commented out) used OpenAI's STT API to listen to
 * the user's speech and provide feedback on whether their lines match the expected lines.
 */
const InteractiveMemorizationView = ({
  scriptLines,
  extractedLines,
  userCharacter,
  onBack,
  translations,
  currentLang
}) => {
  // State for managing the testing flow
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [otherCharacterLines, setOtherCharacterLines] = useState([]);
  const [currentOtherLineIndex, setCurrentOtherLineIndex] = useState(0);
  const [waitingForUserLine, setWaitingForUserLine] = useState(false);
  const [showUserLine, setShowUserLine] = useState(false);
  const [testComplete, setTestComplete] = useState(false);

  // These states are for the future STT functionality, but we keep them to avoid breaking code
  const [isRecording, setIsRecording] = useState(false);
  const [recordedText, setRecordedText] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);
  const [showComparison, setShowComparison] = useState(false);

  const [results, setResults] = useState({
    totalLines: 0,
    correctLines: 0,
    accuracy: 0
  });

  // State for UI and settings
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [characterVoices, setCharacterVoices] = useState({});
  const [volume, setVolume] = useState(1.0);
  const [speed, setSpeed] = useState(1.0);
  const [ttsModelKey, setTtsModelKey] = useState('hd'); // Default to HD model
  const [isDemoMode, setIsDemoMode] = useState(false); // Track demo mode state
  const [currentData, setCurrentData] = useState({
    current: null,
    context: []
  });

  // Refs - these are for the future STT functionality, but we keep them to avoid breaking code
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  // Get translations
  const t = translations[currentLang] || {};

  // Update current line data
  const updateCurrentLineData = useCallback(() => {
    console.log('Updating current line data, index:', currentLineIndex);

    // If we don't have extracted lines, create dummy data for demo purposes
    if (!extractedLines || extractedLines.length === 0) {
      console.log('No extracted lines found, creating dummy data for demo');
      setCurrentData({
        current: {
          speaker: userCharacter || 'User',
          line: 'This is a demo line for the user character.'
        },
        context: [],
        isLastLine: false
      });
      return;
    }

    // If the current index is out of bounds, reset data
    if (currentLineIndex >= extractedLines.length) {
      console.log('Current index out of bounds, resetting data');
      setCurrentData({ current: null, context: [] });
      return;
    }

    // Get the current entry from the extracted lines
    const currentEntry = extractedLines[currentLineIndex];
    console.log('Current entry:', currentEntry);

    // Set the current data
    setCurrentData({
      current: currentEntry,
      context: [],
      isLastLine: currentLineIndex === extractedLines.length - 1
    });
  }, [currentLineIndex, extractedLines, userCharacter]);

  // Parse script to extract other character lines and maintain script sequence
  const parseScript = useCallback(() => {
    console.log('Parsing script, lines:', scriptLines ? scriptLines.length : 0);

    // If we don't have script lines, create dummy data for demo purposes
    if (!scriptLines || scriptLines.length === 0) {
      console.log('No script lines found, creating dummy data for demo');

      // Create dummy data for other characters
      setOtherCharacterLines([
        { speaker: 'Demo Character 1', line: 'This is a demo line from character 1.' },
        { speaker: 'Demo Character 2', line: 'This is another demo line from character 2.' }
      ]);

      return;
    }

    // Get all lines from the script
    const relevantScriptLines = scriptLines.filter(line => line.trim());
    const parsedLines = [];
    const allParsedLines = []; // Store all lines to maintain script sequence

    relevantScriptLines.forEach((line, index) => {
      if (!line.trim()) return; // Skip empty lines

      // Use regex to extract speaker and dialogue
      const match = line.match(/^([A-Za-z0-9À-ÿ\s]+):\s*(.*)$/);
      if (match) {
        const speaker = match[1].trim();
        const dialogue = match[2].trim();

        // Store all parsed lines with their original index to maintain sequence
        allParsedLines.push({
          speaker,
          line: dialogue,
          originalIndex: index,
          isUserLine: speaker === userCharacter
        });

        // Also maintain a separate list of just other character lines
        if (speaker !== userCharacter) {
          parsedLines.push({ speaker, line: dialogue });
        }
      }
    });

    console.log(`Parsed ${parsedLines.length} lines from other characters and ${allParsedLines.length} total lines`);
    setOtherCharacterLines(parsedLines);

    // Store the complete script sequence in a ref for navigation
    window.completeScriptSequence = allParsedLines;
    console.log('Complete script sequence:', allParsedLines);

    // Don't call updateCurrentLineData() here to avoid circular dependencies
    // It will be called by the useEffect that depends on currentLineIndex
  }, [scriptLines, userCharacter]);

  // Assign voices to characters
  const assignVoicesToCharacters = useCallback(() => {
    const voices = openaiService.getVoices();
    const voiceAssignments = {};

    // Get unique character names
    const characters = [...new Set(otherCharacterLines.map(line => line.speaker))];

    // Assign voices to characters
    characters.forEach((character, index) => {
      // Cycle through available voices
      const voiceIndex = index % voices.length;
      voiceAssignments[character] = voices[voiceIndex];
    });

    setCharacterVoices(voiceAssignments);
  }, [otherCharacterLines]);

  // Stop recording
  const stopRecording = useCallback(() => {
    try {
      console.log('Stopping recording...');

      // If in demo mode, just reset the recording state and return
      if (isDemoMode) {
        console.log('In demo mode, no need to stop actual recording');
        setIsRecording(false);
        return;
      }

      // If we don't have a MediaRecorder, just reset the state
      if (!mediaRecorderRef.current) {
        console.log('No MediaRecorder found, just resetting state');

        // If we're already in recording state but don't have a MediaRecorder,
        // this indicates a state inconsistency - reset the state
        if (isRecording) {
          console.log('State inconsistency detected: isRecording=true but no MediaRecorder exists');
          setIsRecording(false);
        }

        // Return early - don't try to stop a non-existent recorder
        return;
      }

      // Check MediaRecorder state and stop if recording
      console.log('MediaRecorder state:', mediaRecorderRef.current.state);

      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        console.log('MediaRecorder stopped');

        // Show a toast to indicate recording has stopped
        import('../../utils').then(utils => {
          utils.showToast(
            'Recording stopped. Processing your speech...',
            3000,
            'info'
          );
        });
      } else {
        console.log('MediaRecorder was not recording');

        // If the MediaRecorder exists but isn't recording, and our state says we are recording,
        // this is another state inconsistency
        if (isRecording) {
          console.log('State inconsistency detected: isRecording=true but MediaRecorder is not recording');
          setIsRecording(false);
        }
      }

      // Stop all audio tracks from the stream
      if (streamRef.current) {
        console.log('Stopping audio tracks...');
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('Track stopped:', track.kind);
        });
        streamRef.current = null;
      } else {
        console.log('No stream found');
      }

      // Clear the MediaRecorder reference after stopping
      mediaRecorderRef.current = null;

    } catch (err) {
      console.error('Error stopping recording:', err);

      // Show a toast with the error
      import('../../utils').then(utils => {
        utils.showToast(
          'Error stopping recording: ' + err.message,
          3000,
          'error'
        );
      });

      // Reset recording state and references
      setIsRecording(false);
      mediaRecorderRef.current = null;

      // Also stop any tracks if we have a stream
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        } catch (trackErr) {
          console.error('Error stopping tracks after error:', trackErr);
        }
      }
    }
  }, [isRecording, isDemoMode, mediaRecorderRef, streamRef]);

  // Initialize component - only run once on mount
  useEffect(() => {
    console.log('Initializing component - first render');
    console.log('Script data check:', {
      scriptLines: scriptLines ? scriptLines.length : 0,
      extractedLines: extractedLines ? extractedLines.length : 0,
      userCharacter: userCharacter || 'Not set'
    });

    // Clear any previous script sequence
    window.completeScriptSequence = null;

    let isMounted = true; // Flag to prevent state updates after unmount

    const initialize = async () => {
      try {
        if (!isMounted) return; // Safety check
        setIsLoading(true);

        // Check if OpenAI API key is set
        const hasKey = openaiService.hasApiKey();
        if (isMounted) setHasApiKey(hasKey);

        // Load saved TTS model preference
        const savedModelKey = localStorage.getItem('openai_tts_model');
        if (savedModelKey && openaiService.getTtsModels()[savedModelKey] && isMounted) {
          setTtsModelKey(savedModelKey);
        }

        // Check if demo mode is enabled
        const demoModeEnabled = openaiService.isDemoModeEnabled();
        if (isMounted) setIsDemoMode(demoModeEnabled);

        // If no API key is set, automatically enable demo mode (silently)
        if (!hasKey) {
          openaiService.setDemoMode(true, false); // Pass false to suppress logging
          if (isMounted) setIsDemoMode(true);
        }

        // Always force demo mode to true for now since we're in debug mode
        if (isMounted) setIsDemoMode(true);

        // Check if we have valid script data
        if (!scriptLines || scriptLines.length === 0 || !extractedLines || extractedLines.length === 0) {
          console.error('Missing script data:', {
            scriptLines: scriptLines ? scriptLines.length : 0,
            extractedLines: extractedLines ? extractedLines.length : 0
          });
          if (isMounted) {
            setError('Missing script data. Please go back and select a script with valid lines.');
            setIsLoading(false);
            return;
          }
        }

        // Parse script to extract other character lines - this will set otherCharacterLines
        // and initialize the complete script sequence
        if (isMounted) parseScript();

        // Wait a tick to ensure state updates have been processed
        await new Promise(resolve => setTimeout(resolve, 0));

        // Assign default voices to characters
        if (isMounted) assignVoicesToCharacters();

        // Log the current state after initialization
        console.log('Initialization complete, current state:', {
          otherCharacterLines: otherCharacterLines.length,
          currentLineIndex,
          isDemoMode: true, // We're forcing this to true
          hasApiKey,
          completeScriptSequence: window.completeScriptSequence ? window.completeScriptSequence.length : 0
        });

        // Finish loading
        if (isMounted) setIsLoading(false);
      } catch (err) {
        console.error('Error initializing:', err);
        if (isMounted) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    };

    initialize();

    // Clean up when component unmounts
    return () => {
      isMounted = false; // Prevent state updates after unmount

      // Only call stopRecording if we're not in demo mode or if we're actually recording
      if (!isDemoMode || (isRecording && mediaRecorderRef.current)) {
        stopRecording();
      }

      // Clear script sequence on unmount
      window.completeScriptSequence = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Update current line data when currentLineIndex changes
  useEffect(() => {
    console.log(`Current line index changed to ${currentLineIndex}`);
    // Only update if we have extracted lines
    if (extractedLines && extractedLines.length > 0) {
      updateCurrentLineData();
    }
  }, [currentLineIndex, updateCurrentLineData, extractedLines]);

  // Initialize current line data after otherCharacterLines are set
  useEffect(() => {
    console.log('Other character lines updated, initializing current line data');
    // Only update if we have extracted lines and otherCharacterLines
    if (extractedLines && extractedLines.length > 0 && otherCharacterLines.length > 0) {
      updateCurrentLineData();
    }
  }, [otherCharacterLines, updateCurrentLineData, extractedLines]);

  // Handle API key set
  const handleApiKeySet = (hasKey) => {
    setHasApiKey(hasKey);
    if (hasKey) {
      // Re-initialize with API key
      assignVoicesToCharacters();
    }
  };

  // Start or continue the test
  const handleStartTest = () => {
    console.log('handleStartTest called, debug mode:', INTERACTIVE_DEBUG_MODE, 'currentLineIndex:', currentLineIndex);

    // Check if we have valid script data
    if (!extractedLines || extractedLines.length === 0) {
      console.error('No extracted lines available for the test');
      setError('No script lines found. Please go back and select a script with valid lines.');
      return;
    }

    // If we don't have an API key and we're not in debug mode, show an error
    if (!hasApiKey && !INTERACTIVE_DEBUG_MODE) {
      setError('OpenAI API key is required to use this feature');
      return;
    }

    // If we're continuing from a previous line (not starting from the beginning)
    if (currentLineIndex > 0) {
      console.log('Continuing practice from line index:', currentLineIndex);

      // Show a toast to indicate we're continuing
      import('../../utils').then(utils => {
        utils.showToast(
          'Continuing practice session',
          2000,
          'info'
        );
      });

      // Continue with the current line
      playOtherCharacterLines();
      return;
    }

    // In debug mode, we'll simulate the flow without making API calls
    if (INTERACTIVE_DEBUG_MODE) {
      console.log('Starting test in debug mode - simulating character lines');

      // Show a toast to indicate we're in debug mode
      import('../../utils').then(utils => {
        utils.showToast(
          'Debug mode: Starting practice session',
          2000,
          'info'
        );
      });

      // Simulate waiting for other character lines to play
      setIsPlaying(true);

      // Make sure we have the current line data set correctly
      updateCurrentLineData();

      // After a delay, move to waiting for user input
      setTimeout(() => {
        setIsPlaying(false);
        setWaitingForUserLine(true);

        // Show a toast to indicate it's the user's turn
        import('../../utils').then(utils => {
          utils.showToast(
            `It's your turn, ${userCharacter}!`,
            2000,
            'info'
          );
        });
      }, 2000);
      return;
    }

    // If not in debug mode, use the actual API
    playOtherCharacterLines();
  };

  // Play other character lines
  const playOtherCharacterLines = async () => {
    console.log('playOtherCharacterLines called, current state:', {
      isPlaying,
      currentLineIndex,
      currentOtherLineIndex,
      otherCharacterLines: otherCharacterLines.length,
      waitingForUserLine,
      showUserLine
    });

    // Don't do anything if already playing
    if (isPlaying && currentOtherLineIndex > 0) {
      console.log('Already playing, ignoring call');
      return;
    }

    // Reset any lingering states that might interfere with playback
    if (showUserLine) {
      console.log('Resetting showUserLine state before playing');
      setShowUserLine(false);
    }

    if (waitingForUserLine) {
      console.log('Resetting waitingForUserLine state before playing');
      setWaitingForUserLine(false);
    }

    setIsPlaying(true);

    // If in debug mode, simulate playing lines without making API calls
    if (INTERACTIVE_DEBUG_MODE) {
      console.log('Debug mode: Simulating playing other character lines');

      // Show a toast to indicate we're in debug mode
      import('../../utils').then(utils => {
        utils.showToast(
          'Debug mode: Simulating character lines',
          2000,
          'info'
        );
      });

      // If we don't have any other character lines, create a dummy one for demo purposes
      if (otherCharacterLines.length === 0) {
        console.log('No other character lines found, creating dummy data for demo');
        setOtherCharacterLines([
          { speaker: 'Demo Character', line: 'This is a demo line from another character.' }
        ]);
      }

      // Log the lines that will be played
      console.log('Lines that will be played in debug mode:', otherCharacterLines);

      // Simulate playing each line with a delay
      for (let i = 0; i < otherCharacterLines.length; i++) {
        const line = otherCharacterLines[i];
        console.log(`Debug mode: Playing line ${i + 1}/${otherCharacterLines.length} from ${line.speaker}: "${line.line}"`);

        // Update the current other line index to show the current line in the UI
        setCurrentOtherLineIndex(i);

        // Wait for a short delay to simulate playing the line
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Simulate a delay and then set waiting for user line
      console.log('Debug mode: Finished playing simulated lines, waiting for user input');
      setIsPlaying(false);
      setWaitingForUserLine(true);

      // Show a toast to indicate it's the user's turn
      import('../../utils').then(utils => {
        utils.showToast(
          `It's your turn, ${userCharacter || 'User'}!`,
          2000,
          'info'
        );
      });

      return;
    }

    try {
      // Play each line from other characters until we reach the user's line
      for (let i = currentOtherLineIndex; i < otherCharacterLines.length; i++) {
        setCurrentOtherLineIndex(i);
        const line = otherCharacterLines[i];

        // Get the voice for this character
        const voice = characterVoices[line.speaker] || openaiService.defaultVoice;

        // Get the current TTS model
        const model = openaiService.getTtsModels()[ttsModelKey];

        // Show a toast for the current line
        import('../../utils').then(utils => {
          utils.showToast(
            `Processing line for ${line.speaker}...`,
            2000,
            'info'
          );
        });

        // Generate and play TTS audio
        const audioBlob = await openaiService.textToSpeech(line.line, {
          voice: voice,
          speed: speed,
          model: model
        });

        // Play the audio
        await openaiService.playAudio(audioBlob);

        // Add a small pause between lines
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (err) {
      console.error('Error playing other character lines:', err);

      // If in debug mode, don't show errors related to API keys
      if (INTERACTIVE_DEBUG_MODE && err.message.includes('API key')) {
        console.log('Debug mode: Ignoring API key error');

        // Simulate completion and move to user's turn
        setTimeout(() => {
          setIsPlaying(false);
          setWaitingForUserLine(true);
        }, 1000);

        return;
      }

      // Provide more detailed error messages based on the error type
      let errorMessage = 'Error playing audio. Please try again.';

      if (err.message.includes('API key')) {
        errorMessage = 'OpenAI API key error. Please check your API key.';
      } else if (err.message.includes('network') || err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (err.message.includes('Proxy')) {
        errorMessage = 'Server connection error. Please refresh the page and try again.';
      } else if (err.message.includes('SyntaxError')) {
        errorMessage = 'Error processing server response. Please try again.';
      } else if (err.message.includes('Rate limit')) {
        errorMessage = 'OpenAI rate limit reached. Your requests are being queued and will be processed automatically. Please wait...';

        // Don't set error state for rate limit errors, as they will be handled automatically
        import('../../utils').then(utils => {
          utils.showToast(errorMessage, 5000, 'warning');
        });

        // Return early without setting error state
        return;
      }

      // Import showToast dynamically to avoid circular dependencies
      import('../../utils').then(utils => {
        utils.showToast(errorMessage, 5000, 'error');
      });

      setError(errorMessage);
    } finally {
      setIsPlaying(false);
      setWaitingForUserLine(true);
    }
  };

  // Start recording user's speech - TEMPORARILY DISABLED
  /* const startRecording = async () => {
    try {
      // Reset state
      setIsRecording(true);
      setRecordedText('');
      setIsCorrect(null);
      setShowComparison(false);

      // Show a toast to indicate recording is starting
      import('../../utils').then(utils => {
        utils.showToast(
          'Starting recording... Please speak your line clearly.',
          3000,
          'info'
        );
      });

      // Get microphone access
      console.log('Requesting microphone access...');

      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording. Please try a different browser like Chrome or Edge.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;
      console.log('Microphone access granted');

      // Determine supported MIME types
      let options = {};

      // Check if the browser supports the preferred MIME type
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
        console.log('Using preferred MIME type: audio/webm;codecs=opus');
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
        console.log('Using fallback MIME type: audio/webm');
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
        console.log('Using fallback MIME type: audio/mp4');
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        options = { mimeType: 'audio/ogg' };
        console.log('Using fallback MIME type: audio/ogg');
      } else {
        console.log('No supported MIME types found, using default MediaRecorder');
      }

      // Create media recorder with the determined options
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      console.log('MediaRecorder created with options:', options);

      // Set up event handlers
      audioChunksRef.current = []; // Reset audio chunks before starting

      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available event fired, data size:', event.data.size);
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          console.log('MediaRecorder stopped, chunks collected:', audioChunksRef.current.length);

          if (audioChunksRef.current.length === 0) {
            throw new Error('No audio data was recorded. Please check your microphone and try again.');
          }

          // Create audio blob from chunks
          const audioBlob = new Blob(audioChunksRef.current, { type: options.mimeType || 'audio/webm' });
          console.log('Audio recorded, size:', Math.round(audioBlob.size / 1024), 'KB');

          // Show a toast to indicate processing
          import('../../utils').then(utils => {
            utils.showToast(
              'Processing your speech...',
              3000,
              'info'
            );
          });

          if (audioBlob.size < 1024) {
            throw new Error('Audio recording is too short. Please try again and speak clearly.');
          }

          // Convert speech to text
          const text = await openaiService.speechToText(audioBlob);
          console.log('Speech recognition result:', text);
          setRecordedText(text);

          // Compare with expected line
          const expectedLine = currentData.current?.line || '';
          const similarity = calculateSimilarity(text, expectedLine);
          const isCorrect = similarity >= 0.7; // 70% similarity threshold

          console.log('Line comparison:', {
            expected: expectedLine,
            actual: text,
            similarity: similarity,
            isCorrect: isCorrect
          });

          setIsCorrect(isCorrect);
          setShowComparison(true);

          // Update results
          setResults(prev => ({
            totalLines: prev.totalLines + 1,
            correctLines: prev.correctLines + (isCorrect ? 1 : 0),
            accuracy: ((prev.correctLines + (isCorrect ? 1 : 0)) / (prev.totalLines + 1)) * 100
          }));

          // Show a toast with the result
          import('../../utils').then(utils => {
            utils.showToast(
              `Line ${isCorrect ? 'correct' : 'incorrect'} (${Math.round(similarity * 100)}% match)`,
              3000,
              isCorrect ? 'success' : 'error'
            );
          });
        } catch (err) {
          console.error('Error processing speech:', err);

          // Provide more detailed error messages based on the error type
          let errorMessage = 'Error processing speech. Please try again.';

          if (err.message.includes('API key')) {
            errorMessage = 'OpenAI API key error. Please check your API key.';
          } else if (err.message.includes('network') || err.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your internet connection.';
          } else if (err.message.includes('too short')) {
            errorMessage = 'Audio recording is too short. Please try again and speak clearly.';
          } else if (err.message.includes('No audio data')) {
            errorMessage = 'No audio data was recorded. Please check your microphone and try again.';
          } else if (err.message.includes('Rate limit')) {
            errorMessage = 'OpenAI rate limit reached. Your request will be processed automatically. Please wait...';
          }

          import('../../utils').then(utils => {
            utils.showToast(errorMessage, 5000, 'error');
          });

          // If this is not a rate limit error, reset the recording state
          if (!err.message.includes('Rate limit')) {
            setIsRecording(false);
          }
        } finally {
          // Only set recording to false if we're not in a rate limit situation
          if (!isRecording || !openaiService.getQueueLength()) {
            setIsRecording(false);
          }
        }
      };

      // Request data every second to ensure we get data even for short recordings
      mediaRecorder.start(1000);
      console.log('MediaRecorder started with timeslice of 1000ms');

    } catch (err) {
      console.error('Error starting recording:', err);
      setIsRecording(false);

      // Provide more specific error messages
      let errorMessage = 'Error accessing microphone. Please check permissions.';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'Could not start audio recording. Your microphone might be in use by another application.';
      } else if (err.name === 'SecurityError') {
        errorMessage = 'Security error when accessing microphone. Please use HTTPS or localhost.';
      }

      import('../../utils').then(utils => {
        utils.showToast(errorMessage, 5000, 'error');
      });
    }
  }; */



  // Calculate similarity between two strings - TEMPORARILY DISABLED
  /* const calculateSimilarity = (str1, str2) => {
    // Convert to lowercase and remove punctuation for comparison
    const normalize = (str) => str.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim();

    const s1 = normalize(str1);
    const s2 = normalize(str2);

    // Simple word-based comparison
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);

    // Count matching words
    let matches = 0;
    for (const word of words1) {
      if (words2.includes(word)) {
        matches++;
      }
    }

    // Calculate similarity ratio
    const totalWords = Math.max(words1.length, words2.length);
    return totalWords > 0 ? matches / totalWords : 0;
  }; */

  // Handle when the user indicates they've said their line
  // MODIFIED: Simplified to just show the user's line without STT functionality
  const handleSaidMyLine = () => {
    console.log('handleSaidMyLine called - showing user line');
    console.log('Current data:', currentData);

    // Create a dummy line if we don't have valid current data
    if (!currentData.current) {
      console.log('No current line data, creating dummy data for demo');
      setCurrentData({
        current: {
          speaker: userCharacter || 'User',
          line: 'This is a demo line for the user character.'
        },
        context: [],
        isLastLine: false
      });
    }

    // Log the current script sequence state
    if (window.completeScriptSequence) {
      console.log('Complete script sequence available:', window.completeScriptSequence.length, 'lines');

      // Find the current user line in the complete sequence
      if (currentData.current) {
        const currentUserLine = currentData.current;
        const currentLineInSequence = window.completeScriptSequence.findIndex(
          line => line.isUserLine &&
                 line.speaker === currentUserLine.speaker &&
                 line.line === currentUserLine.line
        );

        console.log('Current line position in complete sequence:', currentLineInSequence);

        // Log the next few lines in the sequence for debugging
        if (currentLineInSequence !== -1) {
          const nextLines = window.completeScriptSequence.slice(
            currentLineInSequence + 1,
            currentLineInSequence + 5
          );
          console.log('Next few lines in sequence:', nextLines);
        }
      }
    }

    // Simply show the user's line when they click the button
    setShowUserLine(true);

    // Show a toast indicating the pause
    import('../../utils').then(utils => {
      utils.showToast(
        'Exercise paused. Review your line and continue when ready.',
        3000,
        'info'
      );
    });

    // For results tracking, we'll assume the user got it right
    // This is temporary until STT functionality is re-implemented
    setResults(prev => ({
      totalLines: prev.totalLines + 1,
      correctLines: prev.correctLines + 1,
      accuracy: ((prev.correctLines + 1) / (prev.totalLines + 1)) * 100
    }));
  };

  // Handle when the user needs help with their line
  const handleNeedHelp = () => {
    setShowUserLine(true);
  };

  // Handle when the user is ready to hide their line and continue
  const handleHideLine = () => {
    console.log('handleHideLine called - hiding user line and proceeding to next line');

    // Use a batched update approach to prevent state inconsistencies
    const batchedUpdates = () => {
      // First hide the user line
      setShowUserLine(false);

      // Ensure we're not in a waiting state that could cause the "Ready to continue" screen
      setWaitingForUserLine(false);

      // Set isPlaying to true temporarily to prevent the fallback content from showing
      setIsPlaying(true);
    };

    // Execute all state updates in a batch
    batchedUpdates();

    // Use a short timeout to ensure state updates are processed before moving to next line
    setTimeout(() => {
      // Move to the next line after hiding the current line
      // This is part of the simplified flow without STT
      handleNextLine();
    }, 50);
  };

  // Move to the next line in the script
  const handleNextLine = () => {
    console.log('Moving to next line, current index:', currentLineIndex);

    // Check if we have valid extracted lines
    if (!extractedLines || extractedLines.length === 0) {
      console.log('No extracted lines available, using demo mode logic');

      // In demo mode with no lines, just toggle between showing and hiding the line
      if (currentLineIndex >= 2) {
        // After a few demo lines, mark the test as complete
        console.log('Demo mode: Completing test after demo lines');
        setTestComplete(true);
        return;
      }

      // Move to the next demo line
      const nextIndex = currentLineIndex + 1;
      console.log(`Demo mode: Moving to next demo line (index ${nextIndex})`);

      // Reset state for next line
      setShowComparison(false);
      setRecordedText('');
      setIsCorrect(null);
      setCurrentOtherLineIndex(0);
      setWaitingForUserLine(false);
      setCurrentLineIndex(nextIndex);

      // Schedule playback for the next demo line
      setTimeout(() => {
        console.log(`Demo mode: Playing lines for demo index ${nextIndex}`);
        playOtherCharacterLines();
      }, 100);

      return;
    }

    // Store the current index and check if it's the last line
    const isLastLine = currentLineIndex >= extractedLines.length - 1;
    const nextIndex = currentLineIndex + 1;

    console.log(`Line status: current=${currentLineIndex}, next=${nextIndex}, isLast=${isLastLine}`);

    // Check if we have the complete script sequence available
    if (window.completeScriptSequence && window.completeScriptSequence.length > 0) {
      console.log('Using complete script sequence for navigation');

      // Find the current user line in the complete sequence
      const currentUserLine = extractedLines[currentLineIndex];
      console.log('Current user line:', currentUserLine);

      // Find this line in the complete sequence
      const currentLineInSequence = window.completeScriptSequence.findIndex(
        line => line.isUserLine &&
               line.speaker === currentUserLine.speaker &&
               line.line === currentUserLine.line
      );

      console.log('Current line position in complete sequence:', currentLineInSequence);

      if (currentLineInSequence !== -1 && currentLineInSequence < window.completeScriptSequence.length - 1) {
        // Find the next user line in the sequence
        let nextUserLineIndex = -1;

        // Look for the next user line after the current position
        for (let i = currentLineInSequence + 1; i < window.completeScriptSequence.length; i++) {
          if (window.completeScriptSequence[i].isUserLine) {
            nextUserLineIndex = i;
            break;
          }
        }

        console.log('Next user line index in sequence:', nextUserLineIndex);

        // If we found the next user line
        if (nextUserLineIndex !== -1) {
          // Get all lines between current and next user line
          const linesToPlay = [];
          for (let i = currentLineInSequence + 1; i < nextUserLineIndex; i++) {
            linesToPlay.push(window.completeScriptSequence[i]);
          }

          console.log('Lines to play before next user line:', linesToPlay);

          // If there are lines to play, set them as the current other character lines
          if (linesToPlay.length > 0) {
            // Update other character lines to play
            setOtherCharacterLines(linesToPlay);
          }
        }
      }
    }

    // Use a batched update approach to prevent multiple re-renders
    const batchedUpdates = () => {
      // Reset state for next line
      setShowComparison(false);
      setRecordedText('');
      setIsCorrect(null);

      // If this is the last line, mark the test as complete
      if (isLastLine) {
        console.log('This is the last line, marking test as complete');
        setTestComplete(true);
      } else {
        // Reset other state before changing the line index
        setCurrentOtherLineIndex(0);
        setWaitingForUserLine(false);

        // Move to the next user line - this will trigger the useEffect
        setCurrentLineIndex(nextIndex);
      }
    };

    // Execute all state updates in a batch
    batchedUpdates();

    // Only schedule playback if we're not on the last line
    if (!isLastLine) {
      console.log(`Scheduling playback for next line (index ${nextIndex})`);

      // Use a timeout to ensure all state updates have been processed
      setTimeout(() => {
        // Double-check that we're on the expected line before playing
        if (currentLineIndex === nextIndex) {
          console.log(`Playing lines for index ${nextIndex}`);

          // Reset isPlaying to false if it was temporarily set to true
          // This ensures we're in a consistent state before playing lines
          if (isPlaying) {
            setIsPlaying(false);
          }

          // Play the next set of lines
          playOtherCharacterLines();
        } else {
          console.log(`Line index changed (expected ${nextIndex}, got ${currentLineIndex}), not playing lines`);
        }
      }, 100); // Shorter delay with batched updates
    }
  };

  // Handle restart button click
  const handleRestart = () => {
    console.log('Restarting practice session');

    // Use a single batch update for React 18+
    // This helps prevent multiple re-renders
    const batchedUpdates = () => {
      // Reset all state variables
      setTestComplete(false);
      setShowComparison(false);
      setRecordedText('');
      setIsCorrect(null);
      setResults({
        totalLines: 0,
        correctLines: 0,
        accuracy: 0
      });

      // Reset line indices
      setCurrentOtherLineIndex(0);
      setWaitingForUserLine(false);

      // Set current line index last
      setCurrentLineIndex(0);
    };

    // Execute all state updates in a batch
    batchedUpdates();

    // Use a timeout with a longer delay to ensure all state updates have been processed
    // This prevents the race condition that can cause infinite loops
    setTimeout(() => {
      console.log('Starting test after restart');
      if (INTERACTIVE_DEBUG_MODE) {
        console.log('Debug mode: Simulating restart');
        handleStartTest();
      } else {
        playOtherCharacterLines();
      }
    }, 100); // Shorter delay should be sufficient with batched updates
  };

  // Handle back button click
  const handleBack = () => {
    stopRecording();
    onBack();
  };

  // Handle voice change for a character
  const handleVoiceChange = (character, voice) => {
    setCharacterVoices(prev => ({
      ...prev,
      [character]: voice
    }));
  };

  // Handle volume change
  const handleVolumeChange = (e) => {
    setVolume(parseFloat(e.target.value));
  };

  // Handle speed change
  const handleSpeedChange = (e) => {
    setSpeed(parseFloat(e.target.value));
  };

  // Handle TTS model change
  const handleModelChange = (e) => {
    const newModelKey = e.target.value;
    setTtsModelKey(newModelKey);
    openaiService.setTtsModel(newModelKey);
    localStorage.setItem('openai_tts_model', newModelKey);
  };

  // Handle demo mode toggle
  const handleDemoModeToggle = () => {
    const newDemoModeState = openaiService.toggleDemoMode();
    setIsDemoMode(newDemoModeState);

    // Show a toast to indicate the change
    import('../../utils').then(utils => {
      utils.showToast(
        `Demo mode ${newDemoModeState ? 'enabled' : 'disabled'}. ${
          newDemoModeState
            ? 'Speech recognition will be simulated.'
            : 'Using real OpenAI speech recognition.'
        }`,
        3000,
        'info'
      );
    });
  };

  // DEBUG MODE flag - permanent flag to make the feature work without API keys
  // Define it as a constant at the component level to ensure consistency
  const INTERACTIVE_DEBUG_MODE = true;

  // Clear any API key errors if we're in debug mode
  useEffect(() => {
    if (INTERACTIVE_DEBUG_MODE && error && error.includes('API key')) {
      setError(null);
    }
  }, [error]);

  // Debug log for render conditions
  console.log('Render conditions:', {
    isLoading,
    error,
    hasApiKey,
    INTERACTIVE_DEBUG_MODE,
    testComplete,
    isPlaying,
    waitingForUserLine,
    currentLineIndex,
    showUserLine,
    otherCharacterLines: otherCharacterLines.length,
    currentData
  });

  // Render the component
  return (
    <div className="interactive-memorization-view">
      <h1>{t.interactiveMemorizationTitle || 'Interactive Memorization Practice'}</h1>

      {isLoading ? (
        <div className="loading">
          <p>{t.loading || 'Loading...'}</p>
        </div>
      ) : error ? (
        <div className="error">
          <p>{error}</p>
          <button onClick={handleBack} className="back-btn">
            {t.backButton || 'Back'}
          </button>
        </div>
      ) : !hasApiKey && !INTERACTIVE_DEBUG_MODE ? (
        <div className="api-key-container">
          <p className="api-key-notice">
            {t.apiKeyRequired || 'This feature requires an OpenAI API key to use text-to-speech and speech recognition.'}
          </p>
          <ApiKeyInput
            onKeySet={handleApiKeySet}
            translations={translations}
            currentLang={currentLang}
          />
          <button onClick={handleBack} className="back-btn">
            {t.backButton || 'Back'}
          </button>
        </div>
      ) : testComplete ? (
        <div className="test-complete">
          <h2>{t.testComplete || 'Practice Complete!'}</h2>

          <div className="results-summary">
            <h3>{t.resultsSummary || 'Your Results'}</h3>
            <div className="results-stats">
              <div className="result-stat">
                <span className="stat-label">{t.totalLines || 'Total Lines'}</span>
                <span className="stat-value">{results.totalLines}</span>
              </div>
              <div className="result-stat">
                <span className="stat-label">{t.correctLines || 'Correct Lines'}</span>
                <span className="stat-value">{results.correctLines}</span>
              </div>
              <div className="result-stat">
                <span className="stat-label">{t.accuracy || 'Accuracy'}</span>
                <span className="stat-value">{results.accuracy.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="test-complete-actions">
            <button onClick={handleRestart} className="restart-btn">
              {t.restartButton || 'Practice Again'}
            </button>
            <button onClick={handleBack} className="back-btn">
              {t.backButton || 'Back to Menu'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="voice-settings">
            <h3>{t.voiceSettings || 'Voice Settings'}</h3>
            <div className="voice-controls">
              <div className="volume-control">
                <label htmlFor="volume-slider">{t.volume || 'Volume'}</label>
                <input
                  id="volume-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                />
              </div>
              <div className="speed-control">
                <label htmlFor="speed-slider">{t.speed || 'Speed'}</label>
                <input
                  id="speed-slider"
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={speed}
                  onChange={handleSpeedChange}
                />
              </div>
            </div>

            <div className="model-control">
              <label htmlFor="model-select">{t.ttsModel || 'Voice Quality'}</label>
              <select
                id="model-select"
                value={ttsModelKey}
                onChange={handleModelChange}
                className="model-select"
              >
                <option value="standard">{t.standardQuality || 'Standard (Faster)'}</option>
                <option value="hd">{t.hdQuality || 'High Definition'}</option>
                <option value="advanced">{t.advancedQuality || 'Advanced (Best Quality)'}</option>
              </select>
              <p className="model-description">
                {ttsModelKey === 'standard' && (t.standardModelDescription || 'Optimized for speed, lower quality')}
                {ttsModelKey === 'hd' && (t.hdModelDescription || 'Good balance of quality and speed')}
                {ttsModelKey === 'advanced' && (t.advancedModelDescription || 'Best quality, may be slower')}
              </p>
            </div>

            <div className={`demo-mode-control ${isDemoMode ? 'demo-mode-active' : ''}`}>
              <div className="demo-mode-toggle">
                <label htmlFor="demo-mode-checkbox">
                  {t.demoMode || 'Demo Mode'}
                  <span className={`demo-mode-status ${isDemoMode ? 'enabled' : 'disabled'}`}>
                    {isDemoMode ? (t.enabled || 'Enabled') : (t.disabled || 'Disabled')}
                  </span>
                </label>
                <input
                  id="demo-mode-checkbox"
                  type="checkbox"
                  checked={isDemoMode}
                  onChange={handleDemoModeToggle}
                />
              </div>
              <p className="demo-mode-description">
                {isDemoMode
                  ? (t.demoModeEnabledDescription || 'Speech recognition is simulated. No API calls will be made.')
                  : (t.demoModeDisabledDescription || 'Using real OpenAI speech recognition API.')}
              </p>
              {isDemoMode && (
                <div className="demo-mode-banner">
                  <span className="demo-icon">🎭</span>
                  <span className="demo-text">{t.demoModeBanner || 'DEMO MODE ACTIVE - Speech recognition is simulated'}</span>
                </div>
              )}
            </div>

            <div className="character-voices">
              <h4>{t.characterVoices || 'Character Voices'}</h4>
              <div className="character-voice-list">
                {Object.keys(characterVoices).map((character, index) => (
                  <div key={index} className="character-voice-item">
                    <span className="character-name">{character}</span>
                    <select
                      value={characterVoices[character]}
                      onChange={(e) => handleVoiceChange(character, e.target.value)}
                    >
                      {openaiService.getVoices().map((voice, i) => (
                        <option key={i} value={voice}>
                          {voice}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="script-testing-container">
            {/* Start test section - shown when not playing and not waiting for user line */}
            {!isPlaying && !waitingForUserLine && (
              <div className="start-test">
                <p>{t.startTestPrompt || 'Ready to start the practice?'}</p>
                <p className="instructions">
                  {t.practiceInstructions ||
                    'The system will play all other character lines using text-to-speech. ' +
                    'When it\'s your turn, say your line out loud and click "I Said My Line". ' +
                    'The system will pause and show you your line to check if you remembered it correctly.'}
                </p>
                <button onClick={handleStartTest} className="start-btn">
                  {t.startButton || 'Start Practice'}
                </button>

                {/* Debug info - only shown in debug mode */}
                {INTERACTIVE_DEBUG_MODE && (
                  <div className="debug-info" style={{ marginTop: '20px', padding: '10px', border: '1px dashed #999', borderRadius: '5px' }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>Debug Information</h4>
                    <p><strong>Current State:</strong> Waiting to start</p>
                    <p><strong>User Character:</strong> {userCharacter || 'Not set'}</p>
                    <p><strong>Script Lines:</strong> {scriptLines ? scriptLines.length : 0}</p>
                    <p><strong>Other Character Lines:</strong> {otherCharacterLines.length}</p>
                  </div>
                )}
              </div>
            )}

            {/* Other character speaking section - shown when playing */}
            {isPlaying && (
              <div className="other-character-speaking">
                {otherCharacterLines.length > 0 && currentOtherLineIndex < otherCharacterLines.length ? (
                  <p>
                    <strong>{otherCharacterLines[currentOtherLineIndex]?.speaker || 'Character'}:</strong> {otherCharacterLines[currentOtherLineIndex]?.line || 'Line not available'}
                  </p>
                ) : (
                  <p>
                    <strong>Demo Character:</strong> This is a demo line from another character.
                  </p>
                )}
              </div>
            )}

            {/* User line section - shown when waiting for user line */}
            {waitingForUserLine && (
              <div className="user-line-container">
                {showUserLine ? (
                  <div className="user-line">
                    <strong>{currentData.current?.speaker || userCharacter || 'User'}:</strong> {currentData.current?.line || 'This is your line in the script.'}
                    <button className="hide-line-btn" onClick={handleHideLine}>
                      {t.continueButton || 'Continue to Next Line'}
                    </button>
                  </div>
                ) : (
                  <div className="user-prompt">
                    <p>{(t.yourTurnPrompt && t.yourTurnPrompt.replace('{character}', userCharacter || 'User')) || `It's your turn, ${userCharacter || 'User'}!`}</p>
                    {isDemoMode && (
                      <div className="demo-mode-indicator">
                        <span className="demo-icon">🎭</span>
                        <span>{t.demoModeIndicator || 'Demo Mode: Your speech will be simulated'}</span>
                      </div>
                    )}
                    <div className="user-actions">
                      <button
                        className="said-line-btn"
                        onClick={handleSaidMyLine}
                      >
                        {t.saidMyLineButton || 'I Said My Line'}
                      </button>
                      <button className="need-help-btn" onClick={handleNeedHelp}>
                        {t.needHelpButton || 'Need Help?'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Fallback content - shown when no other content is visible and not in transition */}
            {!isPlaying && !waitingForUserLine && currentLineIndex > 0 && !showUserLine && (
              <div className="fallback-content" style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '5px', margin: '20px 0' }}>
                <p><strong>Current Status:</strong> Ready to continue practice</p>
                <p>Click "Continue Practice" to proceed with the next line.</p>
                <button
                  onClick={() => {
                    console.log('Continue Practice button clicked');
                    // Set isPlaying to true temporarily to prevent the fallback content from showing again
                    setIsPlaying(true);
                    // Use a short timeout to ensure state updates are processed
                    setTimeout(() => handleStartTest(), 50);
                  }}
                  className="continue-btn"
                  style={{ backgroundColor: '#4CAF50', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  {t.continueButton || 'Continue Practice'}
                </button>
              </div>
            )}
          </div>

          <div className="navigation-buttons">
            <button onClick={handleBack} className="back-btn">
              {t.backButton || 'Back to Menu'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default InteractiveMemorizationView;
