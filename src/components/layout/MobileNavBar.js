import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { translations } from '../../data/translations';
import './MobileNavBar.css';

const MobileNavBar = ({ currentView, onChangeView }) => {
  const { currentLang } = useAppContext();
  const t = translations[currentLang]?.mobileNav || {};

  // Navigation items
  const navItems = [
    { id: 'input', icon: '📝', label: t.home || 'Home' },
    { id: 'practice', icon: '🎭', label: t.practice || 'Practice' },
    { id: 'script_memorization_practice', icon: '🧠', label: t.memorize || 'Memorize' },
    { id: 'about', icon: 'ℹ️', label: t.about || 'About' }
  ];

  return (
    <nav className="mobile-nav-bar">
      {navItems.map(item => (
        <button
          key={item.id}
          className={`mobile-nav-item ${currentView === item.id ? 'active' : ''}`}
          onClick={() => onChangeView(item.id)}
          aria-label={item.label}
        >
          <span className="mobile-nav-icon">{item.icon}</span>
          <span className="mobile-nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default MobileNavBar;
