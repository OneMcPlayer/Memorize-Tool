import { showToast, handleSwipeGesture } from '../js/utils.js';

// Mock DOM elements and functions
document.body = document.body || {};
document.body.appendChild = jest.fn();
document.body.removeChild = jest.fn();

// Tests for showToast function
describe('showToast', () => {
  // Mock toast element with dataset property
  const mockToastElement = {
    classList: { add: jest.fn() },
    style: { display: 'none' },
    textContent: '',
    className: 'toast',
    dataset: { timeoutId: undefined }
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Reset mock element state
    mockToastElement.style.display = 'none';
    mockToastElement.textContent = '';
    mockToastElement.className = 'toast';
    mockToastElement.dataset.timeoutId = undefined;
    
    // Set up document.querySelector to return our mock toast element
    document.querySelector = jest.fn().mockImplementation(selector => {
      if (selector === '.toast') {
        return mockToastElement;
      }
      return null;
    });
    
    // Mock setTimeout and clearTimeout
    jest.useFakeTimers(); // Use Jest's fake timers
    global.clearTimeout = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers(); // Restore real timers after each test
  });

  test('should set the toast message and display it', () => {
    const message = 'Test message';
    showToast(message);
    
    // Check if the message was set
    expect(mockToastElement.textContent).toBe(message);
    
    // Check if the toast was made visible
    expect(mockToastElement.style.display).toBe('block');

    // Check if setTimeout was called to hide the toast
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 2000);
  });

  test('should use custom duration if provided', () => {
    const customDuration = 5000;
    showToast('Test', customDuration);
    
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), customDuration);
  });

  test('should apply the specified type class to the toast', () => {
    showToast('Test', 2000, 'success');
    
    expect(mockToastElement.classList.add).toHaveBeenCalledWith('toast-success');
  });

  test('should do nothing if toast element is not found', () => {
    // Make document.querySelector return null for this test
    document.querySelector.mockReturnValueOnce(null);
    
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    showToast('Test');
    
    // Should log a warning
    expect(consoleSpy).toHaveBeenCalledWith('Toast element not found');
    
    // Cleanup
    consoleSpy.mockRestore();
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
