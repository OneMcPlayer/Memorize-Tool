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
    
    // Load all scripts from catalog
    for (const [id, info] of Object.entries(scriptCatalog)) {
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

    this.initialized = true;
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
