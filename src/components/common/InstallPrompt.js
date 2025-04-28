import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { translations } from '../../data/translations';
import './InstallPrompt.css';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const { currentLang } = useAppContext();
  const t = translations[currentLang]?.installPrompt || {};

  useEffect(() => {
    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome 76+ from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      
      // Check if user has already dismissed or installed
      const promptDismissed = localStorage.getItem('installPromptDismissed');
      if (!promptDismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Handle install button click
  const handleInstallClick = () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      // Clear the saved prompt as it can't be used again
      setDeferredPrompt(null);
      setShowPrompt(false);
    });
  };

  // Handle dismiss button click
  const handleDismissClick = () => {
    setShowPrompt(false);
    // Remember that user dismissed the prompt
    localStorage.setItem('installPromptDismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="install-prompt">
      <div className="install-prompt-content">
        <div className="install-prompt-icon">📱</div>
        <div className="install-prompt-text">
          <h3>{t.title || 'Install App'}</h3>
          <p>{t.message || 'Install this app on your device for a better experience.'}</p>
        </div>
        <div className="install-prompt-actions">
          <button 
            className="install-prompt-dismiss" 
            onClick={handleDismissClick}
            aria-label={t.dismiss || 'Dismiss'}
          >
            {t.dismiss || 'Not now'}
          </button>
          <button 
            className="install-prompt-install" 
            onClick={handleInstallClick}
            aria-label={t.install || 'Install'}
          >
            {t.install || 'Install'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
