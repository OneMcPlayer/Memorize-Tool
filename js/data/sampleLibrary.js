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
  "inventore-cavallo": {
    title: "L'INVENTORE DEL CAVALLO",
    format: "structured",
    content: {
      format: "structured",
      text: `@title "L'INVENTORE DEL CAVALLO"
@author "Your Name"
@date "Data di composizione sconosciuta"
@description "Atto unico ambientato nell'Accademia di Immortali, dove l'Inventore del cavallo presenta la sua creazione (che però… esiste già!). Testo satirico e teatrale."

@roles
  - [L'INVENTORE del cavallo]: "Studioso che sostiene di aver creato un 'nuovo' animale."
  - [Il POETA maledetto]: "Poeta infelice che non sa fare rime (né versi sciolti)."
  - [Il PRESIDENTE]: "Presidente dell'Accademia, incline a scampanellare e interrompere gli altri."
  - [Lo SCIENZIATO]: "Sordo, tende a fraintendere annunci di morte o guarigione."
  - [Il SEGRETARIO perpetuo]: "Figura burocratica, cura i verbali dell'Accademia."
  - [L'USCIERE]: "Inserviente che compare a consegnare telegrammi e sorreggere il Segretario."
  - [L'ENCICLOPEDICA]: "Accademica che conosce tutte le date… ma non i fatti."
  - [FOTOGRAFO]: "Appare durante la cerimonia, con la sua macchina fotografica e assistente."
  - [Il CLINICO]: "Medico che chiama 'benattìe' le malattie, perché dopo si può guarire (o morire)."
  - [MINISTRO della P. I.]: "Ministro della Pubblica Istruzione, presente per onorare l'invenzione."
@endroles

@text
PRESIDENTE: (scampanella) Segretario, date lettura dell'ordine del giorno.`
    }
  }
};

class ScriptLibrary {
  static initialized = false;

  static async initialize() {
    if (this.initialized) return;
    this.initialized = true;
    // No need to fetch anything now, data is embedded
  }

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
