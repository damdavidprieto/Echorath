// ---- First screen: a live piece of the series; each press draws another ----
// The first piece of the series: part of the page's look, shown whatever the gallery holds
const heroPiece = { title: 'Repetición 01', seed: 11, kind: 'Círculos' };
const heroRegen = document.getElementById('hero-regen');
const heroCap = document.getElementById('hero-cap');
const heroCanvas = sharpCanvas(paintPiece(heroPiece));
heroCanvas.setAttribute('aria-hidden', 'true');   // the caption describes it
heroRegen.prepend(heroCanvas);
const heroDesc = el('span', 'sr-only');
const captionHero = () => {
    heroCap.textContent = `${heroPiece.title} · semilla ${heroPiece.seed} · ${heroPiece.kind}`;
    heroDesc.textContent = `. ${describe(heroPiece)}`;
    heroCap.appendChild(heroDesc);
};
heroRegen.addEventListener('click', () => {
    heroPiece.title = 'Variación';
    heroPiece.seed = 1 + Math.floor(Math.random() * 9999);
    heroPiece.kind = KINDS[Math.floor(Math.random() * KINDS.length)];
    repaint(heroCanvas);
    captionHero();
    EchorathUI.loadFor(heroRegen, 350, { variant: 'static', reveal: true });
});
const heroLab = document.getElementById('hero-lab');
if (heroLab) heroLab.addEventListener('click', e => {
    e.preventDefault();
    openInLab(heroPiece);
});
captionHero();

// ---- Where to start: one door per kind of work, each with a picture ----
const thumbOf = piece => {
    const canvas = sharpCanvas(paintPiece(piece));
    canvas.setAttribute('aria-hidden', 'true');
    return canvas;
};
const hidden = node => { node.setAttribute('aria-hidden', 'true'); return node; };
const firstText = TEXTS[0];
const DOORS = [
    TRACKS.length && { kicker: `Música · ${plural(TRACKS.length, 'muestra', 'muestras')}`, name: TRACKS[0].release, meta: `Último lanzamiento · ${TRACKS[0].album.split(' · ')[1]}`,
      href: `#musica/${TRACKS[0].slug}`, thumb: () => {
          // A cover reads as a cover when it carries the release's name
          const cover = el('div', 'start__cover');
          cover.append(thumbOf(coverOf(TRACKS[0].release)), hidden(el('span', 'start__label', TRACKS[0].release)));
          return cover;
      } },
    TEXTS.length && { kicker: `Escritura · ${plural(TEXTS.length, 'texto', 'textos')}`, name: firstText.title, meta: `${firstText.kind} · ${firstText.year}`,
      href: `#escritura/${firstText.slug}`, thumb: () => hidden(el('p', 'start__page', firstText.body[0])) },
    PIECES.length && { kicker: `Imágenes · ${plural(PIECES.length, 'pieza', 'piezas')}`, name: 'Serie «Repetición»', meta: String(PIECES[0].year),
      href: `#imagenes/${PIECES[0].slug}`, thumb: () => {
          // Four pieces of the series, so the door is not the same image as the first
          // screen; while the gallery holds fewer, four variations by the same algorithm
          const mosaic = el('div', 'start__mosaic');
          const four = PIECES.length >= 5 ? PIECES.slice(1, 5) : [27, 43, 58, 71].map((seed, k) => ({ seed, kind: KINDS[k + 1] }));
          four.forEach(piece => mosaic.appendChild(thumbOf(piece)));
          return mosaic;
      } },
    EFFECTS.length && { kicker: `Efectos · ${EFFECTS.length} distorsiones`, name: 'La sala de efectos', meta: 'Para verlos en marcha',
      href: '#efectos', thumb: () => hidden(el('span', 'start__fx', 'Echorath')) },
    ALGORITHMS.length && { kicker: `Algoritmos · ${plural(ALGORITHMS.length, 'algoritmo', 'algoritmos')}`, name: 'Cómo está hecha la obra', meta: 'Con su pseudocódigo y su código',
      href: '#algoritmos', thumb: () => hidden(el('code', 'start__code', "repeticion(ctx, w, h, {\n  seed: 11,\n  kind: 'Círculos'\n})")) },
].filter(Boolean);
const startList = document.getElementById('start-list');
if (startList) startList.replaceChildren();   // the placeholders kept the space
if (startList) DOORS.forEach(door => {
    const li = el('li');
    const card = el('a', 'start__card');
    card.href = door.href;
    const thumb = el('div', 'start__thumb');
    thumb.appendChild(door.thumb());
    const body = el('div', 'start__body');
    body.append(el('span', 'start__kicker', door.kicker), el('span', 'start__name', door.name), el('span', 'start__meta', door.meta));
    card.append(thumb, body);
    // Pressing a door to the address already in the bar fires no hashchange
    card.addEventListener('click', e => {
        if (location.hash === door.href && door.href.includes('/')) {
            e.preventDefault();
            route();
        }
    });
    li.appendChild(card);
    startList.appendChild(li);
});
