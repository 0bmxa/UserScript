class Dialog {
    settings = {
        backdrop: {
            color: 'rgba(0, 0, 0, 0.4)',
        },
        title: {
            align: 'center',
        },
        message: {
            align: 'left',
            code:  false,
        },
        input: {
            code: false,
        },
    };

    get style() {
        const { backdrop, title, message, input } = this.settings;
        const { scale, height } = visualViewport.scale;

        return `
        @keyframes showBackdrop {
            from { opacity: 0 }
            to   { opacity: 1 }
        }
        @keyframes showDialog {
            from { opacity: 0 }
            to   { opacity: 1 }
        }

        * {
            font: -apple-system-body;
        }

        .root {
            --viewportScale:  ${scale};
            --viewportHeight: ${height}px;
        }

        .backdrop {
            position:        fixed;
            top:             0;
            left:            0;
            bottom:          0;
            right:           0;
            display:         flex;
            z-index:         1000;
            background:      ${backdrop.color ?? 'none'};
            justify-content: center;
            align-items:     center;
            animation:       showBackdrop 300ms ease-out;
        }

        .dialog {
            width:          calc( 90vw * var(--viewportScale));
            max-width:      calc(500px * var(--viewportScale));
            max-height:     calc( 0.9 * var(--viewportHeight) * var(--viewportScale));
            transform:      scale(calc(1 / var(--viewportScale)));
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
            text-align: ${title.align ?? 'none'};;
        }

        .message {
            margin:        0 0 16px 0;
            padding:       0 16px;
            white-space:   pre-wrap;
            overflow-y:    scroll;
            word-wrap:     break-word;
            font:          -apple-system-body;
            line-height:   1.36em;
            text-align:    ${message.align ?? 'none'};
            ${message.code ? 'font-family: monospace;' : ''}
        }

        .textFields {
            padding: 8px 16px;

            input {
                box-sizing:    border-box;
                width:         100%;
                padding:       8px 12px;
                margin-bottom: 8px;
                background:    white;
                border:        0.5px solid #ccc;
                border-radius: 8px;
                font:          -apple-system-body;
                ${input.code ? 'font-family: monospace;' : ''}

                @media (prefers-color-scheme: dark) {
                    background: #2c2c2e;
                    color:      #fff;
                }
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

    constructor(settings = {}) {
        Object.keys(this.settings).forEach(k => Object.assign(this.settings[k], settings[k]));
    }

    open(config) {
        return new Promise(resolve => this.#create(config, resolve));
    }

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
                inputEl.autofocus   = true;
                inputEl.autocorrect = !this.settings.input.code;
                inputEl.spellcheck  = !this.settings.input.code;
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
        this.#root?.style.setProperty('--viewportHeight', `${visualViewport.height}px`);
    }
}


export default Dialog;
