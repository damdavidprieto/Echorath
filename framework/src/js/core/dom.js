/**
 * Resolve an element or a selector to an element.
 * @param {Element|string|null|undefined} target
 * @returns {Element|null}
 */
export function resolve(target) {
    if (!target) return null;
    if (typeof target === 'string') return document.querySelector(target);
    return target;
}

/**
 * Create an element with attributes and plain-text content.
 * Text is always set with textContent, never parsed as HTML.
 * @param {string} tag
 * @param {Record<string, string|null|undefined>} [attrs]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
export function create(tag, attrs = {}, text = '') {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (value !== undefined && value !== null) node.setAttribute(key, value);
    }
    if (text) node.textContent = text;
    return node;
}
