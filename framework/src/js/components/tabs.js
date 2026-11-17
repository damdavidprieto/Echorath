import { ATTR, STATE_CLASS } from '../core/constants.js';
import { resolve } from '../core/dom.js';

const bound = new WeakSet();

/**
 * Wire every [data-tabs] group under root: click to select, ArrowLeft and
 * ArrowRight to move. Groups already wired are skipped, so it is safe to
 * call again after adding markup.
 * @param {ParentNode} [root]
 */
export function initTabs(root = document) {
    root.querySelectorAll(`[${ATTR.tabs}]`).forEach(group => {
        if (bound.has(group)) return;
        bound.add(group);

        const tabs = [...group.querySelectorAll('[role="tab"]')];

        const select = (tab, focus) => {
            tabs.forEach(t => {
                const selected = t === tab;
                t.setAttribute('aria-selected', String(selected));
                t.tabIndex = selected ? 0 : -1;

                const panel = resolve(t.getAttribute(ATTR.tabTarget));
                if (!panel) return;
                panel.hidden = !selected;
                if (selected) {
                    panel.classList.remove(STATE_CLASS.entering);
                    void panel.offsetWidth; // restart the enter animation
                    panel.classList.add(STATE_CLASS.entering);
                }
            });
            if (focus) tab.focus();
        };

        tabs.forEach((tab, i) => {
            tab.addEventListener('click', () => select(tab, false));
            tab.addEventListener('keydown', e => {
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                e.preventDefault();
                const next = e.key === 'ArrowRight'
                    ? (i + 1) % tabs.length
                    : (i - 1 + tabs.length) % tabs.length;
                select(tabs[next], true);
            });
        });

        const initial = tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];
        if (initial) select(initial, false);
    });
}
