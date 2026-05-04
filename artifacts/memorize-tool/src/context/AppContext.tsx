import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface ScriptLine {
  index: number;
  line: string;
  speaker: string;
}

interface ContextLine {
  speaker?: string;
  line?: string;
  [key: string]: unknown;
}

interface LineData {
  current: ScriptLine;
  context: ContextLine[];
  isLastLine: boolean;
}

interface AppContextValue {
  currentLang: string;
  isAdvancedMode: boolean;
  isDarkMode: boolean;
  isCustomScriptInputEnabled: boolean;
  isLoginEnabled: boolean;
  isZenModeEnabled: boolean;
  isCopyButtonEnabled: boolean;
  setLanguage: (lang: string) => void;
  toggleDarkMode: () => boolean;
  setAdvancedMode: (enabled: boolean) => void;
  setCustomScriptInputEnabled: (enabled: boolean) => void;
  setLoginEnabled: (enabled: boolean) => void;
  setZenModeEnabled: (enabled: boolean) => void;
  setCopyButtonEnabled: (enabled: boolean) => void;
  voiceAssignments: Record<string, string>;
  setVoiceAssignment: (character: string, voiceId: string | null) => void;
  clearVoiceAssignments: () => void;
  scriptLines: string[];
  extractedLines: ScriptLine[];
  currentLineIndex: number;
  precedingCount: number;
  setScriptLines: (lines: string[]) => void;
  setExtractedLines: (lines: ScriptLine[]) => void;
  setPrecedingCount: (count: number) => void;
  resetScriptState: () => void;
  nextLine: () => void;
  getCurrentLineData: () => LineData | null;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentLang, setCurrentLang] = useState('en');
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [isCustomScriptInputEnabled, setIsCustomScriptInputEnabled] = useState(false);
  const [isLoginEnabled, setIsLoginEnabled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isZenModeEnabled, setIsZenModeEnabled] = useState(false);
  const [isCopyButtonEnabled, setIsCopyButtonEnabled] = useState(false);
  const [voiceAssignments, setVoiceAssignments] = useState<Record<string, string>>({});

  const [scriptLines, setScriptLines] = useState<string[]>([]);
  const [extractedLines, setExtractedLines] = useState<ScriptLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [precedingCount, setPrecedingCount] = useState(0);

  useEffect(() => {
    const storedLang = localStorage.getItem('lang') || 'en';
    setCurrentLang(storedLang);

    const storedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(storedDarkMode);
    if (storedDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    const storedAdvancedMode = localStorage.getItem('advancedMode') === 'true';
    setIsAdvancedMode(storedAdvancedMode);

    const storedCustomScriptInput = localStorage.getItem('customScriptInputEnabled') === 'true';
    setIsCustomScriptInputEnabled(storedCustomScriptInput);

    const storedLoginEnabled = localStorage.getItem('loginEnabled') === 'true';
    setIsLoginEnabled(storedLoginEnabled);

    const storedZenMode = localStorage.getItem('zenModeEnabled') === 'true';
    setIsZenModeEnabled(storedZenMode);

    const storedCopyButton = localStorage.getItem('copyButtonEnabled') === 'true';
    setIsCopyButtonEnabled(storedCopyButton);

    // Legacy: clear out the deprecated Studio Mode flag if it lingers from
    // a previous version. The feature has been removed in favor of per-line
    // cue tags.
    try {
      localStorage.removeItem('studioModeEnabled');
    } catch {
      /* ignore */
    }

    try {
      const raw = localStorage.getItem('voiceAssignments');
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const sanitized: Record<string, string> = {};
          for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
            if (typeof v === 'string' && v) sanitized[k] = v;
          }
          setVoiceAssignments(sanitized);
        }
      }
    } catch {
      /* ignore corrupted voice assignments */
    }
  }, []);

  const setVoiceAssignment = useCallback((character: string, voiceId: string | null) => {
    setVoiceAssignments((prev) => {
      const next = { ...prev };
      if (voiceId) next[character] = voiceId;
      else delete next[character];
      try {
        localStorage.setItem('voiceAssignments', JSON.stringify(next));
      } catch {
        /* ignore quota errors */
      }
      return next;
    });
  }, []);

  const clearVoiceAssignments = useCallback(() => {
    setVoiceAssignments({});
    try {
      localStorage.removeItem('voiceAssignments');
    } catch {
      /* ignore */
    }
  }, []);

  const setLanguage = (lang: string) => {
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
    localStorage.setItem('darkMode', String(newDarkMode));
    return newDarkMode;
  };

  const setAdvancedMode = (enabled: boolean) => {
    setIsAdvancedMode(enabled);
    localStorage.setItem('advancedMode', String(enabled));
    if (!enabled) {
      // Hide the dependent toggles too so the basic view stays minimal.
      setIsCustomScriptInputEnabled(false);
      localStorage.setItem('customScriptInputEnabled', 'false');
      setIsLoginEnabled(false);
      localStorage.setItem('loginEnabled', 'false');
      setIsCopyButtonEnabled(false);
      localStorage.setItem('copyButtonEnabled', 'false');
    }
  };

  const setCopyButtonEnabled = (enabled: boolean) => {
    setIsCopyButtonEnabled(enabled);
    localStorage.setItem('copyButtonEnabled', String(enabled));
  };

  const setCustomScriptInputEnabled = (enabled: boolean) => {
    setIsCustomScriptInputEnabled(enabled);
    localStorage.setItem('customScriptInputEnabled', String(enabled));
  };

  const setLoginEnabled = (enabled: boolean) => {
    setIsLoginEnabled(enabled);
    localStorage.setItem('loginEnabled', String(enabled));
  };

  const setZenModeEnabled = (enabled: boolean) => {
    setIsZenModeEnabled(enabled);
    localStorage.setItem('zenModeEnabled', String(enabled));
  };

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

  const getCurrentLineData = (): LineData | null => {
    if (extractedLines.length === 0 || currentLineIndex >= extractedLines.length) {
      return null;
    }

    const currentEntry = extractedLines[currentLineIndex];
    let contextLines: ContextLine[] = [];

    if (typeof currentEntry.index === 'number') {
      let startIndex = 0;

      if (currentLineIndex > 0) {
        const previousCharacterLines = extractedLines
          .slice(0, currentLineIndex)
          .filter(line => line.speaker === currentEntry.speaker);

        if (previousCharacterLines.length > 0) {
          const previousLine = previousCharacterLines[previousCharacterLines.length - 1];
          startIndex = previousLine.index + 1;
        } else {
          startIndex = Math.max(0, currentEntry.index - precedingCount);
        }
      } else {
        startIndex = Math.max(0, currentEntry.index - precedingCount);
      }

      const rawContextLines = scriptLines.slice(startIndex, currentEntry.index);

      contextLines = rawContextLines.map(line => {
        const match = line.match(/^([A-Za-z0-9À-ÿ\s]+):\s*(.*)$/);
        if (match) {
          const speaker = match[1].trim();
          const dialogue = match[2].trim();
          return { speaker, line: dialogue };
        }
        return { line };
      });
    } else {
      const startIndex = Math.max(0, currentLineIndex - precedingCount);
      contextLines = extractedLines.slice(startIndex, currentLineIndex).map(l => ({ speaker: l.speaker, line: l.line }));
    }

    return {
      current: currentEntry,
      context: contextLines,
      isLastLine: currentLineIndex === extractedLines.length - 1
    };
  };

  const contextValue: AppContextValue = {
    currentLang,
    isAdvancedMode,
    isDarkMode,
    isCustomScriptInputEnabled,
    isLoginEnabled,
    isZenModeEnabled,
    isCopyButtonEnabled,
    setLanguage,
    toggleDarkMode,
    setAdvancedMode,
    setCustomScriptInputEnabled,
    setLoginEnabled,
    setZenModeEnabled,
    setCopyButtonEnabled,
    voiceAssignments,
    setVoiceAssignment,
    clearVoiceAssignments,
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
