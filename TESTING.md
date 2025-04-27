# Testing Guide for Memorize Tool

This document provides instructions for running automated tests for the Memorize Tool application, with a focus on the Interactive Memorization Practice feature.

## Types of Tests

The application includes two types of tests:

1. **Unit Tests** - Using Jest to test individual components and services
2. **End-to-End Tests** - Using Cypress to test the application as a whole

## Prerequisites

Before running the tests, make sure you have:

1. Node.js and npm installed
2. All dependencies installed (`npm install`)
3. The application running locally for E2E tests

## Running Unit Tests

Unit tests are implemented using Jest and React Testing Library. They test individual components and services in isolation.

```bash
# Run all unit tests
npm test

# Run tests for a specific file
npm test -- src/services/__tests__/openaiService.test.js

# Run tests with coverage report
npm test -- --coverage
```

## Running End-to-End Tests

End-to-end tests are implemented using Cypress. They test the application as a whole, simulating user interactions.

### Preparation

Before running the E2E tests, you need to:

1. Start the application locally:
   ```bash
   npm run dev
   ```

2. Download the test audio file (this is done automatically when running the tests):
   ```bash
   npm run prepare:test
   ```

### Running Cypress Tests

```bash
# Open Cypress Test Runner (interactive mode)
npm run cypress:open

# Run all Cypress tests headlessly
npm run test:e2e

# Run only the Interactive Memorization tests
npm run test:interactive
```

## Test Coverage

The tests cover the following aspects of the Interactive Memorization Practice feature:

### Unit Tests

1. **OpenAI Service**
   - API key management
   - TTS model management
   - Text-to-speech functionality
   - Audio playback

2. **API Key Input Component**
   - Rendering with default props
   - Loading saved API key
   - Toggling password visibility
   - Handling input changes
   - Saving and clearing API key
   - Button state management

### End-to-End Tests

1. **Navigation**
   - Navigating to the Interactive Memorization Practice page
   - Starting the practice

2. **API Key Management**
   - Displaying and saving API key
   - Toggling visibility
   - Clearing API key

3. **Voice Settings**
   - Changing voice quality
   - Changing speed
   - Changing character voices

4. **Practice Flow**
   - Playing other character lines
   - Handling user input
   - Showing line help
   - Comparing user input with expected lines
   - Completing the practice and showing results

## Mocking

The tests use mocking to avoid making actual API calls:

1. **OpenAI API** - API calls are intercepted and mocked responses are returned
2. **Speech Recognition** - Since we can't test actual speech input, we mock the speech recognition functionality
3. **Audio Playback** - Audio playback is mocked to avoid actual audio playing during tests

## Troubleshooting

If you encounter issues with the tests:

1. **Cypress Tests Failing**
   - Make sure the application is running locally
   - Check that the test audio file was downloaded correctly
   - Try running with `DEBUG=cypress:*` for more detailed logs

2. **Jest Tests Failing**
   - Check that all dependencies are installed
   - Make sure the component being tested is correctly imported
   - Check for any console errors during test execution

## Adding New Tests

When adding new features, consider adding both unit tests and end-to-end tests:

1. **Unit Tests**
   - Create test files in `__tests__` directories next to the files being tested
   - Use Jest and React Testing Library for testing React components
   - Mock external dependencies

2. **End-to-End Tests**
   - Create new Cypress test files in `cypress/e2e/`
   - Use Cypress commands to interact with the application
   - Mock API calls using Cypress intercept
