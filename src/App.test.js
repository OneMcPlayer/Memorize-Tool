import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

test('renders the application title', () => {
  render(<App />);
  const titleElement = screen.getByText(/Script Memorization/i);
  expect(titleElement).toBeInTheDocument();
});

test('shows language selector inside the options menu', () => {
  render(<App />);

  fireEvent.click(screen.getByLabelText('Options menu'));

  const languageSelector = screen.getByTestId('menuLanguageSelect');
  expect(languageSelector).toBeInTheDocument();
});

test('renders theme toggle button', () => {
  render(<App />);
  const themeToggle = screen.getByLabelText('Toggle dark mode');
  expect(themeToggle).toBeInTheDocument();
});
