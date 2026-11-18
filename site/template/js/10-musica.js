// ---- Music: tracks with synthesized previews ----
const list = document.getElementById('tracks');
const trackButtons = [];
let trackPlaying = null; // { index, seq, row, button }

// A sample plays four rounds of its pattern (about 12 s), then stops on its own
const SAMPLE_ROUNDS = 4;
const STEP_MS = 380;
const featurePlay = document.getElementById('feature-play');
function syncFeature() {
    if (!featurePlay) return;
    const on = trackPlaying && trackPlaying.index === 0;
    featurePlay.textContent = on ? 'Detener' : `Escuchar «${TRACKS[0].title}»`;
}

function stopPreview() {
    if (!trackPlaying) return;
    trackPlaying.seq.stop();
    trackPlaying.button.textContent = 'Escuchar muestra';
    trackPlaying.button.setAttribute('aria-label', 'Escuchar muestra de ' + TRACKS[trackPlaying.index].title);
    trackPlaying.row.removeAttribute('data-tone');
    trackPlaying.row.classList.remove('is-playing');
    trackPlaying.row.querySelector('.track-row__live').hidden = true;
    trackPlaying = null;
    showNow(null);
    syncFeature();
}

function startPreview(index, row, btn) {
    stopSound();
    const track = TRACKS[index];
    const steps = track.notes.length * SAMPLE_ROUNDS;
    const totalMs = steps * STEP_MS;
    showNow({ title: track.title, sub: track.album, totalMs, link: pageOf('musica', track), stop: stopPreview });
    const seq = sequence({ notes: track.notes, wave: 'triangle', stepMs: STEP_MS, steps, onEnd: stopPreview }, (i, step) => setNowTime(step * STEP_MS));
    trackPlaying = { index, seq, row, button: btn };
    row.style.setProperty('--track-ms', `${totalMs}ms`);
    btn.textContent = 'Detener';
    btn.setAttribute('aria-label', 'Detener ' + track.title);
    row.setAttribute('data-tone', 'ok');
    row.classList.add('is-playing');
    row.querySelector('.track-row__live').hidden = false;
    syncFeature();
    EchorathUI.loadFor(row, 700, { variant: 'glitch', reveal: true });
}

if (featurePlay) featurePlay.addEventListener('click', () => trackButtons[0].click());

TRACKS.forEach((track, i) => {
    const item = el('li', 'fx-cell');
    const row = el('div', 'e-panel track-row');

    const cover = sharpCanvas(paintPiece(coverOf(track.release)));
    cover.className = 'track-row__cover';
    cover.setAttribute('aria-hidden', 'true');

    const title = el('div', 'track-row__title', track.title);
    title.appendChild(el('small', '', track.album));
    if (unpublished(track)) title.appendChild(statusBadge(track));
    const live = el('span', 'e-badge track-row__live', 'Sonando');
    live.setAttribute('data-tone', 'ok');
    live.hidden = true;
    title.appendChild(live);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 200 28');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const rand = rng(100 + i);
    for (let x = 0; x < 200; x += 3) {
        const h = 4 + rand() * 22;
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', (28 - h) / 2);
        rect.setAttribute('width', 2);
        rect.setAttribute('height', h);
        rect.setAttribute('fill', 'currentColor');
        svg.appendChild(rect);
    }

    const dur = el('span', 'track-row__dur', track.dur);

    const btn = el('button', 'e-btn', 'Escuchar muestra');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Escuchar muestra de ' + track.title);
    btn.setAttribute('data-focus', 'glitch');
    btn.setAttribute('data-e-interactive', ''); // stays clickable while the row distorts
    btn.addEventListener('click', () => {
        if (trackPlaying && trackPlaying.index === i) stopPreview();
        else startPreview(i, row, btn);
    });
    trackButtons.push(btn);

    row.append(cover, title, svg, dur, btn, el('span', 'track-row__progress'));
    item.append(row, EchorathUI.fxPicker(row, { name: track.title }));
    list.appendChild(item);
});
