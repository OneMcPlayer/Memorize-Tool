class ScriptLibrary {
  #scripts = new Map();
  #initialized = false;

  async initialize() {
    if (this.#initialized) return;

    const catalog = await CatalogManager.loadCatalog();
    
    if (catalog) {
      await this.#loadFromCatalog(catalog);
    } else {
      await this.#scanDirectory();
    }

    this.#initialized = true;
  }

  async #loadFromCatalog(catalog) {
    const loadPromises = Object.entries(catalog)
      .filter(([_, info]) => CatalogManager.validateCatalogEntry(info))
      .map(async ([id, info]) => {
        try {
          const content = await this.#loadScriptFile(info.path);
          return [id, { ...info, content }];
        } catch (error) {
          console.error(`Failed to load script ${id}:`, error);
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
  }

  async #scanDirectory() {
    try {
      const files = await this.#getScriptFiles();
      
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
    const response = await fetch('js/data/scripts/');
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    return Array.from(doc.querySelectorAll('a'))
      .filter(a => a.href.endsWith('.script'))
      .map(a => ({
        id: a.href.split('/').pop().replace('.script', ''),
        path: `js/data/scripts/${a.href.split('/').pop()}`
      }));
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
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text();
  }

  async loadScript(scriptId) {
    const script = this.#scripts.get(scriptId);
    if (!script) {
      throw new Error('Script not found');
    }
    
    return script.format === "structured" 
      ? Script.fromStructuredText(script.content)
      : script;
  }

  getAvailableScripts() {
    return Array.from(this.#scripts.entries()).map(([id, info]) => ({
      id,
      title: info.title,
      format: info.format
    }));
  }
}
