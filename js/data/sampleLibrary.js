const scriptCatalog = {
  "hamlet": {
    title: "Hamlet",
    format: "plain",
    path: "js/data/scripts/hamlet.script"
  },
  "macbeth": {
    title: "Macbeth",
    format: "plain",
    path: "js/data/scripts/macbeth.script"
  },
  "inventore-cavallo": {
    title: "L'INVENTORE DEL CAVALLO",
    format: "structured",
    path: "js/data/scripts/inventore-cavallo.script"
  }
};

class ScriptLibrary {
  static initialized = false;
  static scripts = new Map();

  static async initialize() {
    if (this.initialized) return;
    
    try {
      // First load the script catalog
      const response = await fetch('js/data/scripts/catalog.json');
      if (!response.ok) {
        // If catalog doesn't exist, scan the scripts directory
        await this.scanScriptsDirectory();
      } else {
        const catalog = await response.json();
        // Load scripts from catalog
        for (const [id, info] of Object.entries(catalog)) {
          try {
            const content = await this.loadScriptFile(info.path);
            this.scripts.set(id, {
              ...info,
              content
            });
          } catch (error) {
            console.error(`Failed to load script ${id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize script library:', error);
      // Fallback to scanning directory if catalog fails
      await this.scanScriptsDirectory();
    }

    this.initialized = true;
  }

  static async scanScriptsDirectory() {
    try {
      // Fetch list of scripts from the directory
      const response = await fetch('js/data/scripts/');
      const files = await response.text();
      
      // Parse HTML response to get script files
      const parser = new DOMParser();
      const doc = parser.parseFromString(files, 'text/html');
      const scriptFiles = Array.from(doc.querySelectorAll('a'))
        .filter(a => a.href.endsWith('.script'))
        .map(a => a.href);

      // Load each script file
      for (const url of scriptFiles) {
        try {
          const filename = url.split('/').pop();
          const id = filename.replace('.script', '');
          const content = await this.loadScriptFile(`js/data/scripts/${filename}`);
          
          // Try to parse metadata from content
          const title = this.extractTitleFromContent(content) || id;
          const format = content.includes('@title') ? 'structured' : 'plain';
          
          this.scripts.set(id, {
            title,
            format,
            path: `js/data/scripts/${filename}`,
            content
          });
        } catch (error) {
          console.error(`Failed to load script ${url}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to scan scripts directory:', error);
    }
  }

  static extractTitleFromContent(content) {
    const titleMatch = content.match(/@title\s+"([^"]+)"/);
    return titleMatch ? titleMatch[1] : null;
  }

  static async loadScriptFile(path) {
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.text();
    } catch (error) {
      throw new Error(`Failed to load script file ${path}: ${error.message}`);
    }
  }

  static async loadScript(scriptId) {
    const script = this.scripts.get(scriptId);
    if (!script) throw new Error('Script not found');
    
    if (script.format === "structured") {
      return Script.fromStructuredText(script.content);
    }
    
    return script;
  }

  static getAvailableScripts() {
    return Object.entries(scriptCatalog).map(([id, info]) => ({
      id,
      title: info.title,
      format: info.format
    }));
  }
}

window.ScriptLibrary = ScriptLibrary;
