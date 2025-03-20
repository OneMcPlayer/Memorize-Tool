export class CatalogManager {
  static async loadCatalog() {
    try {
      // Use a consistent approach to paths
      const response = await fetch('./js/data/scripts/catalog.json');
      if (!response.ok) {
        console.error(`Failed to load catalog: ${response.status} ${response.statusText}`);
        return null;
      }
      
      const data = await response.json();
      console.debug('Catalog loaded:', data);
      return data;
    } catch (error) {
      console.error('Failed to load catalog:', error);
      return null;
    }
  }

  static validateCatalogEntry(entry) {
    if (!entry) {
      console.warn('Empty catalog entry detected');
      return false;
    }
    
    // Check required fields
    const hasRequiredFields = 
      typeof entry.title === 'string' && 
      typeof entry.format === 'string' && 
      typeof entry.path === 'string';
      
    if (!hasRequiredFields) {
      console.warn('Invalid catalog entry format:', entry);
      return false;
    }
    
    // Validate format value
    if (!['plain', 'structured'].includes(entry.format)) {
      console.warn(`Unsupported script format: ${entry.format}`);
      return false;
    }
    
    return true;
  }
  
  static sanitizePath(path) {
    // Ensure path starts with ./ for consistent relative paths
    return path.startsWith('./') ? path : `./${path}`;
  }
}
