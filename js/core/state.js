// Application state management

// Script state
export let scriptLines = [];
export let extractedLines = [];
export let currentLineIndex = 0;
export let precedingCount = 0;

/**
 * Reset the script state
 */
export function resetScriptState() {
  scriptLines = [];
  extractedLines = [];
  currentLineIndex = 0;
  precedingCount = 0;
}

/**
 * Set the script lines
 * @param {string[]} lines - The processed script lines
 */
export function setScriptLines(lines) {
  scriptLines = lines;
}

/**
 * Set the extracted character lines
 * @param {Array} lines - The extracted character lines
 */
export function setExtractedLines(lines) {
  extractedLines = lines;
  currentLineIndex = 0;
}

/**
 * Set the context lines count
 * @param {number} count - Number of preceding lines to show as context
 */
export function setPrecedingCount(count) {
  precedingCount = count;
}

/**
 * Advance to the next line
 * @returns {boolean} - Whether there are more lines
 */
export function nextLine() {
  if (currentLineIndex < extractedLines.length - 1) {
    currentLineIndex++;
    return true;
  }
  return false;
}

/**
 * Get the current line and context
 * @returns {Object} - Current line and context information
 */
export function getCurrentLineData() {
  if (currentLineIndex >= extractedLines.length) {
    return null;
  }
  
  const currentEntry = extractedLines[currentLineIndex];
  const startIndex = Math.max(0, currentEntry.index - precedingCount);
  const contextLines = scriptLines.slice(startIndex, currentEntry.index);
  
  return {
    currentEntry,
    contextLines,
    isLastLine: currentLineIndex === extractedLines.length - 1
  };
}
