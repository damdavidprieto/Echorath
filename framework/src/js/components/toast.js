import { STATE_CLASS } from '../core/constants.js';
import { config } from '../core/config.js';
import { create } from '../core/dom.js';
import { tone } from '../core/tone.js';

let stack = null;

// A toast stays at least as long as it takes to read: a moment to notice it,
// then about 200 words a minute
const NOTICE_MS = 1500;
const READ_MS_PER_WORD = 300;

function ensureStack() {
    if (stack && stack.isConnected) return stack;
    stack = create('div', { class: 'e-toasts', 'aria-live': 'polite' });
    document.body.appendChild(stack);
    return stack;
}

/**
 * Show a toast. Title and message are plain text.
 * @param {string} title
 * @param {string} [message]
 * @param {string} [toneName] ok | info | warn | danger | sys | off
 * @param {number} [ms] time on screen; never less than it takes to read the
 *   text. The countdown stops while the pointer or the focus is on the toast.
 * @returns {HTMLElement}
 */
export function toast(title, message = '', toneName = 'info', ms = config.toastMs) {
    const node = create('div', { class: 'e-toast', role: 'status' });
    tone(node, toneName);

    const body = create('div');
    body.appendChild(create('span', { class: 'e-toast__title' }, title));
    if (message) body.appendChild(create('span', { class: 'e-toast__msg' }, message));
    node.appendChild(body);

    ensureStack().appendChild(node);
    requestAnimationFrame(() => node.classList.add(STATE_CLASS.visible));

    const words = `${title} ${message}`.trim().split(/\s+/).length;
    let left = Math.max(ms, NOTICE_MS + words * READ_MS_PER_WORD);
    let timer = 0;
    let since = 0;
    const leave = () => {
        node.classList.remove(STATE_CLASS.visible);
        setTimeout(() => node.remove(), 350);
    };
    const resume = () => {
        if (timer) return;
        since = Date.now();
        timer = setTimeout(leave, Math.max(left, 1000));   // a second to look away after reading
    };
    const pause = () => {
        if (!timer) return;
        clearTimeout(timer);
        timer = 0;
        left -= Date.now() - since;
    };
    node.addEventListener('pointerenter', pause);
    node.addEventListener('pointerleave', resume);
    node.addEventListener('focusin', pause);
    node.addEventListener('focusout', resume);
    resume();

    return node;
}
