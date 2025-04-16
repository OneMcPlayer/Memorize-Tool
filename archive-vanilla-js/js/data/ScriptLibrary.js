import { CatalogManager } from './CatalogManager.js';
import { Script } from '../models/Script.js';

export class ScriptLibrary {
  #scripts = new Map();
  #scriptCache = new Map(); // Cache for loaded script content
  #initialized = false;
  #initPromise = null;

  async initialize() {
    // Prevent multiple initialization calls from running in parallel
    if (this.#initPromise) return this.#initPromise;
    if (this.#initialized) return Promise.resolve();
    
    this.#initPromise = this.#performInitialization();
    return this.#initPromise;
  }
  
  async #performInitialization() {
    try {
      const catalog = await CatalogManager.loadCatalog();
      
      if (catalog) {
        await this.#loadFromCatalog(catalog);
      } else {
        console.warn('No catalog found, attempting directory scan');
        await this.#scanDirectory();
      }
    } catch (error) {
      console.error('Failed to initialize script library:', error);
    } finally {
      this.#initialized = true;
      this.#initPromise = null;
    }
  }

  async #loadFromCatalog(catalog) {
    if (!catalog || Object.keys(catalog).length === 0) {
      console.warn('Catalog is empty');
      return;
    }

    // Create an array of promises for concurrent loading
    const loadPromises = Object.entries(catalog)
      .filter(([_, info]) => CatalogManager.validateCatalogEntry(info))
      .map(async ([id, info]) => {
        try {
          const content = await this.#loadScriptFile(info.path);
          return [id, { ...info, content }];
        } catch (error) {
          console.warn(`Script ${id} (${info.path}) not found or inaccessible:`, error);
          return null;
        }
      });

    const results = await Promise.allSettled(loadPromises);
    results
      .filter(result => result.status === 'fulfilled' && result.value)
      .forEach(result => {
        const [id, scriptData] = result.value;
        this.#scripts.set(id, scriptData);
      });
    
    console.debug(`Loaded ${this.#scripts.size} scripts from catalog`);
  }

  async #scanDirectory() {
    try {
      const files = await this.#getScriptFiles();
      console.debug(`Found ${files.length} script files in directory scan`);
      
      await Promise.all(
        files.map(async file => {
          try {
            const content = await this.#loadScriptFile(file.path);
            const scriptData = this.#parseScriptData(content, file);
            this.#scripts.set(file.id, scriptData);
          } catch (error) {
            console.error(`Failed to load script ${file.path}:`, error);
          }
        })
      );
    } catch (error) {
      console.error('Failed to scan directory:', error);
    }
  }

  async #getScriptFiles() {
    try {
      const response = await fetch('js/data/scripts/');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      return Array.from(doc.querySelectorAll('a'))
        .filter(a => a.href.endsWith('.script'))
        .map(a => ({
          id: a.href.split('/').pop().replace('.script', ''),
          path: `js/data/scripts/${a.href.split('/').pop()}`
        }));
    } catch (error) {
      console.error('Error scanning directory:', error);
      return [];
    }
  }

  #parseScriptData(content, file) {
    const title = this.#extractTitle(content) || file.id;
    const format = content.includes('@title') ? 'structured' : 'plain';
    
    return {
      title,
      format,
      path: file.path,
      content
    };
  }

  #extractTitle(content) {
    const titleMatch = content.match(/@title\s+"([^"]+)"/);
    return titleMatch?.[1] ?? null;
  }

  async #loadScriptFile(path) {
    // Check cache first
    if (this.#scriptCache.has(path)) {
      console.debug(`Using cached script: ${path}`);
      return this.#scriptCache.get(path);
    }
    
    // Fetch the script
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const content = await response.text();
      
      // Cache the content for future use
      this.#scriptCache.set(path, content);
      
      return content;
    } catch (error) {
      console.error(`Error loading script ${path}:`, error);
      throw error;
    }
  }

  async loadScript(scriptId) {
    if (!this.#initialized) {
      await this.initialize();
    }
    
    const script = this.#scripts.get(scriptId);
    if (!script) {
      throw new Error(`Script not found: ${scriptId}`);
    }
    
    console.debug("Loaded raw script:", script);
    
    try {
      const loadedScript = script.format === "structured" 
        ? Script.fromStructuredText(script.content)
        : script;
      
      console.debug("Final loaded script:", loadedScript);
      
      return loadedScript;
    } catch (error) {
      console.error(`Error parsing script ${scriptId}:`, error);
      throw new Error(`Failed to parse script: ${error.message}`);
    }
  }

  getAvailableScripts() {
    return Array.from(this.#scripts.entries()).map(([id, info]) => ({
      id,
      title: info.title,
      format: info.format
    }));
  }
  
  clearCache() {
    this.#scriptCache.clear();
    console.debug('Script cache cleared');
  }
}
