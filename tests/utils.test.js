import { showToast, handleSwipeGesture } from '../js/utils.js';

// Mock DOM elements and functions
document.body = document.body || {};
document.body.appendChild = jest.fn();
document.body.removeChild = jest.fn();

// Tests for showToast function
describe('showToast', () => {
  beforeEach(() => {
    // Setup
    document.getElementById = jest.fn(() => null);
    document.createElement = jest.fn(() => ({
      classList: { add: jest.fn() },
      style: {},
      appendChild: jest.fn()
    }));
  });

  test('should create a toast element with the provided message', () => {
    const message = 'Test message';
    showToast(message);
    
    expect(document.createElement).toHaveBeenCalledWith('div');
    const createdElement = document.createElement.mock.results[0].value;
    expect(createdElement.textContent).toBe(message);
  });

  test('should use default duration if not provided', () => {
    jest.useFakeTimers();
    showToast('Test');
    
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 2000);
    
    jest.useRealTimers();
  });

  test('should apply the specified type class to the toast', () => {
    showToast('Test', 2000, 'success');
    
    const toastElement = document.createElement.mock.results[0].value;
    expect(toastElement.classList.add).toHaveBeenCalledWith('toast-success');
  });
});

// Tests for handleSwipeGesture function
describe('handleSwipeGesture', () => {
  test('should call onRight when swiping right', () => {
    const startX = 100;
    const endX = 200; // Moving right
    const callbacks = {
      onRight: jest.fn(),
      onLeft: jest.fn()
    };
    
    handleSwipeGesture(startX, endX, callbacks);
    
    expect(callbacks.onRight).toHaveBeenCalled();
    expect(callbacks.onLeft).not.toHaveBeenCalled();
  });
  
  test('should call onLeft when swiping left', () => {
    const startX = 200;
    const endX = 100; // Moving left
    const callbacks = {
      onRight: jest.fn(),
      onLeft: jest.fn()
    };
    
    handleSwipeGesture(startX, endX, callbacks);
    
    expect(callbacks.onLeft).toHaveBeenCalled();
    expect(callbacks.onRight).not.toHaveBeenCalled();
  });
  
  test('should not call any callback when swipe distance is too small', () => {
    const startX = 100;
    const endX = 110; // Small movement right
    const callbacks = {
      onRight: jest.fn(),
      onLeft: jest.fn()
    };
    
    handleSwipeGesture(startX, endX, callbacks);
    
    expect(callbacks.onRight).not.toHaveBeenCalled();
    expect(callbacks.onLeft).not.toHaveBeenCalled();
  });
});
