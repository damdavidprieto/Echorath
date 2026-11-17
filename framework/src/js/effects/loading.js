import { ATTR, NOISE_VARIANTS, VARIANTS } from '../core/constants.js';
import { config } from '../core/config.js';
import { resolve } from '../core/dom.js';
import { tone } from '../core/tone.js';
import { startNoise, stopNoise } from './filters.js';
import { canDecode, cancelDecode, startDecode, stopDecode } from './decode.js';
import { unwatch, watch } from './visibility.js';

/**
 * Loading lifecycle:  idle → load() → loading → ready() → reveal → idle
 *
 * Every load() and ready() starts a new generation for its element. A wait()
 * only ends the loading state if nothing newer happened meanwhile, so
 * overlapping calls never cut each other short, and a wait() never ends a
 * loading state that a later ready() + load() started.
 */
const generations = new WeakMap();
const revealTimers = new WeakMap();

function clearReveal(node) {
    clearTimeout(revealTimers.get(node));
    revealTimers.delete(node);
    node.removeAttribute(ATTR.reveal);
}

/**
 * Put an element into its loading distortion.
 * @param {Element|string} target element or selector
 * @param {{ variant?: string }} [opts] variant overrides data-distort
 * @returns {Element|null}
 */
export function load(target, opts = {}) {
    const node = resolve(target);
    if (!node) return null;

    let variant = opts.variant || node.getAttribute(ATTR.distort) || config.defaultVariant;
    if (!VARIANTS.includes(variant)) {
        throw new Error(`EchorathUI: unknown variant "${variant}". Use one of: ${VARIANTS.join(', ')}`);
    }

    if (variant === 'decode' && !canDecode(node)) {
        console.warn('EchorathUI: "decode" only works on text-only elements; using "standard" instead.', node);
        variant = 'standard';
    }

    clearReveal(node);
    // transform has no effect on display: inline, so inline targets become a box
    if (getComputedStyle(node).display === 'inline') node.setAttribute(ATTR.boxed, '');
    node.setAttribute(ATTR.distort, variant);
    node.setAttribute(ATTR.loading, '');
    node.setAttribute('aria-busy', 'true');
    watch(node);   // paused while out of view

    // Switching variant mid-effect releases what the previous one held
    if (NOISE_VARIANTS.includes(variant)) startNoise(node);
    else stopNoise(node);
    if (variant === 'decode') startDecode(node);
    else cancelDecode(node);

    generations.set(node, (generations.get(node) || 0) + 1);
    return node;
}

/**
 * End the loading state. The element plays its reveal unless reveal is false.
 * @param {Element|string} target
 * @param {{ reveal?: boolean, tone?: string }} [opts]
 */
export function ready(target, opts = {}) {
    const node = resolve(target);
    if (!node) return;

    // A manual ready() also retires any wait() still pending on this element
    generations.set(node, (generations.get(node) || 0) + 1);
    node.removeAttribute(ATTR.loading);
    node.removeAttribute(ATTR.boxed);
    node.removeAttribute('aria-busy');
    unwatch(node);
    stopNoise(node);
    stopDecode(node);

    if (opts.tone) tone(node, opts.tone);

    clearReveal(node);
    if (opts.reveal !== false) {
        node.setAttribute(ATTR.reveal, '');
        revealTimers.set(node, setTimeout(() => {
            revealTimers.delete(node);
            node.removeAttribute(ATTR.reveal);
        }, config.revealMs));
    }
}

/**
 * Stay in the loading state while a promise is pending, then end it, unless
 * a newer load() on the same element took over. On rejection the element
 * gets the "danger" tone and the error is rethrown.
 * @template T
 * @param {Element|string} target
 * @param {Promise<T>|T} promise
 * @param {{ variant?: string, reveal?: boolean, tone?: string }} [opts]
 * @returns {Promise<T>}
 */
export function wait(target, promise, opts = {}) {
    const node = load(target, opts);
    const generation = node && generations.get(node);
    const isLatest = () => node && generations.get(node) === generation;

    return Promise.resolve(promise).then(
        value => {
            if (isLatest()) ready(node, opts);
            return value;
        },
        error => {
            if (isLatest()) ready(node, { ...opts, tone: 'danger' });
            throw error;
        },
    );
}

/**
 * Load for a fixed time, then end.
 * @param {Element|string} target
 * @param {number} [ms]
 * @param {{ variant?: string, reveal?: boolean, tone?: string }} [opts]
 * @returns {Promise<void>}
 */
export function loadFor(target, ms = 2000, opts = {}) {
    return wait(target, new Promise(done => setTimeout(done, ms)), opts);
}
