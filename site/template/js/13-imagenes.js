// ---- Images: canvas plates, enlarged in the viewer ----
const gallery = document.getElementById('gallery');
const IMAGE_SET = {
    section: 'imagenes', tone: 'sys', items: PIECES, openers: [], wide: true, swipe: true,
    render(piece, leave) {
        const figure = el('figure', 'viewer');
        const big = sharpCanvas(paintPiece(piece));
        big.className = 'dlg-canvas';
        big.setAttribute('role', 'img');
        big.setAttribute('aria-label', `${piece.title}. ${describe(piece)}`);
        const cap = el('figcaption', 'viewer__cap');
        cap.dataset.slot = 'nav';   // previous / next sit with the details
        cap.append(
            el('p', 'viewer__meta', `${piece.year} · Generativa · ${piece.kind} · semilla ${piece.seed}${statusNote(piece)}`),
            el('p', 'viewer__desc', describe(piece)),
        );
        if (seriesCard) {
            const toLab = button('Ver cómo está hecha');
            toLab.addEventListener('click', () => {
                leave();
                requestAnimationFrame(() => openInLab(piece));   // after the viewer hands focus back
            });
            cap.appendChild(toLab);
        }
        if (document.fullscreenEnabled) {
            const full = button(document.fullscreenElement ? 'Salir de pantalla completa' : 'Pantalla completa', 'e-btn e-btn--sm viewer__full');
            full.addEventListener('click', () => {
                if (document.fullscreenElement) document.exitFullscreen();
                else full.closest('.e-modal').requestFullscreen().catch(() => {});
            });
            cap.appendChild(full);
        }
        figure.append(big, cap);
        return figure;
    },
};
document.addEventListener('fullscreenchange', () => {
    document.querySelectorAll('.viewer__full').forEach(b => { b.textContent = document.fullscreenElement ? 'Salir de pantalla completa' : 'Pantalla completa'; });
});
PIECES.forEach((piece, i) => {
    const cell = el('div', 'e-span-4 fx-cell');
    const card = el('article', 'e-panel plate');
    const canvas = sharpCanvas(paintPiece(piece));
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `${piece.title}. ${describe(piece)}`);
    const zoom = el('button', 'plate__zoom');
    zoom.type = 'button';
    zoom.setAttribute('aria-label', 'Ampliar ' + piece.title);
    zoom.appendChild(canvas);
    card.appendChild(zoom);

    const foot = el('div', 'card-foot');
    const name = el('span', 'card-foot__name', piece.title);
    if (unpublished(piece)) name.appendChild(statusBadge(piece));
    foot.append(name, el('span', '', `${piece.year} · ${piece.kind}`));
    card.appendChild(foot);

    zoom.addEventListener('click', () => openWork(IMAGE_SET, i));
    IMAGE_SET.openers.push(zoom);
    cell.append(card, EchorathUI.fxPicker(card, { name: piece.title }));
    gallery.appendChild(cell);
});
