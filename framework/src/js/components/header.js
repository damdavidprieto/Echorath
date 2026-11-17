import { ATTR, CSS_VAR, MEDIA, SELECTOR, STATE_CLASS } from '../core/constants.js';

const bound = new WeakSet();
const DEFAULT_CLOSE_LABEL = 'Cerrar';

/** Rects of the children that take space (the hidden toggle does not). */
function visibleRects(parent) {
    return [...parent.children]
        .map(child => child.getBoundingClientRect())
        .filter(rect => rect.width > 0 && rect.height > 0);
}

/** True when every rect starts above the bottom of the first one: a single row. */
function inOneRow(rects) {
    return rects.length === 0 || rects.every(rect => rect.top < rects[0].bottom);
}

/**
 * Wire every .e-header under root. Headers already wired are skipped.
 *
 * - Keeps --e-header-offset on <html> equal to the header height, so anchor
 *   links scroll their target clear of the bar.
 * - Menu, when the header has a .e-header__toggle: the toggle opens and
 *   closes the nav; choosing a link or button inside it, or pressing Escape,
 *   closes it. The toggle's own text is the "open" label; data-close-label
 *   sets the label shown while open (default "Cerrar").
 * - The bar folds into that menu (.is-compact) whenever the brand and the
 *   nav no longer fit in one row, at any width. Below 640px the CSS does it
 *   on its own, so it also works without JavaScript.
 * @param {ParentNode} [root]
 */
export function initHeaders(root = document) {
    root.querySelectorAll(SELECTOR.header).forEach(header => {
        if (bound.has(header)) return;
        bound.add(header);

        const updateOffset = () => {
            if (!header.isConnected) return;   // a removed header reports 0px; it must not clear the offset
            const height = Math.round(header.getBoundingClientRect().height);
            document.documentElement.style.setProperty(CSS_VAR.headerOffset, `${height}px`);
        };
        updateOffset();
        if (typeof ResizeObserver === 'function') new ResizeObserver(updateOffset).observe(header);

        const toggle = header.querySelector(SELECTOR.headerToggle);
        if (!toggle) return;
        const controls = toggle.getAttribute('aria-controls');
        const nav = (controls && document.getElementById(controls)) || header.querySelector(SELECTOR.headerNav);
        if (!nav) return;

        const openLabel = toggle.textContent;
        const closeLabel = toggle.getAttribute(ATTR.closeLabel) || DEFAULT_CLOSE_LABEL;

        const setOpen = open => {
            toggle.setAttribute('aria-expanded', String(open));
            toggle.textContent = open ? closeLabel : openLabel;
            nav.classList.toggle(STATE_CLASS.open, open);
            // Measure now: a link click scrolls right after the menu closes,
            // before the ResizeObserver would report the new height.
            updateOffset();
        };

        setOpen(false);

        toggle.addEventListener('click', () => {
            setOpen(toggle.getAttribute('aria-expanded') !== 'true');
        });

        nav.addEventListener('click', e => {
            if (e.target.closest('a, button')) setOpen(false);
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && nav.classList.contains(STATE_CLASS.open)) {
                setOpen(false);
                toggle.focus();
            }
        });

        // Fold into the menu when the full bar no longer fits in one row
        const phone = typeof matchMedia === 'function' ? matchMedia(MEDIA.compactHeader) : null;
        const fit = () => {
            const wasCompact = header.classList.contains(STATE_CLASS.compact);
            header.classList.remove(STATE_CLASS.compact);
            if (phone && phone.matches) return;   // the CSS layout for phones
            const fits = inOneRow(visibleRects(header)) && inOneRow(visibleRects(nav));
            header.classList.toggle(STATE_CLASS.compact, !fits);
            if (wasCompact && fits && nav.classList.contains(STATE_CLASS.open)) setOpen(false);
            updateOffset();
        };

        let queued = false;
        const queueFit = () => {
            if (queued) return;
            queued = true;
            requestAnimationFrame(() => {
                queued = false;
                fit();
            });
        };

        fit();
        addEventListener('resize', queueFit);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueFit);
        // Links added or removed later change the width the nav needs
        if (typeof MutationObserver === 'function') new MutationObserver(queueFit).observe(nav, { childList: true, subtree: true });
    });
}
