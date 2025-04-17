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

    // Make sure we handle both cases where lines have an 'index' property
    // and when they don't (for test compatibility)
    let contextLines = [];
    if (typeof currentEntry.index === 'number') {
      // If this is not the first line of the character
      if (currentLineIndex > 0) {
        const previousEntry = extractedLines[currentLineIndex - 1];

        // Get all script lines between the previous line of this character and the current line
        // This ensures we include lines from other characters that appear in between
        const startIndex = previousEntry.index + 1; // Start after the previous line
        const endIndex = currentEntry.index; // End before the current line

        // Only include context if we have a reasonable number of lines
        if (endIndex - startIndex <= precedingCount * 3) { // Limit to avoid too many context lines
          contextLines = scriptLines.slice(startIndex, endIndex);

          // Format the context lines to include speaker information
          contextLines = contextLines.map(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
              const speaker = line.substring(0, colonIndex).trim();
              const dialogue = line.substring(colonIndex + 1).trim();
              return { speaker, line: dialogue };
            }
            return line;
          });

          // If we have more context lines than requested, trim from the beginning
          if (contextLines.length > precedingCount && precedingCount > 0) {
            contextLines = contextLines.slice(-precedingCount);
          }
        } else {
          // If there are too many lines between, just get the preceding count
          const startIndex = Math.max(0, currentEntry.index - precedingCount);
          contextLines = scriptLines.slice(startIndex, currentEntry.index);

          // Format the context lines
          contextLines = contextLines.map(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
              const speaker = line.substring(0, colonIndex).trim();
              const dialogue = line.substring(colonIndex + 1).trim();
              return { speaker, line: dialogue };
            }
            return line;
          });
        }
      } else {
        // For the first line, just get preceding context based on count
        const startIndex = Math.max(0, currentEntry.index - precedingCount);
        contextLines = scriptLines.slice(startIndex, currentEntry.index);

        // Format the context lines
        contextLines = contextLines.map(line => {
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const speaker = line.substring(0, colonIndex).trim();
            const dialogue = line.substring(colonIndex + 1).trim();
            return { speaker, line: dialogue };
          }
          return line;
        });
      }
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
