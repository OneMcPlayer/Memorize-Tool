import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScriptTestingView from './ScriptTestingView';
import { AppProvider } from '../../context/AppContext';
import { translations } from '../../data/translations';

// Mock the AppContext values
jest.mock('../../context/AppContext', () => {
  const originalModule = jest.requireActual('../../context/AppContext');
  
  return {
    ...originalModule,
    useAppContext: jest.fn(() => ({
      currentLang: 'en',
      extractedLines: [
        { index: 5, line: 'To be or not to be', speaker: 'HAMLET' },
        { index: 10, line: 'That is the question', speaker: 'HAMLET' }
      ],
      scriptLines: [
        'OPHELIA: Hello Hamlet',
        'HAMLET: Hello Ophelia',
        'OPHELIA: How are you today?',
        'HAMLET: Not well',
        'OPHELIA: I am sorry to hear that',
        'HAMLET: To be or not to be',
        'OPHELIA: What do you mean?',
        'GERTRUDE: Hamlet, your father is looking for you',
        'HAMLET: I will see him soon',
        'OPHELIA: Please do not delay',
        'HAMLET: That is the question'
      ],
      currentLineIndex: 0,
      setCurrentLineIndex: jest.fn(),
      getCurrentLineData: jest.fn(() => ({
        current: { index: 5, line: 'To be or not to be', speaker: 'HAMLET' },
        context: [
          { speaker: 'OPHELIA', line: 'I am sorry to hear that' }
        ],
        isLastLine: false
      }))
    }))
  };
});

// Mock the translations
jest.mock('../../data/translations', () => ({
  translations: {
    en: {
      testingMode: 'Script Testing Mode',
      yourTurnPrompt: "It's your turn, {character}!",
      saidMyLineButton: 'I Said My Line',
      needHelpButton: 'Need Help?',
      hideLineButton: 'Hide Line',
      backButton: 'Back'
    }
  }
}));

describe('ScriptTestingView Component', () => {
  const mockOnBack = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders the component with initial state', () => {
    render(
      <AppProvider>
        <ScriptTestingView onBack={mockOnBack} />
      </AppProvider>
    );
    
    // Check if the title is rendered
    expect(screen.getByText('Script Testing Mode')).toBeInTheDocument();
    
    // Check if the context is rendered
    expect(screen.getByText('OPHELIA:')).toBeInTheDocument();
    expect(screen.getByText('I am sorry to hear that')).toBeInTheDocument();
    
    // Check if the user prompt is rendered
    expect(screen.getByText("It's your turn, HAMLET!")).toBeInTheDocument();
    
    // Check if the buttons are rendered
    expect(screen.getByText('I Said My Line')).toBeInTheDocument();
    expect(screen.getByText('Need Help?')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
  });
  
  test('shows the user line when "Need Help" is clicked', () => {
    render(
      <AppProvider>
        <ScriptTestingView onBack={mockOnBack} />
      </AppProvider>
    );
    
    // Initially, the user's line should not be visible
    expect(screen.queryByText('To be or not to be')).not.toBeInTheDocument();
    
    // Click the "Need Help" button
    fireEvent.click(screen.getByText('Need Help?'));
    
    // Now the user's line should be visible
    expect(screen.getByText('HAMLET:')).toBeInTheDocument();
    expect(screen.getByText('To be or not to be')).toBeInTheDocument();
    
    // The "Hide Line" button should be visible
    expect(screen.getByText('Hide Line')).toBeInTheDocument();
  });
  
  test('hides the user line when "Hide Line" is clicked', async () => {
    render(
      <AppProvider>
        <ScriptTestingView onBack={mockOnBack} />
      </AppProvider>
    );
    
    // Click the "Need Help" button to show the line
    fireEvent.click(screen.getByText('Need Help?'));
    
    // Verify the line is shown
    expect(screen.getByText('To be or not to be')).toBeInTheDocument();
    
    // Click the "Hide Line" button
    fireEvent.click(screen.getByText('Hide Line'));
    
    // The line should be hidden again
    await waitFor(() => {
      expect(screen.queryByText('To be or not to be')).not.toBeInTheDocument();
    });
    
    // The user prompt should be visible again
    expect(screen.getByText("It's your turn, HAMLET!")).toBeInTheDocument();
  });
  
  test('calls onBack when the back button is clicked', () => {
    render(
      <AppProvider>
        <ScriptTestingView onBack={mockOnBack} />
      </AppProvider>
    );
    
    // Click the back button
    fireEvent.click(screen.getByText('Back'));
    
    // Check if onBack was called
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });
  
  test('shows the user line briefly when "I Said My Line" is clicked', async () => {
    jest.useFakeTimers();
    
    render(
      <AppProvider>
        <ScriptTestingView onBack={mockOnBack} />
      </AppProvider>
    );
    
    // Click the "I Said My Line" button
    fireEvent.click(screen.getByText('I Said My Line'));
    
    // The user's line should be visible
    expect(screen.getByText('HAMLET:')).toBeInTheDocument();
    expect(screen.getByText('To be or not to be')).toBeInTheDocument();
    
    // Advance timers to simulate the delay
    jest.advanceTimersByTime(2000);
    
    // The line should be hidden again
    await waitFor(() => {
      expect(screen.queryByText('To be or not to be')).not.toBeInTheDocument();
    });
    
    jest.useRealTimers();
  });
});
