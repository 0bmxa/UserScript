class Dialog {
    options = {
        backdropColor: 'rgba(0, 0, 0, 0.4)',
        align:         'left',
    };

    get style() {
        const options = this.options;
        const { scale, height } = visualViewport.scale;

        return `
        @keyframes showBackdrop {
            from { opacity: 0 }
            to   { opacity: 1 }
        }
        @keyframes showDialog {
            from { opacity: 0; transform: scale(1.2) }
            to   { opacity: 1; transform: scale(1.0) }
        }

        * {
            font: -apple-system;
        }

        .root {
            --viewportScale:  ${scale};
            --viewportHeight: ${height};
        }

        .backdrop {
            position:        fixed;
            top:             0;
            left:            0;
            bottom:          0;
            right:           0;
            display:         flex;
            z-index:         1000;
            background:      ${options.backdropColor ?? 'none'};
            justify-content: center;
            align-items:     center;
            animation:       showBackdrop 300ms ease-out;
        }

        .dialog {
            width:          calc( 90vw * var(--scale));
            max-width:      calc(500px * var(--scale));
            max-height:     calc( 90vh * var(--scale));
            transform:      scale(calc(1 / var(--scale)));
            display:        flex;
            flex-direction: column;
            background:     #f2f2f7;
            border-radius:  10px;
            overflow:       hidden;
            box-shadow:     0px 5px 10px rgba(0, 0, 0, 0.4);
            animation:      showDialog 300ms ease-out;

            @media (prefers-color-scheme: dark) {
                background: #1c1c1e;
                color:      #fff;
            }
        }

        .title {
            margin:     0;
            padding:    16px 16px 0 16px;
            font:       -apple-system-headline;
            font-size:  1.1rem;
            text-align: center;
        }

        .message {
            margin:        0 0 16px 0;
            padding:       0 16px;
            white-space:   pre-wrap;
            overflow-y:    scroll;
            word-wrap:     break-word;
            font:          -apple-system-body;
            line-height:   1.36em;
            text-align:    ${options.align ?? 'none'};

            &.monospace {
                font-family: monospace;
            }
        }

        .textFields {
            padding: 8px 16px;
        }

        input {
            box-sizing:    border-box;
            width:         100%;
            padding:       8px 12px;
            margin-bottom: 8px;
            background:    white;
            border:        0.5px solid #ccc;
            border-radius: 8px;
            font:          -apple-system-body;

            @media (prefers-color-scheme: dark) {
                background: #2c2c2e;
                color:      #fff;
            }
        }

        .buttons {
            --borderColor: rgba(0, 0, 0, 0.15);

            @media (prefers-color-scheme: dark) {
                --borderColor: rgba(255, 255, 255, 0.15);
            }

            display:    flex;
            margin-top: 8px;
            border-top: 0.5px solid var(--borderColor);

            & button {
                flex:       1;
                padding:    12px;
                border:     none;
                background: none;
                color:      #007aff;
                font:       -apple-system-body;
                font-size:  1.05rem;

                &.primary {
                    font-weight: 600;
                }

                & + & {
                    border-left: 0.5px solid var(--borderColor);
                }
            }

            &.stacked {
                flex-direction: column;

                & button + button {
                    border-left: none;
                    border-top:  0.5px solid var(--borderColor);
                }
            }
        }
        `;
    }

    /* #dependencies = [
        { src: 'https://raw.githubusercontent.com/0bmxa/UserScript/refs/heads/main/extend.js',
          names: [ 'is' ] },
    ]; */

    constructor(options = {}) {
        Object.assign(this.options, options);
        //this.#loadDependencies(document.head);
    }

    open(config) {
        return new Promise(resolve => this.#create(config, resolve));
    }

    /* #loadDependencies(target) {
        /* this.#dependencies.forEach(src => {
            const script = document.createElement('script');
            script.type  = 'module';
            script.src   = src;
            script.onLoad  = () => alert('script loaded!');
            script.onError = () => alert('script loading failed!');
            target.appendChild(script);
        }); * /

        for (const dep of this.#dependencies) {
            const module = await import(dep.src);
            const keys = dep.keys ?? Object.keys(module);
            for (const key in module) {
                const should = dep.keys?.includes(key) ?? true;
                const name = (key === 'default') ? dep.defaultName : key;
               Reflect.set(globalThis, name, module[key]);
            }
        }
    } */

    #host = null;
    #root = null;

    async #create(config, buttonAction) {
        this.#host   = document.createElement('div');
        const shadow = this.#host.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = this.style;

        this.#root = document.createElement('div');
        this.#root.className = 'root backdrop';

        const dialog = document.createElement('div');
        dialog.className = 'dialog';

        if (config.title) {
            const title = document.createElement('div');
            title.className   = 'title';
            title.textContent = config.title;
            dialog.appendChild(title);
        }

        if (config.message) {
            const message = document.createElement('div');
            message.className   = 'message';
            message.textContent = config.message;
            dialog.appendChild(message);
        }

        const inputElements = [];
        if (config.inputs) {
            const inputContainer = document.createElement('div');
            inputContainer.className = 'textFields';

            for (const name in config.inputs) {
                const conf = config.inputs[name];

                const inputEl = document.createElement('input');
                inputEl.type        = conf?.type ?? 'text';
                inputEl.value       = conf?.value ?? conf ?? '';
                inputEl.placeholder = name;
                inputEl.name        = name;
                inputContainer.appendChild(inputEl);
                inputElements.push(inputEl);
            }

            dialog.appendChild(inputContainer);
        }

        const buttons = (config.buttons ?? [ 'OK' ]).map(conf =>
            (typeof conf === 'string') ? { label: conf } : conf
        );

        const buttonContainer = document.createElement('div');
        buttonContainer.className = `buttons ${buttons.length > 2 ? 'stacked' : ''}`;

        const _buttonAction = (buttonValue) => {
            this.#close();

            const inputValues = inputElements.reduce(
                (res, el) => { res[el.name] = el.value; return res },
            {});

            buttonAction({
                button: buttonValue,
                values: inputValues,
            });
        };

        buttons.forEach(conf => {
            const buttonEl = document.createElement('button');
            buttonEl.textContent = conf.label;
            buttonEl.className   = `${conf.primary ? 'primary' : ''}`;
            buttonEl.addEventListener('click', () => _buttonAction(conf.label));
            buttonContainer.appendChild(buttonEl);
        });

        dialog.appendChild(buttonContainer);
        this.#root.appendChild(dialog);
        shadow.appendChild(style);
        shadow.appendChild(this.#root);
        document.body.appendChild(this.#host);

        visualViewport.addEventListener('resize', () => this.#onResize());
    }

    #close() {
        document.body.removeChild(this.#host);
        this.#host = null;
        this.#root = null;
    }

    #onResize() {
        this.#root?.style.setProperty('--viewportScale',  visualViewport.scale);
        this.#root?.style.setProperty('--viewportHeight', visualViewport.height);
    }
}


export default Dialog;
