import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the application title', () => {
  render(<App />);
  const titleElement = screen.getByText(/Script Memorization/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders language selector', () => {
  render(<App />);
  const languageSelector = screen.getByTestId('languageSelect');
  expect(languageSelector).toBeInTheDocument();
});

test('renders theme toggle button', () => {
  render(<App />);
  const themeToggle = screen.getByLabelText('Toggle dark mode');
  expect(themeToggle).toBeInTheDocument();
});
