const scriptCatalog = {
  "hamlet": {
    title: "Hamlet",
    format: "plain",
    content: `HAMLET: To be, or not to be, that is the question:
Whether 'tis nobler in the mind to suffer
The slings and arrows of outrageous fortune,
Or to take Arms against a Sea of troubles,
And by opposing end them.`
  },
  "macbeth": {
    title: "Macbeth",
    format: "plain",
    content: `MACBETH: Tomorrow, and tomorrow, and tomorrow,
Creeps in this petty pace from day to day,
To the last syllable of recorded time;
And all our yesterdays have lighted fools
The way to dusty death.`
  },
  "inventore-cavallo": {
    title: "L'INVENTORE DEL CAVALLO",
    format: "structured",
    content: `@title "L'INVENTORE DEL CAVALLO"
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
};

class ScriptLibrary {
  static initialized = false;
  static scripts = new Map();

  static async initialize() {
    if (this.initialized) return;
    
    // Simply transfer catalog items to Map
    Object.entries(scriptCatalog).forEach(([id, info]) => {
      this.scripts.set(id, info);
    });

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
