import { ATTR } from '../core/constants.js';

/**
 * A distortion keeps costing the same while its element is out of view: a
 * permanent effect kept a phone's main thread busy wherever the visitor was
 * on the page. Every loading element is watched; while it is out of view it
 * carries data-e-offscreen, which pauses its CSS animation (distortions.css)
 * and its share of the noise and decode loops. Without IntersectionObserver
 * nothing is watched and everything keeps running, as before.
 *
 * load() watches the elements it starts. watchAll() also catches the ones
 * that get data-loading some other way, such as content a page keeps
 * distorted on purpose (data-e-pause-on-hover) and builds after init().
 */

const listeners = new Set();
let observer = null;
let mutations = null;

function getObserver() {
    if (!observer && typeof IntersectionObserver === 'function') {
        observer = new IntersectionObserver(entries => {
            for (const entry of entries) {
                entry.target.toggleAttribute(ATTR.offscreen, !entry.isIntersecting);
                if (entry.isIntersecting) listeners.forEach(fn => fn(entry.target));
            }
        }, { rootMargin: '100px 0px' });   // resume a little before it shows
    }
    return observer;
}

/** Start watching a loading element. */
export function watch(node) {
    const io = getObserver();
    if (io) io.observe(node);
}

/** Stop watching it, and drop the attribute. */
export function unwatch(node) {
    if (observer) observer.unobserve(node);
    node.removeAttribute(ATTR.offscreen);
}

/** Watch every element with data-loading under the document, now and later. */
export function watchAll() {
    if (mutations || typeof MutationObserver !== 'function' || !getObserver()) return;
    const scan = node => {
        if (node.nodeType !== 1) return;
        if (node.hasAttribute(ATTR.loading)) watch(node);
        node.querySelectorAll(`[${ATTR.loading}]`).forEach(watch);
    };
    mutations = new MutationObserver(records => {
        for (const record of records) {
            if (record.type === 'childList') record.addedNodes.forEach(scan);
            else if (record.target.hasAttribute(ATTR.loading)) watch(record.target);
            else unwatch(record.target);
        }
    });
    mutations.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: [ATTR.loading] });
    scan(document.documentElement);
}

/** True while the element is out of view. */
export function isOffscreen(node) {
    return node.hasAttribute(ATTR.offscreen);
}

/** Call fn(element) whenever a watched element comes back into view. */
export function onVisible(fn) {
    listeners.add(fn);
}
