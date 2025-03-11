class Script {
  constructor() {
    this.metadata = {};
    this.roles = [];
    this.scenes = [];
  }

  static fromStructuredText(content) {
    const script = new Script();
    const lines = content.split('\n');
    let currentSection = null;
    let currentScene = null;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('@')) {
        const [tag, ...value] = trimmed.substring(1).split(' ');
        
        switch (tag) {
          case 'title':
          case 'author':
          case 'date':
            script.metadata[tag] = value.join(' ');
            break;
          case 'roles':
            currentSection = 'roles';
            break;
          case 'scene':
            currentScene = { context: '', description: '', dialogue: [] };
            script.scenes.push(currentScene);
            currentSection = 'scene';
            break;
          case 'action':
            if (currentScene) {
              currentScene.dialogue.push({ type: 'action', text: value.join(' ') });
            }
            break;
        }
      } else if (trimmed && currentSection) {
        switch (currentSection) {
          case 'roles':
            if (trimmed.includes(':')) {
              const [name, desc] = trimmed.split(':').map(s => s.trim());
              script.roles.push({ name, description: desc });
            }
            break;
          case 'scene':
            if (trimmed.includes('":')) {
              const [character, ...text] = trimmed.split('":');
              currentScene.dialogue.push({
                type: 'dialogue',
                character: character.trim(),
                text: text.join('":').trim().replace(/^"""|"""$/g, '')
              });
            }
            break;
        }
      }
    });

    return script;
  }
}

window.Script = Script;
