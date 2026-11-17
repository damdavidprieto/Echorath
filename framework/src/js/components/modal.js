import { STATE_CLASS } from '../core/constants.js';
import { create } from '../core/dom.js';
import { tone } from '../core/tone.js';

const BUTTON_VARIANTS = ['ghost', 'solid', 'danger', 'warn', 'info'];
const SIZES = ['md', 'lg'];
const FADE_MS = 300;
let openCount = 0;

// The page behind stays still while at least one modal is open
function lockScroll() {
    openCount++;
    document.documentElement.classList.add(STATE_CLASS.scrollLocked);
}

function unlockScroll() {
    openCount = Math.max(0, openCount - 1);
    if (openCount === 0) document.documentElement.classList.remove(STATE_CLASS.scrollLocked);
}

/** Fill a modal body with text or a node. */
function fill(content, body) {
    if (body instanceof Node) content.replaceChildren(body);
    else content.textContent = body;
}

/**
 * Open a modal dialog.
 * Resolves with the chosen action's value, or undefined when closed with
 * Escape, the close button or a click on the backdrop.
 *
 * The returned promise is also a handle to the open dialog, for content that
 * changes while it is open (a reader or a gallery with previous / next):
 *   element      the dialog (.e-modal)
 *   setTitle(t)  new title, also the dialog's accessible name
 *   setBody(b)   new body (text or node), scrolled back to the top
 *   close(v)     close it, resolving with v
 *
 * @param {{
 *   title?: string,
 *   body?: string | Node,
 *   tone?: string,
 *   size?: 'md' | 'lg',
 *   actions?: Array<{ label: string, value?: unknown, variant?: string }>
 * }} [options]
 * @returns {Promise<unknown> & { element: HTMLElement, setTitle(title: string): void,
 *           setBody(body: string | Node): void, close(value?: unknown): void }}
 */
export function modal({
    title = '',
    body = '',
    tone: toneName = 'ok',
    size = 'md',
    actions = [{ label: 'Aceptar', value: true, variant: 'solid' }],
} = {}) {
    let handle;
    const done = new Promise(resolveModal => {
        const previous = document.activeElement;

        const overlay = create('div', { class: 'e-modal-overlay' });
        const sizeClass = SIZES.includes(size) && size !== 'md' ? ` e-modal--${size}` : '';
        const dialog = create('div', { class: `e-modal${sizeClass}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
        tone(dialog, toneName);

        const head = create('div', { class: 'e-modal__head' });
        const heading = create('span', {}, title);
        head.appendChild(heading);
        const closeButton = create('button', { class: 'e-btn e-modal__close', type: 'button', 'aria-label': 'Cerrar' }, '×');
        head.appendChild(closeButton);

        const content = create('div', { class: 'e-modal__body' });
        fill(content, body);

        const foot = create('div', { class: 'e-modal__foot' });
        const buttons = actions.map(action => {
            const variant = BUTTON_VARIANTS.includes(action.variant) ? action.variant : 'ghost';
            const button = create('button', { class: `e-btn e-btn--${variant}`, type: 'button' }, action.label);
            button.addEventListener('click', () => close(action.value));
            foot.appendChild(button);
            return button;
        });

        dialog.append(head, content, foot);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const focusable = [closeButton, ...buttons];

        // Keep Tab cycling inside the dialog
        const trapFocus = e => {
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        const onKey = e => {
            if (e.key === 'Escape') close(undefined);
            if (e.key === 'Tab') trapFocus(e);
        };

        let closed = false;
        function close(value) {
            if (closed) return;   // a second call must not unlock another modal's scroll
            closed = true;
            document.removeEventListener('keydown', onKey);
            unlockScroll();
            overlay.classList.remove(STATE_CLASS.open);
            setTimeout(() => overlay.remove(), FADE_MS);
            if (previous && typeof previous.focus === 'function') previous.focus();
            resolveModal(value);
        }

        closeButton.addEventListener('click', () => close(undefined));
        overlay.addEventListener('click', e => {
            if (e.target === overlay) close(undefined);
        });
        document.addEventListener('keydown', onKey);
        lockScroll();

        requestAnimationFrame(() => {
            overlay.classList.add(STATE_CLASS.open);
            (buttons[0] || closeButton).focus();
        });

        handle = {
            element: dialog,
            setTitle(text) {
                heading.textContent = text;
                dialog.setAttribute('aria-label', text);
            },
            setBody(next) {
                fill(content, next);
                content.scrollTop = 0;
            },
            close,
        };
    });
    // The executor runs synchronously, so the handle is ready here
    return Object.assign(done, handle);
}
