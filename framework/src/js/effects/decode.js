import { ATTR } from '../core/constants.js';
import { config } from '../core/config.js';
import { isOffscreen } from './visibility.js';

/**
 * "decode" distortion: scrambles an element's text while loading and
 * reveals it left to right when loading ends. Text-only elements only.
 *
 * Finish guarantees:
 * - No layout shift: the element's width and height are held while the text
 *   is scrambled (glyph widths differ in proportional fonts such as Orbitron).
 * - The real text is never lost: re-triggering while a reveal is still running
 *   picks up the original text, not the half-revealed one.
 * - Reduced motion: the text is not scrambled at all.
 */

const GLYPHS = '!<>-_\\/[]{}=+*^?#%&$';
const active = new Map();   // element -> { text, timer, lock }

function scramble(node, text, resolved) {
    let out = '';
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        out += i < resolved || ch === ' '
            ? ch
            : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    }
    node.textContent = out;
}

function prefersReducedMotion() {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Hold the element's box so scrambled glyphs cannot resize it.
function lockSize(node) {
    const style = getComputedStyle(node);
    const lock = { width: node.style.width, height: node.style.height, hadStyle: node.hasAttribute('style') };
    if (style.width !== 'auto' && style.height !== 'auto') {
        node.style.width = style.width;
        node.style.height = style.height;
    }
    return lock;
}

function unlockSize(node, lock) {
    node.style.width = lock.width;
    node.style.height = lock.height;
    if (!lock.hadStyle && node.getAttribute('style') === '') node.removeAttribute('style');
}

/** True when the element holds only text (no child elements). */
export function canDecode(node) {
    return node.children.length === 0;
}

export function startDecode(node) {
    const current = active.get(node);
    if (current && !current.revealing) return;   // already scrambling

    // Re-triggered mid-reveal: keep the original text and the existing lock
    if (current) clearTimeout(current.timer);
    const state = current || { text: node.textContent, lock: lockSize(node) };
    state.revealing = false;
    state.timer = 0;
    active.set(node, state);
    node.setAttribute(ATTR.decoding, '');

    if (prefersReducedMotion()) return;
    state.timer = setInterval(() => {
        if (!isOffscreen(node)) scramble(node, state.text, 0);
    }, config.decodeScrambleMs);
}

/** Stop at once and put the real text back (used when switching variant). */
export function cancelDecode(node) {
    const state = active.get(node);
    if (!state) return;
    clearInterval(state.timer);
    clearTimeout(state.timer);
    active.delete(node);
    node.textContent = state.text;
    unlockSize(node, state.lock);
    node.removeAttribute(ATTR.decoding);
}

export function stopDecode(node) {
    const state = active.get(node);
    if (!state || state.revealing) return;
    clearInterval(state.timer);

    const finish = () => {
        active.delete(node);
        node.textContent = state.text;
        unlockSize(node, state.lock);
        node.removeAttribute(ATTR.decoding);
    };

    if (prefersReducedMotion()) {
        finish();
        return;
    }

    state.revealing = true;
    let resolved = 0;
    const step = () => {
        resolved++;
        if (resolved >= state.text.length) {
            finish();
            return;
        }
        scramble(node, state.text, resolved);
        state.timer = setTimeout(step, config.decodeRevealStepMs);
    };
    step();
}
