import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Create context
const AppContext = createContext();

// Custom hook to use the app context
export const useAppContext = () => useContext(AppContext);

// Provider component
export const AppProvider = ({ children }) => {
  // Settings state
  const [currentLang, setCurrentLang] = useState('en');
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Script state
  const [scriptLines, setScriptLines] = useState([]);
  const [extractedLines, setExtractedLines] = useState([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [precedingCount, setPrecedingCount] = useState(0);

  // Initialize settings from localStorage
  useEffect(() => {
    // Load language preference
    const storedLang = localStorage.getItem('lang') || 'en';
    setCurrentLang(storedLang);

    // Load theme preference
    const storedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(storedDarkMode);
    if (storedDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    // Load advanced mode preference
    const storedAdvancedMode = localStorage.getItem('advancedMode') === 'true';
    setIsAdvancedMode(storedAdvancedMode);
  }, []);

  // Settings functions
  const setLanguage = (lang) => {
    setCurrentLang(lang);
    localStorage.setItem('lang', lang);
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);

    if (newDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    localStorage.setItem('darkMode', newDarkMode);
    return newDarkMode;
  };

  const setAdvancedMode = (enabled) => {
    setIsAdvancedMode(enabled);
    localStorage.setItem('advancedMode', enabled);
  };

  // Script state functions
  // Using useCallback to memoize the function
  const resetScriptState = useCallback(() => {
    setScriptLines([]);
    setExtractedLines([]);
    setCurrentLineIndex(0);
    setPrecedingCount(0);
  }, []);

  const nextLine = () => {
    if (currentLineIndex < extractedLines.length - 1) {
      setCurrentLineIndex(currentLineIndex + 1);
    }
  };

  const getCurrentLineData = () => {
    if (extractedLines.length === 0 || currentLineIndex >= extractedLines.length) {
      return null;
    }

    const currentEntry = extractedLines[currentLineIndex];
    console.log('Current line:', currentEntry);

    // Get all script lines for context
    let contextLines = [];

    // For normal practice mode (not tests)
    if (typeof currentEntry.index === 'number') {
      // Find the previous line of the same character if this isn't the first line
      let startIndex = 0;

      if (currentLineIndex > 0) {
        // Find the previous line of the same character
        const previousCharacterLines = extractedLines
          .slice(0, currentLineIndex)
          .filter(line => line.speaker === currentEntry.speaker);

        if (previousCharacterLines.length > 0) {
          const previousLine = previousCharacterLines[previousCharacterLines.length - 1];
          // Get all lines between the previous line and the current line
          startIndex = previousLine.index + 1;
          console.log('Previous line of same character found at index:', previousLine.index);
        } else {
          // If this is the first line of the character, use the precedingCount
          startIndex = Math.max(0, currentEntry.index - precedingCount);
        }
      } else {
        // If this is the first line overall, use the precedingCount
        startIndex = Math.max(0, currentEntry.index - precedingCount);
      }

      // Get all lines between the start index and the current line
      const rawContextLines = scriptLines.slice(startIndex, currentEntry.index);

      console.log('Getting context lines:', startIndex, 'to', currentEntry.index);
      console.log('Raw context lines:', rawContextLines);

      // Format the context lines to include speaker information
      contextLines = rawContextLines.map(line => {
        // Use regex to properly extract speaker and dialogue, handling colons in dialogue
        const match = line.match(/^([A-Za-z0-9À-ÿ\s]+):\s*(.*)$/);
        if (match) {
          const speaker = match[1].trim();
          const dialogue = match[2].trim();
          return { speaker, line: dialogue };
        }
        return line;
      });

      console.log('Final formatted context lines:', contextLines);
    } else {
      // For tests - get the preceding lines based on current index
      const startIndex = Math.max(0, currentLineIndex - precedingCount);
      contextLines = extractedLines.slice(startIndex, currentLineIndex);
    }

    return {
      current: currentEntry,
      context: contextLines,
      isLastLine: currentLineIndex === extractedLines.length - 1
    };
  };

  // Provide the context value
  const contextValue = {
    // Settings state
    currentLang,
    isAdvancedMode,
    isDarkMode,
    setLanguage,
    toggleDarkMode,
    setAdvancedMode,

    // Script state
    scriptLines,
    extractedLines,
    currentLineIndex,
    precedingCount,
    setScriptLines,
    setExtractedLines,
    setPrecedingCount,
    resetScriptState,
    nextLine,
    getCurrentLineData,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
