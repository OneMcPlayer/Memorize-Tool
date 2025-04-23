import React from 'react';
import { render, screen } from '@testing-library/react';
import ScriptTestingView from './ScriptTestingView';
import { AppProvider } from '../../context/AppContext';

// Mock the AppContext values for error cases
jest.mock('../../context/AppContext', () => {
  const originalModule = jest.requireActual('../../context/AppContext');
  
  return {
    ...originalModule,
    useAppContext: jest.fn(() => ({
      currentLang: 'en',
      extractedLines: [],
      scriptLines: [],
      currentLineIndex: 0,
      setCurrentLineIndex: jest.fn(),
      getCurrentLineData: jest.fn(() => null)
    }))
  };
});

describe('ScriptTestingView Error Handling', () => {
  const mockOnBack = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('handles case with no lines available', () => {
    render(
      <AppProvider>
        <ScriptTestingView onBack={mockOnBack} />
      </AppProvider>
    );
    
    // Check if the error message is displayed
    expect(screen.getByText(/no lines available for testing/i)).toBeInTheDocument();
    
    // Check if the back button is rendered
    expect(screen.getByText('Back')).toBeInTheDocument();
  });
});
