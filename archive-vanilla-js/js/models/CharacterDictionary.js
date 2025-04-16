class CharacterDictionary {
    constructor() {
        this.characters = new Map();
        this.aliases = new Map();
    }

    /**
     * Add a character with their aliases to the dictionary
     * @param {string} name - The primary name of the character
     * @param {string[]} aliases - Array of alternative names/aliases for the character
     */
    addCharacter(name, aliases = []) {
        // Store the character with their primary name
        this.characters.set(name.toLowerCase(), name);
        
        // Add the primary name as its own alias
        this.aliases.set(name.toLowerCase(), name);
        
        // Add all aliases
        for (const alias of aliases) {
            this.aliases.set(alias.toLowerCase(), name);
        }
    }

    /**
     * Find a character by their name or alias
     * @param {string} alias - The name or alias to search for
     * @returns {string|null} - The primary character name or null if not found
     */
    findCharacterByAlias(alias) {
        if (!alias) return null;
        
        const normalizedAlias = alias.toLowerCase();
        return this.aliases.get(normalizedAlias) || null;
    }

    /**
     * Get all character names in the dictionary
     * @returns {string[]} - Array of all primary character names
     */
    getAllCharacters() {
        return [...new Set(this.characters.values())];
    }

    /**
     * Check if a character exists in the dictionary
     * @param {string} name - The name to check
     * @returns {boolean} - True if the character exists
     */
    hasCharacter(name) {
        return this.characters.has(name.toLowerCase());
    }

    /**
     * Clear all characters from the dictionary
     */
    clear() {
        this.characters.clear();
        this.aliases.clear();
    }
}

export default CharacterDictionary;
