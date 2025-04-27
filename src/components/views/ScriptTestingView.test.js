import React from 'react';
import { render, screen } from '@testing-library/react';
import ScriptTestingView from './ScriptTestingView';
import * as AppContext from '../../context/AppContext';

// Create a simple test that just verifies the component renders
describe('ScriptTestingView Component', () => {
  const mockOnBack = jest.fn();

  // Mock the useAppContext hook with minimal data
  beforeEach(() => {
    jest.spyOn(AppContext, 'useAppContext').mockImplementation(() => ({
      currentLang: 'en',
      extractedLines: [],
      scriptLines: [],
      currentLineIndex: 0,
      setCurrentLineIndex: jest.fn(),
      getCurrentLineData: jest.fn(() => null)
    }));
  });

  test('renders without crashing', () => {
    render(<ScriptTestingView onBack={mockOnBack} />);

    // Check if the title is rendered
    expect(screen.getByText('Script Testing Mode')).toBeInTheDocument();

    // Check if the back button is rendered
    expect(screen.getByText('Back')).toBeInTheDocument();
  });
});
