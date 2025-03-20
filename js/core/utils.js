/**
 * Remove HTML tags and return plain text content
 * @param {string} line - The line that might contain HTML tags
 * @returns {string} - The plain text content
 */
export function getPlainText(line) {
  // Remove HTML tags and trim whitespace
  return line.replace(/<[^>]*>/g, '').trim();
}

/**
 * Create a valid DOM ID from a string
 * @param {string} str - The input string
 * @returns {string} - A valid DOM ID
 */
export function createValidId(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '-');
}
