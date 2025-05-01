//import { something } from 'https://raw.githubusercontent.com/0bmxa/UserScript/refs/heads/main/extend.js';


class Dialog {
    options = {
        duration: 300,
    };

    style = `
    @keyframes showOverlay {
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
    
    .overlay {
        position: fixed;
        top:     0;
        left:    0;
        bottom:  0;
        right:   0;
        display:         flex;
        z-index:         1000;
        background:      rgba(0, 0, 0, 0.4);
        justify-content: center;
        align-items:     center;
        animation:       showOverlay 300ms ease-out;
    }
    
    .dialog {
        width:          270px;
        display:        flex;
        flex-direction: column;
        background:     #f2f2f7;
        border-radius:  10px;
        overflow:       hidden;
        animation:      showDialog 300ms ease-out;
    }
    
    .title {
        margin:     0;
        padding:    16px 16px 0 16px;
        text-align: center;
        font:       -apple-system-headline;
        font-size:  1.1rem;
    }
    
    .message {
        margin: 0;
        margin-bottom: 16px;
        padding: 0 16px;
        text-align: center;
        white-space: pre-wrap;
        font: -apple-system-body;
    }
    
    .textfields {
        padding: 8px 16px;
    }
    
    input {
        width: 100%;
        padding: 8px 12px;
        margin-bottom: 8px;
        border: none;
        border-radius: 8px;
        background: #e5e5ea;
        font: -apple-system-body;
        box-sizing: border-box;
    }
    
    .buttons {
        display:    flex;
        margin-top: 8px;
        border-top: 0.5px solid rgba(0, 0, 0, 0.15);
    }
    
    .buttons.stacked {
        flex-direction: column;
    }
    
    button {
        flex: 1;
        padding: 12px;
        border: none;
        background: none;
        color: #007aff;
        font: -apple-system-body;
        font-size: 1.05rem;
    }
    
    button.primary {
        font-weight: 600;
    }
    
    button + button {
        border-left: 0.5px solid rgba(0, 0, 0, 0.15);
    }
    
    .buttons.stacked button + button {
        border-left: none;
        border-top: 0.5px solid rgba(0, 0, 0, 0.15);
    }
    
    @media (prefers-color-scheme: dark) {
        .dialog {
            background: #1c1c1e;
            color: #fff;
        }
        
        input {
            background: #2c2c2e;
            color: #fff;
        }
        
        .buttons {
            border-top-color: rgba(255, 255, 255, 0.15);
        }
        
        button + button {
            border-left-color: rgba(255, 255, 255, 0.15);
        }
        
        .buttons.stacked button + button {
            border-top-color: rgba(255, 255, 255, 0.15);
        }
    }
    `;
    
    /* #dependencies = [
        'https://raw.githubusercontent.com/0bmxa/UserScript/refs/heads/main/extend.js',
    ]; */
  
    constructor(options = {}) {
        Object.assign(this.options, options);
        //this.#loadDependencies(document.head);
    }

    open(config) {
        return new Promise(resolve => this.#create(config, resolve));
    }
    
    /* #loadDependencies(target) {
        this.#dependencies.forEach(src => {
            const script = document.createElement('script');
            script.type  = 'module';
            script.src   = src;
            script.onLoad  = () => alert('script loaded!');
            script.onError = () => alert('script loading failed!');
            target.appendChild(script);
        });
        
        //Object.assign(window, window.__ExtendJS);
        //delete window.__ExtendJS;
    } */
    
    async #create(config, buttonAction) {
        const root   = document.createElement('div');
        const shadow = root.attachShadow({ mode: 'open' });
        
        //this.#loadDependencies(shadow);
        //this.#loadDependencies(document.head);
        
        //_(document.body).appendElement();

        const style = document.createElement('style');
        style.textContent = this.style;
        
        const modal = document.createElement('div');
        modal.className = 'overlay';

        const dialog = document.createElement('div');
        dialog.className = 'dialog';

        if (config.title) {
            const title = document.createElement('div');
            title.className = 'title';
            title.textContent = config.title;
            dialog.appendChild(title);
        }

        if (config.message) {
            const message = document.createElement('div');
            message.className = 'message';
            message.textContent = config.message;
            dialog.appendChild(message);
        }

        const values = {};
        if (config.inputs) {
            const inputsContainer = document.createElement('div');
            inputsContainer.className = 'textfields';

            Object.entries(config.inputs).forEach(
                ([placeholder, input]) => {
                    const inputEl = document.createElement('input');
                    if (typeof input === 'object' && input !== null) {
                        inputEl.type = input.type || 'text';
                        inputEl.value = input.value || '';
                    } else {
                        inputEl.type = 'text';
                        inputEl.value = input || '';
                    }
                    inputEl.placeholder = placeholder;
                    inputEl.name = placeholder;
                    inputsContainer.appendChild(inputEl);
                    values[placeholder] = inputEl;
                }
            );

            dialog.appendChild(inputsContainer);
        }

        const buttons = (config.buttons || ['OK']).map((btn) =>
            typeof btn === 'string' ? { label: btn } : btn
        );

        const buttonContainer = document.createElement('div');
        buttonContainer.className = `buttons ${
            buttons.length > 2 ? 'stacked' : ''
        }`;

        buttons.forEach((btn) => {
            const button = document.createElement('button');
            button.textContent = btn.label;
            button.className   = `${btn.primary ? 'primary' : ''}`;

            button.onclick = () => {
                document.body.removeChild(root);
                const res = {
                    button: btn.label,
                    values: Object.fromEntries(
                        Object.entries(values).map(([key, input]) => [
                            key,
                            input.value,
                        ])
                    ),
                };
                buttonAction(res);
            };

            buttonContainer.appendChild(button);
        });

        dialog.appendChild(buttonContainer);
        modal.appendChild(dialog);
        shadow.appendChild(style);
        shadow.appendChild(modal);
        document.body.appendChild(root);
    }
}


export default Dialog;
