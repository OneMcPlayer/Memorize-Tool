import React, { useEffect, useState } from 'react';
import { AppProvider } from './context/AppContext';
import { ErrorHandler } from './utils/ErrorHandler';
import { showToast } from './utils';
import Header from './components/layout/Header';
import InputView from './components/views/InputView';
import PracticeView from './components/views/PracticeView';
import ConverterView from './components/views/ConverterView';
import AboutView from './components/views/AboutView';
import './App.css';

// View constants
const VIEWS = {
  INPUT: 'input',
  PRACTICE: 'practice',
  CONVERTER: 'converter',
  ABOUT: 'about'
};

function App() {
  const [currentView, setCurrentView] = useState(VIEWS.INPUT);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize the application
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize error handling
        ErrorHandler.initialize(error => {
          showToast(error.message, 3000, 'error');
        });

        // Mark as initialized
        setIsInitialized(true);
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
      case VIEWS.CONVERTER:
        return <ConverterView onBack={() => setCurrentView(VIEWS.INPUT)} />;
      case VIEWS.ABOUT:
        return <AboutView onBack={() => setCurrentView(VIEWS.INPUT)} />;
      case VIEWS.INPUT:
      default:
        return (
          <InputView
            onStartPractice={() => setCurrentView(VIEWS.PRACTICE)}
            onOpenConverter={() => setCurrentView(VIEWS.CONVERTER)}
          />
        );
    }
  };

  return (
    <AppProvider>
      <div className="app-container">
        <Header
          onOpenConverter={() => setCurrentView(VIEWS.CONVERTER)}
          onOpenAbout={() => setCurrentView(VIEWS.ABOUT)}
        />
        <main className="app-content">
          {renderView()}
        </main>
        <div className="toast"></div>
        <div className="spinner"></div>
      </div>
    </AppProvider>
  );
}

export default App;