class CatalogManager {
  static async loadCatalog() {
    try {
      const response = await fetch('js/data/scripts/catalog.json');
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to load catalog:', error);
      return null;
    }
  }

  static validateCatalogEntry(entry) {
    return entry && 
           typeof entry.title === 'string' && 
           typeof entry.format === 'string' && 
           typeof entry.path === 'string';
  }
}
