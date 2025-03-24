class CharacterDictionary {
    constructor() {
        this.dictionary = {};
    }

    addCharacter(name, aliases = []) {
        if (!this.dictionary[name]) {
            this.dictionary[name] = new Set();
        }
        aliases.forEach(alias => this.dictionary[name].add(alias));
    }

    getAliases(name) {
        return this.dictionary[name] ? Array.from(this.dictionary[name]) : [];
    }

    findCharacterByAlias(alias) {
        for (const [name, aliases] of Object.entries(this.dictionary)) {
            if (aliases.has(alias)) {
                return name;
            }
        }
        return null;
    }
}

export default CharacterDictionary;
