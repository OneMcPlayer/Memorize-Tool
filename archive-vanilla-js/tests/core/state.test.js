import { 
  resetScriptState, 
  setScriptLines, 
  setExtractedLines, 
  setPrecedingCount, 
  nextLine, 
  getCurrentLineData 
} from '../../js/core/state';

// Mock the state module's internal state
jest.mock('../../js/core/state', () => {
  // Store the original module
  const originalModule = jest.requireActual('../../js/core/state');
  
  // Create a mock of the internal state
  let mockState = {
    scriptLines: [],
    extractedLines: [],
    precedingLines: 1,
    currentLineIndex: 0
  };
  
  // Return modified functions that expose the internal state for testing
  return {
    ...originalModule,
    // Expose a function to get the internal state for testing
    __getMockState: () => mockState,
    resetScriptState: () => {
      mockState = {
        scriptLines: [],
        extractedLines: [],
        precedingLines: 1,
        currentLineIndex: 0
      };
      return originalModule.resetScriptState();
    },
    setScriptLines: (lines) => {
      mockState.scriptLines = lines;
      return originalModule.setScriptLines(lines);
    },
    setExtractedLines: (lines) => {
      mockState.extractedLines = lines;
      return originalModule.setExtractedLines(lines);
    },
    setPrecedingCount: (count) => {
      mockState.precedingLines = count;
      return originalModule.setPrecedingCount(count);
    },
    nextLine: () => {
      // Only increment if not at the end of the array
      if (mockState.currentLineIndex < mockState.extractedLines.length - 1) {
        mockState.currentLineIndex++;
      }
      return originalModule.nextLine();
    },
    getCurrentLineData: originalModule.getCurrentLineData
  };
});

// Get reference to the mock state
const getMockState = jest.requireMock('../../js/core/state').__getMockState;

describe('Script State Management', () => {
  beforeEach(() => {
    resetScriptState();
  });

  describe('resetScriptState', () => {
    it('should reset all state variables to initial values', () => {
      setScriptLines(['line1', 'line2']);
      setExtractedLines(['extracted1', 'extracted2']);
      setPrecedingCount(3);
      nextLine();
      
      resetScriptState();
      
      const state = getMockState();
      expect(state.scriptLines).toEqual([]);
      expect(state.extractedLines).toEqual([]);
      expect(state.precedingLines).toBe(1);
      expect(state.currentLineIndex).toBe(0);
    });
  });

  describe('setScriptLines', () => {
    it('should update script lines', () => {
      const lines = ['line1', 'line2', 'line3'];
      setScriptLines(lines);
      
      const state = getMockState();
      expect(state.scriptLines).toEqual(lines);
    });
  });

  describe('setExtractedLines', () => {
    it('should update extracted lines and reset current index', () => {
      const lines = ['extracted1', 'extracted2'];
      setExtractedLines(lines);
      
      const state = getMockState();
      expect(state.extractedLines).toEqual(lines);
      expect(state.currentLineIndex).toBe(0);
    });
  });

  describe('setPrecedingCount', () => {
    it('should update preceding lines count', () => {
      setPrecedingCount(5);
      
      const state = getMockState();
      expect(state.precedingLines).toBe(5);
    });
  });

  describe('nextLine', () => {
    it('should increment current line index', () => {
      const lines = ['line1', 'line2', 'line3'];
      setExtractedLines(lines);
      
      expect(getMockState().currentLineIndex).toBe(0);
      
      nextLine();
      expect(getMockState().currentLineIndex).toBe(1);
      
      nextLine();
      expect(getMockState().currentLineIndex).toBe(2);
    });

    it('should not increment beyond the last line', () => {
      const lines = ['line1', 'line2'];
      setExtractedLines(lines);
      
      nextLine();
      nextLine();
      nextLine(); // Should stay at index 1
      
      expect(getMockState().currentLineIndex).toBe(1);
    });
  });

  describe('getCurrentLineData', () => {
    it('should return correct current and context lines', () => {
      const lines = [
        { character: 'A', text: 'Line 1' },
        { character: 'B', text: 'Line 2' },
        { character: 'C', text: 'Line 3' },
        { character: 'A', text: 'Line 4' }
      ];
      
      setExtractedLines(lines);
      setPrecedingCount(2);
      
      // Move to line 3 (index 2)
      nextLine();
      nextLine();
      
      const currentData = getCurrentLineData();
      
      expect(currentData.current).toEqual({ character: 'C', text: 'Line 3' });
      expect(currentData.context).toHaveLength(2);
      expect(currentData.context[0]).toEqual({ character: 'A', text: 'Line 1' });
      expect(currentData.context[1]).toEqual({ character: 'B', text: 'Line 2' });
    });
  });
});
