import React, { useEffect, useState } from 'react';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { ErrorHandler } from './utils/ErrorHandler';
import { showToast } from './utils';
import UserProfile from './components/UserProfile';
import Header from './components/layout/Header';
import MobileNavBar from './components/layout/MobileNavBar';
import InstallPrompt from './components/common/InstallPrompt';
import OfflineIndicator from './components/common/OfflineIndicator';
import ApiDebugPanel from './components/common/ApiDebugPanel';
import InputView from './components/views/InputView';
import PracticeView from './components/views/PracticeView';
import ScriptMemorizationPractice from './components/views/ScriptMemorizationPractice';
import ConverterView from './components/views/ConverterView';
import AboutView from './components/views/AboutView';
import AudioTestComponent from './components/test/AudioTestComponent';
import TtsTestPage from './components/test/TtsTestPage';
import SttTestComponent from './components/test/SttTestComponent';
import ServerTest from './components/ServerTest';
import './App.css';

// View constants
const VIEWS = {
  INPUT: 'input',
  PRACTICE: 'practice',
  SCRIPT_MEMORIZATION_PRACTICE: 'script_memorization_practice',
  CONVERTER: 'converter',
  ABOUT: 'about',
  AUDIO_TEST: 'audio_test',
  TTS_TEST: 'tts_test',
  STT_TEST: 'stt_test',
  SERVER_TEST: 'server_test',
  PROFILE: 'profile'
};

function App() {
  const [currentView, setCurrentView] = useState(VIEWS.INPUT);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Initialize the application
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize error handling
        ErrorHandler.initialize(error => {
          showToast(error.message, 3000, 'error');
        });

        // Detect mobile device
        const checkMobile = () => {
          setIsMobile(window.innerWidth < 768);
        };

        // Initial check
        checkMobile();

        // Listen for resize events
        window.addEventListener('resize', checkMobile);

        // Mark as initialized
        setIsInitialized(true);

        return () => {
          window.removeEventListener('resize', checkMobile);
        };
      } catch (error) {
        console.error('Failed to initialize app:', error);
        showToast('Error initializing application', 3000, 'error');
      }
    };

    initializeApp();
  }, []);

  // Render the current view
  const renderView = () => {
    if (!isInitialized) {
      return <div className="loading">Loading application...</div>;
    }

    switch (currentView) {
      case VIEWS.PRACTICE:
        return <PracticeView onBack={() => setCurrentView(VIEWS.INPUT)} />;
      case VIEWS.SCRIPT_MEMORIZATION_PRACTICE:
        return <ScriptMemorizationPractice onBack={() => setCurrentView(VIEWS.INPUT)} />;
      case VIEWS.CONVERTER:
        return <ConverterView onBack={() => setCurrentView(VIEWS.INPUT)} />;
      case VIEWS.ABOUT:
        return <AboutView onBack={() => setCurrentView(VIEWS.INPUT)} />;
      case VIEWS.AUDIO_TEST:
        return <AudioTestComponent />;
      case VIEWS.TTS_TEST:
        return <TtsTestPage />;
      case VIEWS.STT_TEST:
        return <SttTestComponent />;
      case VIEWS.SERVER_TEST:
        return <ServerTest onBack={() => setCurrentView(VIEWS.INPUT)} />;
      case VIEWS.PROFILE:
        return <UserProfile onBack={() => setCurrentView(VIEWS.INPUT)} />;
      case VIEWS.INPUT:
      default:
        return (
          <InputView
            onStartPractice={() => setCurrentView(VIEWS.PRACTICE)}
            onStartMemorizationPractice={() => setCurrentView(VIEWS.SCRIPT_MEMORIZATION_PRACTICE)}
            onOpenConverter={() => setCurrentView(VIEWS.CONVERTER)}
          />
        );
    }
  };

  return (
    <AuthProvider>
      <AppProvider>
        <div className={`app-container ${isMobile ? 'mobile-layout' : ''}`}>
          <OfflineIndicator />
          <Header
            onOpenConverter={() => setCurrentView(VIEWS.CONVERTER)}
            onOpenAbout={() => setCurrentView(VIEWS.ABOUT)}
            onOpenAudioTest={() => setCurrentView(VIEWS.AUDIO_TEST)}
            onOpenTtsTest={() => setCurrentView(VIEWS.TTS_TEST)}
            onOpenSttTest={() => setCurrentView(VIEWS.STT_TEST)}
            onOpenServerTest={() => setCurrentView(VIEWS.SERVER_TEST)}
            onOpenProfile={() => setCurrentView(VIEWS.PROFILE)}
          />
          <main className={`app-content ${isMobile ? 'mobile-content' : ''}`}>
            {renderView()}
          </main>
          {isMobile && (
            <MobileNavBar
              currentView={currentView}
              onChangeView={setCurrentView}
            />
          )}
          <InstallPrompt />
          <ApiDebugPanel />
          <div className="toast"></div>
          <div className="spinner"></div>
        </div>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;