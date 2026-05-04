import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { translations } from '../../data/translations';
import './AboutView.css';

interface AboutViewProps {
  onBack: () => void;
}

const AboutView = ({ onBack }: AboutViewProps) => {
  const { currentLang } = useAppContext();
  const t = translations[currentLang] as Record<string, string>;

  return (
    <div className="about-view">
      <h1>{t?.about || 'About'}</h1>

      <div className="about-content">
        <section className="about-section">
          <h2>🎭 {currentLang === 'it' ? 'Strumento di Memorizzazione Copioni' : 'Script Memorization Tool'}</h2>
          <p>
            {currentLang === 'it' ?
              "Questo strumento è progettato per aiutare attori e studenti di teatro a memorizzare efficacemente le loro battute praticandole nel contesto. Permette di isolare le battute del tuo personaggio mantenendo il contesto circostante, rendendo più facile imparare la tua parte all'interno del flusso del copione." :
              "This tool is designed to help actors and theater students effectively memorize their lines by practicing them in context. It allows you to isolate your character's lines while maintaining the surrounding context, making it easier to learn your part within the flow of the script."
            }
          </p>
        </section>

        <section className="about-section">
          <h2>✨ {currentLang === 'it' ? 'Funzionalità' : 'Features'}</h2>
          <ul>
            <li>{currentLang === 'it' ? 'Carica copioni dalla libreria integrata o incolla il tuo' : 'Load scripts from the built-in library or paste your own'}</li>
            <li>{currentLang === 'it' ? 'Estrai le battute per un personaggio specifico' : 'Extract lines for a specific character'}</li>
            <li>{currentLang === 'it' ? 'Pratica con contesto personalizzabile' : 'Practice with customizable context'}</li>
            <li>{currentLang === 'it' ? 'Modalità scura per una lettura confortevole' : 'Dark mode for comfortable reading'}</li>
            <li>{currentLang === 'it' ? 'Supporto multilingua' : 'Multiple language support'}</li>
            <li>{currentLang === 'it' ? 'Convertitore di copioni (in modalità sperimentale)' : 'Script converter (in experimental mode)'}</li>
          </ul>
        </section>
      </div>

      <div className="center">
        <button onClick={onBack} className="secondary-btn">
          {t?.backButton || 'Back'}
        </button>
      </div>
    </div>
  );
};

export default AboutView;
