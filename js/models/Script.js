export class Script {
  constructor() {
    this.metadata = {};
    this.roles = [];
    this.scenes = [];
    this.text = '';
  }

  static fromStructuredText(content) {
    const script = new Script();
    const lines = content.split('\n');
    let currentSection = null;
    let currentContent = [];

    const processMetadata = (line) => {
      const match = line.match(/@(\w+)\s+"([^"]+)"/);
      if (match) {
        script.metadata[match[1]] = match[2];
      }
    };

    const processRoles = (line) => {
      const roleMatch = line.match(/\s*-\s*\[(.*?)\]:\s*"([^"]+)"/);
      if (roleMatch) {
        script.roles.push({
          name: roleMatch[1],
          description: roleMatch[2]
        });
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) continue;

      if (line.startsWith('@roles')) {
        currentSection = 'roles';
        continue;
      } else if (line === '@endroles') {
        currentSection = null;
        continue;
      } else if (line.startsWith('@text')) {
        currentSection = 'text';
        continue;
      }

      switch (currentSection) {
        case 'roles':
          processRoles(line);
          break;
        case 'text':
          currentContent.push(line);
          break;
        default:
          processMetadata(line);
      }
    }

    script.text = currentContent.join('\n');
    return script;
  }
}
