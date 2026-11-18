// ---- Works viewer: texts and images open with previous/next and their own address ----
// how: 'push' when the visitor opens it here, 'hash' when a link already added the
// history entry, 'load' when the page was opened at the work's address.
// In the first two cases Back closes the work instead of leaving the page.
// Where the visitor left each text during this visit; a text read to the end starts again from the top
const readPlace = (() => {
    let at = {};
    try { at = JSON.parse(sessionStorage.getItem('echorath-read') || '{}'); } catch (e) { /* storage unavailable */ }
    const keep = () => { try { sessionStorage.setItem('echorath-read', JSON.stringify(at)); } catch (e) { /* storage unavailable */ } };
    document.addEventListener('visibilitychange', () => { if (document.hidden) keep(); });
    return {
        get: slug => at[slug] || 0,
        set: (slug, part) => { if (part < 0.02 || part > 0.98) delete at[slug]; else at[slug] = +part.toFixed(3); },
        keep,
    };
})();

function openWork(set, start, how = 'push') {
    const n = set.items.length;
    let index = start;
    const nav = el('div', 'work__nav');
    const steps = el('div', 'e-row');
    const prev = button('← Anterior');
    const next = button('Siguiente →');
    const pos = el('span', 'e-label work__pos');
    const share = button(SHARE_LABEL);
    share.hidden = !shareable;
    steps.append(prev, pos, next);
    steps.hidden = n < 2;
    nav.append(steps, share);
    nav.hidden = n < 2 && !shareable;
    // On paper, a work ends with its address (only where the address can be shared)
    const source = el('p', 'work__source');
    // Says which work is on screen; it lives in the dialog, outside the body that changes
    const live = el('span', 'sr-only');
    live.setAttribute('aria-live', 'polite');

    if (how === 'push') history.pushState(null, '', `#${set.section}/${set.items[start].slug}`);
    let closedByBack = false;
    let handedOff = false;
    const work = EchorathUI.modal({ title: set.items[start].title, body: '', tone: set.tone, size: 'lg', actions: [{ label: 'Cerrar', value: true, variant: 'solid' }] });
    const onBack = () => { closedByBack = true; work.close(); };
    addEventListener('popstate', onBack);
    // A work can pass the visitor on (the viewer's "Abrir en el laboratorio")
    const leave = () => { handedOff = true; work.close(); };
    if (set.wide) work.element.classList.add('is-viewer');
    if (set.className) work.element.classList.add(set.className);
    work.element.appendChild(live);

    // Texts long enough to scroll show a reading bar under the title
    const readBar = el('div', 'read-progress');
    readBar.setAttribute('aria-hidden', 'true');
    readBar.appendChild(el('span'));
    const scroller = work.element.querySelector('.e-modal__body');
    const updateRead = () => {
        const room = scroller.scrollHeight - scroller.clientHeight;
        readBar.hidden = room < 40;
        readBar.style.setProperty('--read', room > 0 ? Math.min(1, scroller.scrollTop / room).toFixed(3) : '0');
    };
    if (set.progress) scroller.addEventListener('scroll', () => {
        updateRead();
        const room = scroller.scrollHeight - scroller.clientHeight;
        if (room > 0) readPlace.set(set.items[index].slug, scroller.scrollTop / room);
    }, { passive: true });

    const show = (i, announce) => {
        index = (i + n) % n;
        const item = set.items[index];
        const focused = nav.contains(document.activeElement) ? document.activeElement : null;
        const view = el('div', 'work');
        view.appendChild(set.render(item, leave));
        (view.querySelector('[data-slot="nav"]') || view).appendChild(nav);
        if (set.progress) view.prepend(readBar);
        work.setTitle(item.title);
        work.setBody(view);
        if (set.progress) scroller.scrollTop = readPlace.get(item.slug) * (scroller.scrollHeight - scroller.clientHeight);
        updateRead();
        // Moving the buttons into the new view drops their focus; give it back
        if (focused) focused.focus();
        pos.textContent = `${index + 1} / ${n}`;
        if (announce && n > 1) live.textContent = `${item.title}, ${index + 1} de ${n}`;
        history.replaceState(null, '', `#${set.section}/${item.slug}`);
        document.title = `${item.title} · ${BASE_TITLE}`;
        source.textContent = shareable ? `${item.title} · Echorath · ${location.href}` : '';
        if (shareable) view.appendChild(source);
    };
    prev.addEventListener('click', () => show(index - 1, true));
    next.addEventListener('click', () => show(index + 1, true));
    share.addEventListener('click', () => shareLink(location.href, document.title));
    const onKey = e => {
        if (e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented || n < 2) return;
        if (e.target.closest && e.target.closest('pre, input, select, textarea, [role="tablist"], canvas[tabindex]')) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1, true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1, true); }
    };
    document.addEventListener('keydown', onKey);
    // A sideways swipe moves to the next or previous image; vertical
    // scrolling and pinch zoom stay with the browser
    if (set.swipe) {
        let from = null;
        scroller.addEventListener('touchstart', e => {
            from = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
        }, { passive: true });
        scroller.addEventListener('touchend', e => {
            if (!from || e.touches.length) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - from.x, dy = t.clientY - from.y;
            from = null;
            if (Math.abs(dx) > 50 && Math.abs(dx) > 2 * Math.abs(dy)) show(index + (dx < 0 ? 1 : -1), true);
        }, { passive: true });
    }
    work.then(() => {
        document.removeEventListener('keydown', onKey);
        if (set.progress) readPlace.keep();
        if (set.openers[index].closest('[hidden]') && set.reveal) set.reveal();
        removeEventListener('popstate', onBack);
        document.title = BASE_TITLE;
        if (handedOff) history.replaceState(null, '', '#algoritmos');
        else if (how === 'load') history.replaceState(null, '', `#${set.section}`);
        else if (!closedByBack) {
            // Drop the entry the work added. Going back moves focus to the page,
            // so hand it back to the work once the browser has done so.
            addEventListener('popstate', () => setTimeout(() => set.openers[index].focus(), 0), { once: true });
            history.back();
        }
        // Back on the page, focus the work the visitor ended on
        set.openers[index].focus();
    });
    show(start, false);
}
