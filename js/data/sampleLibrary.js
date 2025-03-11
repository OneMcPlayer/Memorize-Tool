const sampleLibrary = {
  // Legacy plain text samples
  hamlet: {
    title: "Hamlet",
    text: `HAMLET: To be, or not to be, that is the question...`,
    format: "plain"
  },
  macbeth: {
    title: "Macbeth", 
    text: `MACBETH: Tomorrow, and tomorrow, and tomorrow...`,
    format: "plain"
  },
  // Pre-load the structured scripts content
  "inventore-cavallo": {
    title: "L'INVENTORE DEL CAVALLO",
    format: "structured",
    content: {
      format: "structured",
      text: await fetch('js/data/scripts/inventore-cavallo.script').then(r => r.text())
    }
  }
};

class ScriptLibrary {
  static async loadScript(scriptId) {
    const script = sampleLibrary[scriptId];
    if (!script) throw new Error('Script not found');
    
    if (script.format === "structured") {
      // For structured scripts, process the DSL format
      return Script.fromStructuredText(script.content.text);
    }
    
    return script;
  }

  static getAvailableScripts() {
    return Object.entries(sampleLibrary).map(([id, script]) => ({
      id,
      title: script.title,
      format: script.format
    }));
  }
}

window.sampleLibrary = sampleLibrary;
window.ScriptLibrary = ScriptLibrary;
