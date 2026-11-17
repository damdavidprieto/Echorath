import { ATTR, TONES } from './constants.js';
import { resolve } from './dom.js';

/**
 * Set an element's tone. Unknown names fall back to "info".
 * @param {Element|string} target
 * @param {string} name ok | info | warn | danger | sys | off (and aliases)
 */
export function tone(target, name) {
    const node = resolve(target);
    if (!node) return;
    node.setAttribute(ATTR.tone, TONES[name] || 'info');
}
