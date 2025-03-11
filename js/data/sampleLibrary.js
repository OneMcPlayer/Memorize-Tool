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
      "id": "inventore-cavallo",
      "title": "L'INVENTORE DEL CAVALLO",
      "author": "Your Name",
      "date": "Data di composizione sconosciuta",
      "description": "Atto unico ambientato nell'Accademia di Immortali, dove l'Inventore del cavallo presenta la sua creazione (che però… esiste già!). Testo satirico e teatrale.",
      "format": "structured",
      "content": "@title \"L'INVENTORE DEL CAVALLO\"\n@author \"Your Name\"\n@date \"Data di composizione sconosciuta\"\n@description \"Atto unico ambientato nell'Accademia di Immortali, dove l'Inventore del cavallo presenta la sua creazione (che però… esiste già!). Testo satirico e teatrale.\"\n\n@roles\n  - [L'INVENTORE del cavallo]: \"Studioso che sostiene di aver creato un 'nuovo' animale.\"\n  - [Il POETA maledetto]: \"Poeta infelice che non sa fare rime (né versi sciolti).\"\n// ...rest of the script content..."
    }
  }
};

class ScriptLibrary {
  static async loadScript(scriptId) {
    const script = sampleLibrary[scriptId];
    if (!script) throw new Error('Script not found');

    if (script.format === "structured") {
      return script.content;
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
