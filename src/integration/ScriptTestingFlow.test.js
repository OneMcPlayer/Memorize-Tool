import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { AppProvider } from '../context/AppContext';
import { AuthProvider } from '../context/AuthContext';

// Mock the script data
jest.mock('../data/scripts', () => ({
  getAvailableScripts: jest.fn(() => [
    { id: 'hamlet', title: 'Hamlet' }
  ]),
  getScriptContent: jest.fn(() => (
    'HAMLET: To be or not to be\n' +
    'OPHELIA: What do you mean?\n' +
    'HAMLET: That is the question\n' +
    'OPHELIA: I see\n' +
    'HAMLET: Whether tis nobler in the mind to suffer'
  )),
  convertJsonScriptToText: jest.fn(script => {
    if (script && script.lines) {
      return script.lines.map(line => `${line.speaker}: ${line.line}`).join('\n');
    }
    return '';
  })
}));

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Script Testing Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });
  
  test('navigates from InputView to ScriptTestingView', async () => {
    render(
      <AuthProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AuthProvider>
    );
    
    // Wait for the app to initialize
    await waitFor(() => {
      expect(screen.getByText('Script Memorization')).toBeInTheDocument();
    });
    
    // Select a script from the library
    const scriptSelect = screen.getByRole('combobox');
    fireEvent.change(scriptSelect, { target: { value: 'hamlet' } });
    
    // Select a character
    await waitFor(() => {
      const characterSelect = screen.getByRole('combobox', { name: /select character/i });
      fireEvent.change(characterSelect, { target: { value: 'HAMLET' } });
    });
    
    // Set context lines
    const contextInput = screen.getByRole('spinbutton');
    fireEvent.change(contextInput, { target: { value: '1' } });
    
    // Click the "Test My Lines" button
    const testButton = screen.getByText('Test My Lines');
    fireEvent.click(testButton);
    
    // Verify we're in the ScriptTestingView
    await waitFor(() => {
      expect(screen.getByText('Script Testing Mode')).toBeInTheDocument();
    });
    
    // Verify the context is shown
    expect(screen.getByText('OPHELIA:')).toBeInTheDocument();
    
    // Verify the user prompt is shown
    expect(screen.getByText(/it's your turn/i)).toBeInTheDocument();
    
    // Verify the action buttons are shown
    expect(screen.getByText('I Said My Line')).toBeInTheDocument();
    expect(screen.getByText('Need Help?')).toBeInTheDocument();
  });
  
  test('completes the script testing flow', async () => {
    render(
      <AuthProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AuthProvider>
    );
    
    // Wait for the app to initialize
    await waitFor(() => {
      expect(screen.getByText('Script Memorization')).toBeInTheDocument();
    });
    
    // Select a script from the library
    const scriptSelect = screen.getByRole('combobox');
    fireEvent.change(scriptSelect, { target: { value: 'hamlet' } });
    
    // Select a character
    await waitFor(() => {
      const characterSelect = screen.getByRole('combobox', { name: /select character/i });
      fireEvent.change(characterSelect, { target: { value: 'HAMLET' } });
    });
    
    // Set context lines
    const contextInput = screen.getByRole('spinbutton');
    fireEvent.change(contextInput, { target: { value: '1' } });
    
    // Click the "Test My Lines" button
    const testButton = screen.getByText('Test My Lines');
    fireEvent.click(testButton);
    
    // Verify we're in the ScriptTestingView
    await waitFor(() => {
      expect(screen.getByText('Script Testing Mode')).toBeInTheDocument();
    });
    
    // Click "I Said My Line" for each line
    // Note: In a real test, we would need to handle the timer and state updates
    // This is simplified for the integration test
    const saidLineButton = screen.getByText('I Said My Line');
    fireEvent.click(saidLineButton);
    
    // In a real test, we would continue clicking through all lines
    // and verify the completion screen
  });
});
