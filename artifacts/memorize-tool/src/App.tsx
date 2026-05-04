import React, { useEffect, useState } from "react";
import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import { ErrorHandler } from "./utils/ErrorHandler";
import { showToast } from "./utils";
import Header from "./components/layout/Header";
import InputView from "./components/views/InputView";
import PracticeView from "./components/views/PracticeView";
import ConverterView from "./components/views/ConverterView";
import AboutView from "./components/views/AboutView";
import ScriptMemorizationPractice from "./components/views/ScriptMemorizationPractice";
import UserProfile from "./components/UserProfile";
import OfflineIndicator from "./components/common/OfflineIndicator";
import InstallPrompt from "./components/common/InstallPrompt";
import ServerStatusBadge from "./components/common/ServerStatusBadge";
import ApiUnreachableBanner from "./components/common/ApiUnreachableBanner";
import AudioTestComponent from "./components/test/AudioTestComponent";
import TtsTestPage from "./components/test/TtsTestPage";
import { ApiHealthProvider, useApiHealthState } from "./hooks/useApiHealth";
import {
  captureDiagnostic,
  initializeDiagnostics,
  recordDiagnosticBreadcrumb,
} from "./services/diagnosticsService";

const VIEWS = {
  INPUT: "input",
  PRACTICE: "practice",
  SCRIPT_MEMORIZATION_PRACTICE: "script_memorization_practice",
  CONVERTER: "converter",
  ABOUT: "about",
  PROFILE: "profile",
  AUDIO_TEST: "audio_test",
  TTS_TEST: "tts_test",
};

function App() {
  const [currentView, setCurrentView] = useState(VIEWS.INPUT);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        initializeDiagnostics();
        ErrorHandler.initialize((error: Error) => {
          recordDiagnosticBreadcrumb(
            "app-error-toast",
            { message: error.message, name: error.name },
            "error",
          );
          showToast(error.message, 3000, "error");
        });
        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize app:", error);
        captureDiagnostic({
          error,
          type: "app-initialization-error",
        });
        showToast("Error initializing application", 3000, "error");
      }
    };

    initializeApp();
  }, []);

  const renderView = () => {
    if (!isInitialized) {
      return <div className="loading">Loading application...</div>;
    }

    switch (currentView) {
      case VIEWS.PRACTICE:
        return <PracticeView onBack={() => setCurrentView(VIEWS.INPUT)} />;
      case VIEWS.SCRIPT_MEMORIZATION_PRACTICE:
        return (
          <ScriptMemorizationPractice
            onBack={() => setCurrentView(VIEWS.INPUT)}
          />
        );
      case VIEWS.CONVERTER:
        return <ConverterView onBack={() => setCurrentView(VIEWS.INPUT)} />;
      case VIEWS.ABOUT:
        return <AboutView onBack={() => setCurrentView(VIEWS.INPUT)} />;
      case VIEWS.PROFILE:
        return <UserProfile onBack={() => setCurrentView(VIEWS.INPUT)} />;
      case VIEWS.AUDIO_TEST:
        return <AudioTestComponent />;
      case VIEWS.TTS_TEST:
        return <TtsTestPage />;
      case VIEWS.INPUT:
      default:
        return (
          <InputView
            onStartPractice={() => setCurrentView(VIEWS.PRACTICE)}
            onStartMemorization={() =>
              setCurrentView(VIEWS.SCRIPT_MEMORIZATION_PRACTICE)
            }
            onOpenConverter={() => setCurrentView(VIEWS.CONVERTER)}
          />
        );
    }
  };

  const apiHealth = useApiHealthState();

  return (
    <ApiHealthProvider value={apiHealth}>
      <AppProvider>
        <AuthProvider>
          <div className="app-container">
            <Header
              onOpenConverter={() => setCurrentView(VIEWS.CONVERTER)}
              onOpenAbout={() => setCurrentView(VIEWS.ABOUT)}
              onOpenProfile={() => setCurrentView(VIEWS.PROFILE)}
              onOpenAudioTest={() => setCurrentView(VIEWS.AUDIO_TEST)}
              onOpenTtsTest={() => setCurrentView(VIEWS.TTS_TEST)}
            />
            <main className="app-content">{renderView()}</main>
            <ApiUnreachableBanner />
            <ServerStatusBadge />
            <OfflineIndicator />
            <InstallPrompt />
            <div className="toast"></div>
            <div className="spinner"></div>
          </div>
        </AuthProvider>
      </AppProvider>
    </ApiHealthProvider>
  );
}

export default App;
