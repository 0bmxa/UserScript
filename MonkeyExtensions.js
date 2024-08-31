/**
 * @typedef {Object} Config
 * @property {string} title - The title of the menu entry.
 * @property {function(Event): (Object|undefined)} action - The function to execute when the menu entry is clicked. Can optionally return an updated config object.
 * @property {string} [tooltip] - The tooltip for the menu entry (optional).
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
    /**
     * Creates menu entries based on the provided configurations.
     * @param {Config[]} configs - Array of menu configuration objects.
     */
    static create(configs) {
        configs.forEach(Menu.#createEntry);
    }

    /**
     * Creates an individual menu entry and registers its click handler.
     * @private
     * @param {Config} _config - The menu configuration object.
     * @param {number} index - The index of the menu entry.
     */
    static #createEntry(_config, index) {
        const config = Object.assign({}, _config); // copy
        config.closeMenu ??= true;

        const clickHandler = (event) => {
            const updatedConfig = config.action(event);
            if (typeof updatedConfig === 'object') {
                Object.assign(config, updatedConfig);
                Menu.#registerEntry(index, config, clickHandler);
            }
        }

        Menu.#registerEntry(index, config, clickHandler);
    }

    /**
     * Registers a menu entry with a unique index and click handler.
     * @private
     * @param {number} index - The index of the menu entry.
     * @param {Config} config - The menu configuration object.
     * @param {Function} clickHandler - The function to handle menu entry clicks.
     */
    static #registerEntry(index, config, clickHandler) {
        const options = { id: index, title: config.tooltip, autoClose: config.closeMenu };
        GM_registerMenuCommand(config.title, clickHandler, options);
    }
}


const MonkeyExtensions = {
    Menu,
};


// Export (copied from SunCalc)
if (is(module) && is.object(exports)) {          // ??
    module.exports = MonkeyExtensions;
} else if (is.function(define) && define.amd) {  // ??
    define(MonkeyExtensions);
} else {
    window.MonkeyExtensions = MonkeyExtensions;
}
