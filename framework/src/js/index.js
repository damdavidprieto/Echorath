/**
 * Echorath UI · runtime entry point
 *
 * Builds:
 *   dist/echorath-ui.js       IIFE, exposes window.EchorathUI
 *   dist/echorath-ui.esm.js   ES module with named exports
 *
 * Auto-init runs on DOMContentLoaded unless the <html> element carries
 * data-e-manual; then call init() yourself.
 */
import { ATTR, VARIANTS, VERSION } from './core/constants.js';
import { configure } from './core/config.js';
import { tone } from './core/tone.js';
import { injectFilters } from './effects/filters.js';
import { load, loadFor, ready, wait } from './effects/loading.js';
import { watchAll } from './effects/visibility.js';
import { initHeaders } from './components/header.js';
import { initTabs } from './components/tabs.js';
import { toast } from './components/toast.js';
import { modal } from './components/modal.js';
import { fxPicker } from './components/fxpicker.js';

/** Distortion names, in documented order. */
export const variants = VARIANTS.slice();

/**
 * Prepare a document or subtree: inject the SVG filters, wire headers and
 * tabs, and start any element authored with data-loading. From then on any
 * distortion pauses while it is out of view.
 * @param {ParentNode} [root]
 */
export function init(root = document) {
    injectFilters();
    watchAll();
    initHeaders(root);
    initTabs(root);
    root.querySelectorAll(`[${ATTR.loading}]`).forEach(node => load(node));
}

function autoInit() {
    if (document.documentElement.hasAttribute(ATTR.manual)) return;
    init();
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }
}

export {
    VERSION as version,
    configure,
    load,
    ready,
    wait,
    loadFor,
    tone,
    initHeaders,
    initTabs,
    toast,
    modal,
    fxPicker,
};
