const scriptCatalog = {
  // Basic info about available scripts
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
    
    // Load all scripts in parallel
    const loadPromises = Object.entries(scriptCatalog).map(async ([id, info]) => {
      try {
        const response = await fetch(info.path);
        const content = await response.text();
        this.scripts.set(id, {
          ...info,
          content: info.format === 'structured' ? content : { text: content }
        });
      } catch (error) {
        console.error(`Failed to load script ${id}:`, error);
      }
    });

    await Promise.all(loadPromises);
    this.initialized = true;
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
