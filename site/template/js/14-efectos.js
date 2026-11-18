// ---- Effects: the nine distortions on the same specimen ----
const FX_MS = 2400;
const SPECIMEN = { seed: 11, kind: 'Círculos' };
const fxGrid = document.getElementById('effects');
const fxTiles = EFFECTS.map(fx => {
    const tile = el('article', 'e-panel fx-tile');
    const specimen = el('div', 'fx-specimen');
    const thumb = sharpCanvas(paintPiece(SPECIMEN));
    thumb.setAttribute('aria-hidden', 'true');
    const word = el('span', 'fx-specimen__word', 'Echorath');
    specimen.append(thumb, word);
    specimen.setAttribute('aria-hidden', 'true');
    const target = fx.variant === 'decode' ? word : specimen;   // decode works on text only

    const how = el('details', 'fx-tile__how');
    const summary = el('summary', '', 'Cómo está hecho');
    summary.appendChild(el('span', 'sr-only', ` ${fx.variant}`));
    const technique = el('p', '', `${fx.what}. ${fx.how}`);
    how.append(summary, technique);
    const play = button('', 'e-btn e-btn--sm fx-tile__play');
    const label = el('span', '', 'Ver efecto');
    play.append(label, el('span', 'fx-tile__timer'));
    play.setAttribute('aria-pressed', 'false');
    play.setAttribute('aria-label', `Ver efecto ${fx.variant}`);
    play.style.setProperty('--fx-ms', `${FX_MS}ms`);

    let timer = 0;
    const stop = () => {
        if (!timer) return;
        clearTimeout(timer);
        timer = 0;
        EchorathUI.ready(target);
        play.setAttribute('aria-pressed', 'false');
    };
    const start = () => {
        stop();
        EchorathUI.load(target, { variant: fx.variant });
        play.setAttribute('aria-pressed', 'true');
        timer = setTimeout(() => { stop(); syncAll(); }, FX_MS);
    };
    play.addEventListener('click', () => { if (timer) stop(); else start(); syncAll(); });

    tile.append(specimen, el('h3', 'fx-tile__name', fx.variant), el('p', 'fx-tile__what', fx.feel), play, how);
    fxGrid.appendChild(tile);
    return { start, stop, playing: () => timer !== 0 };
});
const fxAll = document.getElementById('fx-all');
function syncAll() {
    if (fxAll) fxAll.setAttribute('aria-pressed', String(fxTiles.some(t => t.playing())));
}
if (fxAll) fxAll.addEventListener('click', () => {
    if (fxTiles.some(t => t.playing())) fxTiles.forEach(t => t.stop());
    else fxTiles.forEach(t => t.start());
    syncAll();
});
