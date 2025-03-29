// This file contains setup needed for all tests

// Mock browser globals
global.document = {
  getElementById: jest.fn(),
  createElement: jest.fn(() => ({
    innerHTML: '',
    appendChild: jest.fn(),
    className: '',
    classList: {
      add: jest.fn(),
      remove: jest.fn()
    },
    addEventListener: jest.fn(),
    style: {},
    dataset: {} // Add dataset property to created elements
  })),
  querySelectorAll: jest.fn(() => []),
  querySelector: jest.fn(),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }
};

global.navigator = {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined)
  }
};

global.window = {
  innerWidth: 1200, // Default to desktop width
  URL: {
    createObjectURL: jest.fn(),
    revokeObjectURL: jest.fn()
  }
};

// Mock global timers
global.setTimeout = jest.fn((cb) => {
  return Math.floor(Math.random() * 10000); // Return a "fake" timeout ID
});
global.clearTimeout = jest.fn();

// Mock console to suppress warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn()
};

// Clear all mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
