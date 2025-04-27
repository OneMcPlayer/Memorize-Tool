import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ApiKeyInput from '../ApiKeyInput';
import openaiService from '../../../services/openaiService';

// Mock the openaiService
jest.mock('../../../services/openaiService', () => ({
  getApiKey: jest.fn(),
  setApiKey: jest.fn(),
  hasApiKey: jest.fn()
}));

describe('ApiKeyInput Component', () => {
  const mockTranslations = {
    en: {
      apiKeyTitle: 'OpenAI API Key',
      apiKeySave: 'Save',
      apiKeySaved: 'Saved',
      apiKeyClear: 'Clear'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    render(<ApiKeyInput translations={mockTranslations} currentLang="en" />);
    
    expect(screen.getByText('OpenAI API Key')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your OpenAI API key')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('loads saved API key on mount', () => {
    openaiService.getApiKey.mockReturnValueOnce('saved-api-key');
    
    const mockOnKeySet = jest.fn();
    render(
      <ApiKeyInput 
        onKeySet={mockOnKeySet} 
        translations={mockTranslations} 
        currentLang="en" 
      />
    );
    
    expect(openaiService.getApiKey).toHaveBeenCalled();
    expect(screen.getByDisplayValue('saved-api-key')).toBeInTheDocument();
    expect(mockOnKeySet).toHaveBeenCalledWith(true);
  });

  it('toggles password visibility', () => {
    render(<ApiKeyInput translations={mockTranslations} currentLang="en" />);
    
    const inputElement = screen.getByPlaceholderText('Enter your OpenAI API key');
    const toggleButton = screen.getByRole('button', { name: /show api key/i });
    
    // Initially password is hidden
    expect(inputElement).toHaveAttribute('type', 'password');
    
    // Click to show password
    fireEvent.click(toggleButton);
    expect(inputElement).toHaveAttribute('type', 'text');
    
    // Click again to hide password
    fireEvent.click(toggleButton);
    expect(inputElement).toHaveAttribute('type', 'password');
  });

  it('handles API key input changes', () => {
    render(<ApiKeyInput translations={mockTranslations} currentLang="en" />);
    
    const inputElement = screen.getByPlaceholderText('Enter your OpenAI API key');
    
    fireEvent.change(inputElement, { target: { value: 'new-api-key' } });
    
    expect(inputElement).toHaveValue('new-api-key');
  });

  it('saves API key when save button is clicked', () => {
    const mockOnKeySet = jest.fn();
    render(
      <ApiKeyInput 
        onKeySet={mockOnKeySet} 
        translations={mockTranslations} 
        currentLang="en" 
      />
    );
    
    const inputElement = screen.getByPlaceholderText('Enter your OpenAI API key');
    const saveButton = screen.getByRole('button', { name: /save/i });
    
    // Enter API key
    fireEvent.change(inputElement, { target: { value: 'new-api-key' } });
    
    // Click save button
    fireEvent.click(saveButton);
    
    expect(openaiService.setApiKey).toHaveBeenCalledWith('new-api-key');
    expect(mockOnKeySet).toHaveBeenCalledWith(true);
  });

  it('clears API key when clear button is clicked', () => {
    openaiService.getApiKey.mockReturnValueOnce('saved-api-key');
    
    const mockOnKeySet = jest.fn();
    render(
      <ApiKeyInput 
        onKeySet={mockOnKeySet} 
        translations={mockTranslations} 
        currentLang="en" 
      />
    );
    
    const clearButton = screen.getByRole('button', { name: /clear/i });
    
    // Click clear button
    fireEvent.click(clearButton);
    
    expect(openaiService.setApiKey).toHaveBeenCalledWith('');
    expect(mockOnKeySet).toHaveBeenCalledWith(false);
  });

  it('disables save button when API key is empty', () => {
    render(<ApiKeyInput translations={mockTranslations} currentLang="en" />);
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    
    expect(saveButton).toBeDisabled();
  });

  it('disables save button after API key is saved', () => {
    render(<ApiKeyInput translations={mockTranslations} currentLang="en" />);
    
    const inputElement = screen.getByPlaceholderText('Enter your OpenAI API key');
    const saveButton = screen.getByRole('button', { name: /save/i });
    
    // Enter API key
    fireEvent.change(inputElement, { target: { value: 'new-api-key' } });
    
    // Click save button
    fireEvent.click(saveButton);
    
    // Save button should now be disabled and show "Saved"
    expect(screen.getByRole('button', { name: /saved/i })).toBeDisabled();
  });

  it('disables clear button when API key is empty', () => {
    render(<ApiKeyInput translations={mockTranslations} currentLang="en" />);
    
    const clearButton = screen.getByRole('button', { name: /clear/i });
    
    expect(clearButton).toBeDisabled();
  });
});
