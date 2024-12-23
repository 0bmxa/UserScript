/**
 * @typedef {(event: Event) => (Object|undefined)} Action
 *
 * @typedef {Object} MenuEntry
 * @property {string}  title            - The title of the menu entry.
 * @property {Action}  action           - The function to execute when the menu entry is clicked. Can optionally return an updated config object.
 * @property {string}  [tooltip]        - The tooltip for the menu entry (optional).
 * @property {boolean} [closeMenu=true] - Whether the menu should automatically close after an action is triggered (optional, default: true).
 */

/**
 * Dynamically creating and managing user script menu commands.
 *
 * @example
 * Menu.create([
 *   { title: 'My Title 1', action: (event) => myAction1(event) },
 *   { title: 'My Title 2', action: (event) => myAction2(event) },
 * ]);
 */
class Menu {
    static indices = [];
    
    /**
     * Creates menu entries based on the provided configurations.
     * @param {MenuEntry[]} entries - An array of menu entries.
     */
    static create(entries) {
        const startIndex = this.indices.toSorted().at(-1) ?? 0;
        return entries.map((entry, offset) => Menu.#createEntry(entry, startIndex + offset));
    }

    /**
     * Removes the menu entries at the specified indices.
     * @param {number[]} [indices] - The indicies of the entries to remove (optional, default: all).
     */
    static remove(indices = this.indices) {
        indices.forEach(index => {
            this.indices.contains(index) && this.#unregisterEntry(index);
        });
    }

    /**
     * Creates an individual menu entry and registers its click handler.
     * @private
     * @param {MenuEntry} entry - A menu entry configuration object.
     * @param {number}    index - The entry's index.
     */
    static #createEntry(entry, index) {
        const config = Object.assign({}, entry); // copy
        config.closeMenu ??= true;

        const handler = (event) => {
            // Run the action.
            const updatedConfig = config.action(event);

            // Update config, if the action returned an updated config.
            if (typeof updatedConfig === 'object') {
                Object.assign(config, updatedConfig);
                Menu.#registerEntry(index, config, handler);
            }
        }

        return Menu.#registerEntry(index, config, handler);
    }


    /**
     * Registers a menu entry with a unique index and click handler.
     * @private
     * @param {number}    index   - The index of the menu entry.
     * @param {MenuEntry} entry   - The menu entry configuration.
     * @param {Function}  handler - The function to handle menu entry clicks.
     */
    static #registerEntry(index, entry, handler) {
        const options = { id: index, title: entry.tooltip, autoClose: entry.closeMenu };
        GM_registerMenuCommand(entry.title, handler, options);
        this.indices.push(index);
        return index;
    }

    /**
     * Removes the menu entry at the specified index.
     * @private
     * @param {number} index - The index of the menu entry to remove.
     */
    static #unregisterEntry(index) {
        GM_unregisterMenuCommand(index);

        const i = this.indices.indexOf(index);
        this.indices.splice(i, 1);
    }
}


// Export
window.MonkeyExtensions = {
    Menu
};
