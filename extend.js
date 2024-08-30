const Extensions = {};

Extensions.Number = {

    /// Formats the value (assuming seconds) as a time string (format `[hh:]mm:ss`).
    ///
    /// Examples:
    /// - 265.2 → "4:25"
    /// - 7285  → "2:01:25"
    timeFormatted() {
        //const padded = (num) => num.toFixed(0).padStart(2, '0');
        const padded = num => _(num).padStart(2);

        const h = Math.floor(this / 3600);
        const m = Math.floor((this % 3600) / 60);
        const s = this % 60;
        return (this >= 3600) ?
            `${h}:${padded(m)}:${padded(s)}` :
            `${m}:${padded(s)}`;
    },

    padStart(length, padStr = '0') {
        return this.toFixed(0).padStart(length, padStr);
    },

    /// Whether the value is in the provided range.
    ///
    /// Usage:
    /// - _(myNumber).in({ min: 0, max: 100})
    in(range = {}) {
        return this >= range.min && this <= range.max;
    }
};

Extensions.String = {
    capitalized() {
        return this.replaceAll(/^./g, char => char.toUpperCase());
    },

    kebabFromCamelCase() {
        return this.replaceAll(/([A-Z])/g, (char) => '-' + char.toLowerCase());
    },

    /// Whether the string is contained in the provided array.
    ///
    /// Usage:
    /// - _(myValue).in(myArray)
    in(arrayLike) {
        return Array.prototype.includes.call(arrayLike, this);
    },


    // equals(search, ignoreCase = false) {
    //     const cased = (value) => (ignoreCase === true ? value.toLowerCase() :  value);
    //     return cased(this) === cased(search);
    // },

    contains(search, ignoreCase = false) {
        if (getType(search) === 'RegExp') {
            return _(this).matches(search, ignoreCase);
        }
        const toCase = ($0) => (ignoreCase === true ? $0.toLowerCase() : $0);
        return toCase(this).includes(toCase(search));
    },

    containsOneOf(searchArray, ignoreCase = false) {
        return searchArray.some(search => _(this).contains(search, ignoreCase));
    },

    matches(regex, forceIgnoreCase = false) {
        if (forceIgnoreCase && !regex.flags.includes('i')) {
            regex = new RegExp(regex.source, regex.flags + 'i');
        }
        return this.match(regex) !== null;
    },

    /// …
    ///
    /// Parameters:
    /// - regex: TODO
    /// - transform: Fn( )?
    /// - fallback: Any? = null  // The value to return when parsing fails.
    ///
    /// Usage:
    /// - parse(myRegex, Number);
    /// - parse(myRegex, Number, {});
    /// - parse(myRegex, null, self);
    parse(regex, transform = null, fallback = null) {
        const res = this.match(regex);

        // No match
        if (is.nil(res)) {
            return (fallback === self ? this : fallback);
        }

        // If `transform` fn, apply and return
        // - with groups: run N times with each group: Fn(groupN) -> Res
        // - without:     run once with all results:   Fn(res0, res1, res2…) -> Res
        if (is(transform)) {
            return is(res.groups) ?
                _(res.groups).mapValues(transform) :
                //res.map(transform);
                transform(...res);
        }

        return res.groups || res;
    },

    /// Parses a duration string; returns seconds.
    ///
    /// Supports:
    /// - Time: 00:19 | 55:01 | 1:00:55
    /// - Seconds: 3600
    /// - Number & unit: 3600s | 60m | 1h
    ///
    /// Combinations (1:30h) are not supported.
    parseDuration() {
        if (!_(this).matches(/\d/)) {
            return null;
        }

        // Time formatted
        if (this.includes(':')) {
            const regex = /(?:(?<hour>\d*):)?(?<min>\d+):(?<sec>\d\d)/;
            //const { hour, min, sec } = this.parse(regex, Number) ?? {};
            const { hour, min, sec } = _(this).parse(regex, Number, {});
            return (hour || 0) * 3600 + min * 60 + sec;
        }

        // Number (& unit)
        const regex = /(?<value>-?\d+)(?<unit>(ms|s|m|h|d|wk|mo|y)?)$/;
        //const { value, unit } = this.parse(regex, ($0) => Number($0) || $0) ?? {};
        const { value, unit } = _(this).parse(regex, ($0) => Number($0) || $0, {});
        const factors = { ms: 0.001, s: 1, m: 60, h: 3600, d: 86_400, wk: 604_800, mo: 2_628_000, y: 31_536_000 };
        const factor = factors[unit] || 1;
        return value * factor;
    },

    parseRelativeDate() {
        const sanitized = _(this).replaceMultiple([
            [/^in /, ''],
            ['about ', ''],
            [/^a /, '1 '],
            [/ seconds?/, 's'],
            [/ minutes?/, 'm'],
            [/ hours?/,   'h'],
            [/ days?/,    'd'],
            [/ weeks?/,   'wk'],
            [/ months?/,  'mo'],
            [/ years?/,   'y'],
            [/(.+) ago$/, '-$1'],
        ]);
        return _(sanitized).parseDuration();
    },

    parseFileSize() {
        // Number & unit
        const regex = /(?<value>-?\d+(\.\d+)?)\s*(?<unit>[KMGT]?B)/i;
        //const { value, unit } = this.parse(regex, ($0) => Number($0) || $0);
        const { value: valueStr, unit } = this.match(regex).groups;
        const value = Number(valueStr);
        const factors = { b: 1, kb: 1024, mb: 1024**2, gb: 1024**3, tb: 1024**4 };
        const factor = factors[unit.toLowerCase()] || 1;
        return value * factor;
    },

    /// Replaces multiple patterns.
    ///
    /// Usage:
    ///   text.replaceMultiple([
    ///       [/(.+) ago/, '-$1'],
    ///       [' days',    'd'],
    ///       [' months',  'mo'],
    ///   ]);
    replaceMultiple(pairs) {
        const _replaceOne = (string, [pattern, replacement]) =>
            (pattern instanceof RegExp && pattern.global) ?
                string.replaceAll(pattern, replacement ?? '') :
                string.replace(pattern, replacement ?? '');

        return pairs.reduce(_replaceOne, this);
    },

    /// Remove leading/trailing whitespace
    ///
    /// Usage:
    /// - trimWhitespace();
    trimWhitespace() {
        return this.replaceAll(/(^\s*|\s*$)/g, '');
    },
};


Extensions.Object = {
    mapArray(transform) {
        const entries = Object.entries(this);
        return entries.map(([key, value], index) => transform(key, value, index));
    },

    mapValues(transform) {
        const entries = Object.entries(this);
        const transformed = entries.map(([key, value], index) => [key, transform(value, key, index)]);
        return Object.fromEntries(transformed);
    },

    join(kvSep = ': ', entrySep = '\n') {
        return _(this).mapArray((k,v) => `${k}${kvSep}${v}`)
            .join(entrySep);
    },

    __diff(other, keyNames = ['A', 'B']) {
        const allKeys = Array.from(new Set([...Object.keys(this), ...Object.keys(other)]));

        // const diffPairs = allKeys.reduce((res, key) => {
        //     if (this[key] !== other[key]) {
        //         res.push([key, { [keyNames[0]]: this[key], [keyNames[1]]: other[key] }]);
        //     }
        //     return res;
        // }, []);

        const [keyA, keyB] = keyNames;
        const diffPairs = _(allKeys).filterMap(
            (key) => this[key] !== other[key],
            (key) => [key, { [keyA]: this[key], [keyB]: other[key] }]
        )
        return Object.fromEntries(diffPairs);
    },

};


Extensions.Array = {
    last() {
        // return this[this.length-1];
        return this.at(-1);
    },

    count(filterFn) {
        if (is.nil(filterFn)) { return this.length; }

        // let res = 0;
        // this.forEach((node, i, list) => {
        //     if (filterFn(node, i, list)) { res++; }
        // });
        // return res;
        return this.filter(filterFn).length;
    },

    mapObject(transform) {
        const entries = this.map($0 => transform($0));
        return Object.fromEntries(entries);
    },

    filterMap(filter, transform) {
        return this.reduce((res, element) => {
            if (filter(element)) {
                res.push(transform(element));
            }
            return res;
        }, []);
    },
};


Extensions.Location = {
    // Path

    /// Whether the path starts with the specified string.
    pathStartsWith(text) {
        return this.pathname.startsWith(text);
    },

    /// Whether the path matches the specified pattern.
    pathMatches(search) {
        // return this.pathname.match(search) !== null;
        return _(this.pathname).matches(search);
    },


    // Query

    /// Returns the first query item with the specified name.
    searchParam(name) {
        return new URLSearchParams(this.search).get(name);
    },

    // setSearchParam(name, value) {
    //     return new URLSearchParams(this.search).set(name, value);
    // },

    /// Returns an object of all query items, or, if an array of names
    /// is provided, the items with matching names.
    searchParams(names = null) {
        const params = new URLSearchParams(this.search);
        return is.array(names) ?
            _(names).mapObject(name => [name, params.get(name)]) :
            Object.fromEntries(params.entries());
    },


    // Fragment

    /// Returns an object of all fragment items, or, if an array of
    /// names is provided, the items with matching names.
    fragmentItems(names = null) {
        const items = new URLSearchParams(url.hash.slice(1));
        return is.array(names) ?
            _(names).mapObject(name => [name, items.get(name)]) :
            Object.fromEntries(items.entries());
    },

    fragmentItem(name) {
        return _(this).fragmentItems([name])[name];
    },

//     fragment(__names) {
//         names = is.array(__names)
//         names = arguments.length > 1 ? Array.from(arguments);
//         single = arguments.length === 1 ? __names
//         all = arguments.length === 0

//         switch (arguments.length) {
//             case 0: return _(this).fragmentItems();

//             case 1: return is.array(arguments[0]) ? return _(this).fragmentItems(arguments[0]); : _(this).fragmentItem()
//             break;

//             default: names
//         }
//     },
};

Extensions.Document = {
    /// ...
    ///
    /// - tagName: String
    /// - properties: [String: Fn]?
    /// - events: [String: Fn]?
    ///
    /// Usage:
    /// - createElement('img', { src: '…' }, { load: (event) => … }));
    /// - createElement('div', { innerText: '…', style: { … } };
    createElement(tagName, properties = null, events = null) {
        const element = document.createElement(tagName);

        if (properties !== null) {
            _(element).setProperties(properties);
        }

        if (is.obj(events)) {
            _(events).mapArray((name, listener) => element.addEventListener(name, listener));
        }

        return element;
    },

    /// ...
    ///
    ///
    /// Usage:
    /// - _(document).addStyleSheet({ img: { margin: '10px' } });
    addStyleSheet(rules = {}) {
        const sheet = new CSSStyleSheet();
        _(rules).mapArray((selector, style, index) => {
            const styleStr = _(style).join(': ', '; ');
            const ruleStr = `${selector} { ${styleStr} }`;
            sheet.insertRule(ruleStr, index);
        });
        //document.adoptedStyleSheets.push(sheet);
        this.adoptedStyleSheets.push(sheet);
    },
};



Extensions.HTMLElement = {
    /// ...
    ///
    /// Usage: applyStyle({ fontSize: '12px, color: 'green !important' });
    applyStyle(style = {}) {
        for (const key in style) {
            const property = _(key).matches('[A-Z]') ? _(key).kebabFromCamelCase() : key;
    	    const [value, priority] = is.str(style[key]) ? style[key].split(' !') : [style[key]];
    	    this.style.setProperty(property, value, priority);
        }
    },

    /// ...
    ///
    /// Usage:
    /// -
    textAtSelector(selector) {
        return this.querySelector(selector)?.innerText;
    },


    // propertyAtSelector(selector, propertyName) {
    //     return this.querySelector(selector)?.[propertyName];
    // },

    /// ...
    ///
    /// Usage:
    /// -
    // get parent() {
    //     return this.parentElement;
    // },



    /// Creates a new Element and inserts it as the last child.
    ///
    /// Parameters:
    /// - tagName: String
    /// - properties: Obj<Attribute, Value>?
    /// - eventListeners: Obj<EventName, Fn(Event) -> Void>?
    /// - childCallback: Fn(appendFn)?
    ///
    /// Basic Usage:
    /// - appendElement('img', { src: '…'                     });
    /// - appendElement('div', { innerText: '…', style: { … } });
    ///
    /// With event listener:
    /// - appendElement('img', { … }, { load:  (event) => { … } });
    /// - appendElement('a',   { … }, { click: (event) => { … }, hover: (event) => { … } });
    ///
    /// With child creation:
    /// - appendElement('div', { … }, { … }, (appendChild) => {
    ///       appendChild('a', { innerText: '…' });
    ///       appendChild('span', { … });
    ///   });
    appendElement(tagName, properties = null, events = null, childrenCallback = null) {
        const element = _(document).createElement(tagName, properties, events);
        childrenCallback?.(_(element).appendElement);
        this.appendChild(element);
        return element;
    },

    /// Creates a new Element and inserts it as the first child.
    ///
    /// Usage see `appendElement`.
    prependElement(tagName, properties = null, events = null) {
        const element = _(document).createElement(tagName, properties, events);
        this.insertBefore(element, this.firstChild);
        return element;
    },

    /// Creates a new Element and inserts it before/after the specified reference element.
    ///
    /// The reference element can be:
    /// - an existing (child) element: inserts it as **child**   of the current element, or
    /// - the `self` Symbol:           inserts it as **sibling** of the current element.
    ///
    /// Usage:
    /// - insertElement({ before: otherElement }, 'img', { src: '…' }, { load: (event) => … });
    /// - insertElement({ after:  self         }, 'div', { innerText: '…', style: { … } });
    /// //- insertElement({ index:  3            }, 'div', … );
    insertElement(refElement = {}, tagName, properties = null, events = null) {
        if (is.nil(refElement.before ?? refElement.after)) {
        // if (is.nil(refElement.before ?? refElement.after ?? refElement.at)) {
            LogGroup.error('Invalid Reference element.');
            return null;
        }

        // (Bool) Insert before? (or after)
        const isBefore = is(refElement.before);
        // const isIndex  = is(refElement.at);

        // The actual reference element
        const _refElement = isBefore ? refElement.before : refElement.after;
        // const _refElement = isIndex ? this.childNodes.item(refElement.at) :
        //     isBefore ? refElement.before : refElement.after;

        // In case the reference element is (the symbol) `self`,
        // re-run this method on the parent element, with `this` as reference element.
        if (_refElement === self) {
            const thisRef = isBefore ? ({ before: this }) : ({ after: this });
            return _(this.parentElement).insertElement(thisRef, tagName, properties, events);
        }

        // Create the new element
        const newElement = _(document).createElement(tagName, properties, events);

        // The element after the reference Element, needed by `insertBefore`.
        const nextElement = isBefore ? _refElement : _refElement.nextElementSibling;
        is(nextElement) ?
            this.insertBefore(newElement, nextElement) :
            this.appendChild(newElement);
        return newElement;
    },

    /// ...
    ///
    /// Usage:
    /// - insertElementAfter(otherElement, 'img', […] );
//     insertElementAfter(refElement, tagName, properties = null, events = null) {
//         LogGroup.warn('Deprecated. Use `insertElement({ after: … }, …)` instead.');
//         const element = _(document).createElement(tagName, properties, events);

//         const nextElement = refElement.nextElementSibling;
//         is(nextElement) ?
//             this.insertBefore(element, nextElement) :
//             this.appendChild(element);
//         return element;
//     },

    /// ...
    ///
    /// Usage:
    /// -
    setProperties(properties = {}) {
        if (properties.hasOwnProperty('style')) {
            _(this).applyStyle(properties.style);
            delete properties.style;
        };
        _(properties).mapArray((key, value) => this[key] = value);
    },

    /// ...
    ///
    /// Usage:
    /// -
    // wrapInLink(url) {
    //     const anchor = document.createElement("a");
    //     anchor.href = url;
    //     anchor.innerHTML = this.outerHTML;
    //     this.replaceWith(anchor);
    //     return anchor;
    // },

    /// ...
    ///
    /// Usage:
    /// -
    parentElementAtLevel(levels) {
        const iterations = Math.max(levels, 1); // at least 1

        let target = this;
        for (let i = 0; i < iterations; i++) {
            target = target.parentElement;
        }
        return target;
    },



    // Debug tools

    /// ...
    ///
    /// Usage: ...
    __allStyles() {
        const styles = getComputedStyle(this);
        return Object.fromEntries(Array.from(styles).map((name) => [name, styles[name]]));
    },

    /// Returns the diff of the elements' styles.
    ///
    /// Usage:
    /// - log(_(myElement).__compareStyles(otherElement));
    ///
    /// - const stylesBefore = _(myElement).__allStyles();
    ///   // [...]
    ///   log(_(myElement).__compareStyles(stylesBefore));
    __compareStyles(otherStyles__or__element, keyNames = ['before', 'after']) {
        log('[__compareStyles] other type:', getType(otherStyles__or__element), 'is el:', is.type('HTMLElement', otherStyles__or__element));
        const otherStyles = is.type('HTMLElement', otherStyles__or__element) ?
            _(otherStyles__or__element).__allStyles() :
            otherStyles__or__element;
        const thisStyles = _(this).__allStyles();
        return _(otherStyles).__diff(thisStyles, keyNames);
    }
};



Extensions.HTMLImageElement = {
    get currentSize() {
        return {
            width:  this.width,
            height: this.height,
        };
    },

    get currentScale() {
        return this.height / this.naturalHeight;
    },

    get fullSize() {
        return {
            width:  this.naturalWidth,
            height: this.naturalHeight,
        };
    },

    get aspectRatio() {
        if (this.naturalHeight === 0) { return null; }
        return this.naturalWidth / this.naturalHeight;
    },
};



Extensions.Response = {
    async htmlDOM() {
        const htmlString = await this.text();
        const parser = new DOMParser();
        return parser.parseFromString(htmlString, 'text/html');
    },
};

Extensions.NodeList = {
    count(filterFn) {
        if (is.nil(filterFn)) { return this.length; }

        let res = 0;
        this.forEach((node, i, list) => {
            if (filterFn(node, i, list)) { res++; }
        });
        return res;
    },


/*
    map(transform) {
        if (!is.function(transform)) { throw 'map(): First argument must be a function.' };
        return this.__filterMap(transform);
    },

    filter(filter) {
        if (!is.function(filter)) { throw 'filter(): First argument must be a function.' };
        return this.__filterMap(null, filter);
    },

    __filterMap(transform = null, filter = null, order = 'filterFirst') {
        const canTransform = is.function(transform);
        const canFilter    = is.function(filter);

        const isFiltered = ($0) => filter($0) === false;
        let res = [];
        for (const node of this) {
            let item = node;
            if (canFilter && order === 'filterFirst' && isFiltered(item)) { return; }
            if (canTransform) { item = transform(node); }
            if (canFilter && order === 'mapFirst'    && isFiltered(item)) { return; }
            res.push(item);
        }
        return res;
    },
*/
}






function getType(target, funcNames = true) {
    // null, undefined
    if (is.nil(target)) { return String(target); }

    const type = typeof target;

    // Named functions
    if (funcNames && type === 'function' && target.name) { return target.name; }

    // Class names
    const className = target.constructor?.name;
    if (className) { return className; }

    // Target's string representation
    // https://developer.mozilla.org/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag
    const stringTag = target[Symbol.toStringTag];
    if (stringTag) { return stringTag; }

    //const toPrimitive = target[Symbol.toPrimitive];
    //if (toPrimitive) { return toPrimitive('string'); }

    // https://developer.mozilla.org/Web/JavaScript/Reference/Global_Objects/Object#null-prototype_objects
    if (type === 'object' && Object.getPrototypeOf(target) === null) {
        return 'NullObject';
    }

    return type;
}

const Reflect_prototypes = (obj) => {
    const proto = Object.getPrototypeOf(obj);
    return (proto !== null) ? [proto, ...Reflect_prototypes(proto)] : [];
};






const extend = (target, extension = {}, originalTarget = null) => {
    const propertyFromExtension = (propertyName) => {
        if (!extension.hasOwnProperty(propertyName)) { return null; }
        const _this = originalTarget ?? target;
        const property = Reflect.get(extension, propertyName, _this);
        return is.function(property) ? property.bind(_this) : property;
    };
    const propertyFromTarget = (propertyName, _target) => {
        const unwrappedTarget = (_target?.constructor?.name === 'PrimitiveWrapper') ? _target.value : _target;
        const _this = originalTarget ?? target;
        const property = Reflect.get(unwrappedTarget, propertyName, _this);
        return is.function(property) ? property.bind(_this) : property;
    };
    const setPropertyOnTarget = (_target, propertyName, newValue) => {
        if (_target?.constructor?.name === 'PrimitiveWrapper') {
            _target.value[propertyName] = newValue;
        } else {
            _target[propertyName] = newValue;
        }
    };


    const proxyTarget = is.obj(target) ? target : new PrimitiveWrapper(target);
    const proxy = new Proxy(proxyTarget, {
        get(_target, propertyName) {
            return propertyFromExtension(propertyName) ?? propertyFromTarget(propertyName, _target);
        },

        set(_target, propertyName, newValue) {
            setPropertyOnTarget(_target, propertyName, newValue);
        },

    });
    return proxy;
    // return { extended: proxy, original: originalTarget ?? target };
};

class PrimitiveWrapper {
    constructor(value) {
        this.value = value;
    }
};



// const extend = (target, extension = {}) => {
//     const getFromExtension = (prop) => (
//         extension.hasOwnProperty(prop) ?
//             Reflect.get(extension, prop, target) :
//             null
//     );

//     const getFromTarget = (wrapper, prop) => {
//         const property = wrapper.target[prop];
//         return is.function(property) ? property.bind(wrapper.target) : property;
//     };

//     const setOnTarget = (wrapper, prop, newValue) => (wrapper.target[prop] = newValue);

//     // Wrap target in object, so Primitives can be Proxied (+ maybe reference semantics?)
//     const wrapper = { target };
//     return new Proxy(wrapper, {
//         get(wrapper, prop) {
//             return getFromExtension(prop) ?? getFromTarget(wrapper, prop);
//         },

//         set(wrapper, prop, newValue) {
//             setOnTarget(wrapper, prop, newValue);
//         },
//     });
// };



/// Extends a single instance.
///
/// Parameters:
/// - target: (Any) The instance to extend.
/// - typeName: (String?) Which type to use for extending.
const _ = (target, typeName = null) => {
    // null/undefined cannot be extended
    if (is.nil(target)) { return target; }

    // Enforced extension type
    if (!is.nil(typeName)) {
        return extend(target, Extensions[typeName]);
        // const { extended, original } = extend(target, Extensions[typeName]);
        // return extended;
    }

    // Special case: NullObject uses Object extension
    const type = getType(target);
    if (type === 'NullObject') {
        return extend(target, Extensions.Object);
        // const { extended, original } = extend(target, Extensions.Object);
        // return extended;
    }


    // Walk up the prototype chain (starting at `Object`) and wrap the previous
    // result with the current prototype's extension.
    // The innermost extension will be from `Object`, the outermost (closest to)
    // the target type.
    let _target = target;

    // LogGroup.debug('[_] target:', target);
    for (const proto of Reflect_prototypes(target).reverse()) {
        const type = getType(proto);
        const extension = Extensions[type];
        // LogGroup.debug(' • proto:', type, 'has extension:', is(extension));
        if (is(extension)) {
            // _target = extend(_target, extension);
            _target = extend(_target, extension, target);
            // const { extended, original } = extend(_target, extension, target);
            // _target = extended;
        }
    }

    return _target;
}



/// Returns whether a value exists (`is`) or is of a certain type.
const is    = ($0) => ($0 !== undefined && $0 !== null);
is.defined  = ($0) => ($0 !== undefined);
is.nil      = ($0) => (!is($0));
is.bool     = ($0) => (typeof $0 === 'boolean');
is.number   = ($0) => (typeof $0 === 'number');
is.string   = ($0) => (typeof $0 === 'string');
is.function = ($0) => (typeof $0 === 'function');
is.object   = ($0) => (typeof $0 === 'object' && $0 !== null);
is.symbol   = ($0) => (typeof $0 === 'symbol');
is.array    = ($0) => Array.isArray($0);
is.num = is.number;
is.str = is.string;
is.fn  = is.function;
is.obj = is.object;


/// A symbol used for self-reference.
/// Example: insertElement({ before: self }, […] )
const self = Symbol('self');



/*
const catching = (body, errorHandler = LogGroup.error) => {
    try { return body(); }
    catch (e) { errorHandler(e); return null; }
}


/// Runs a provided function body.
///
/// Usage:
///   const foo = 'asd';
///   withScope(() => {
///       const foo = 123;
///   });
const withScope = (body) => body();


// For usage see SnippetsLab
const Enum = (obj) => new Proxy({}, {
    get: (_, property) => obj[property] || obj.cases[property],
    set: (_, property) => console.error(`${property} is read only.`),
});
*/


// Export (copied from SunCalc)
if (is(module) && is.object(exports)) {          // ??
    //console.debug('export: module');
    module.exports = Extensions;
} else if (is.function(define) && define.amd) {  // ??
    //console.debug('export: define');
    define(Extensions);
} else {
    //console.debug('export: window');
    window.Extensions = Extensions;
}

