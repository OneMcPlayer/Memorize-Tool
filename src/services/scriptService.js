/**
 * Service for interacting with the script API endpoints
 */

// Get all scripts
export const getScripts = async () => {
  try {
    const response = await fetch('/api/scripts');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching scripts:', error);
    throw error;
  }
};

// Get a specific script by ID
export const getScriptById = async (scriptId) => {
  try {
    const response = await fetch(`/api/scripts/${scriptId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching script ${scriptId}:`, error);
    throw error;
  }
};

// Create a new script
export const createScript = async (scriptData) => {
  try {
    const response = await fetch('/api/scripts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scriptData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating script:', error);
    throw error;
  }
};

// Check server health
export const checkServerHealth = async (options = {}) => {
  try {
    const response = await fetch('/api/health', options);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error checking server health:', error);
    throw error;
  }
};
