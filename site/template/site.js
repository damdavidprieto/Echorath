// The page's behavior. The generator puts the works shown on this site
// where the content marker is (see site/build.mjs) and writes it as site.js.
// Both scripts load with defer: Echorath UI runs first and is ready by
// DOMContentLoaded.
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // The series' palettes: part of the algorithm that draws the pieces, so it stays with the page
    const PALETTES = [
        ['#0a0a0a', '#00ff41', '#00b8ff', '#ff0033'],
        ['#050505', '#00b8ff', '#e0e0e0', '#ffaa00'],
        ['#0a0a0a', '#ff0033', '#00ffff', '#00ff41'],
        ['#050505', '#ffaa00', '#00b8ff', '#e0e0e0'],
        ['#0a0a0a', '#00ffff', '#00ff41', '#ff0033'],
        ['#050505', '#e0e0e0', '#00ff41', '#00b8ff'],
    ];

    // ---- Content: written by site/build.mjs from site/content (TRACKS, TEXTS,
    // PIECES, ALGORITHMS and EFFECTS), only what the site being built shows ----
    /*@content*/

    // Seeded randomness (mulberry32): each piece renders the same every time
    function rng(seed) {
        let a = seed >>> 0;
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function repeticion(ctx, width, height, { seed, kind }) {
        const size = Math.min(width, height);
        const rand = rng(seed);
        const pal = PALETTES[seed % PALETTES.length];
        const cell = size / 8;

        ctx.fillStyle = pal[0];
        ctx.fillRect(0, 0, size, size);

        const color = () => pal[1 + Math.floor(rand() * 3)];

        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const x = i * cell;
                const y = j * cell;
                const c = color();
                ctx.strokeStyle = c;
                ctx.fillStyle = c;
                ctx.lineWidth = Math.max(2, size / 220);

                switch (kind) {
                    case 'Círculos': {
                        ctx.beginPath();
                        ctx.arc(x + cell / 2, y + cell / 2, cell * (0.1 + rand() * 0.4), 0, Math.PI * 2);
                        ctx.fill();
                        break;
                    }
                    case 'Arcos': {
                        ctx.beginPath();
                        ctx.arc(x, y, cell * (0.3 + rand() * 0.5), 0, Math.PI / 2);
                        ctx.stroke();
                        break;
                    }
                    case 'Retícula': {
                        if (rand() > 0.5) ctx.fillRect(x + cell * 0.2, y + cell * 0.2, cell * 0.6, cell * 0.6);
                        break;
                    }
                    case 'Líneas': {
                        ctx.beginPath();
                        ctx.moveTo(x, y + cell * rand());
                        ctx.lineTo(x + cell, y + cell * rand());
                        ctx.stroke();
                        break;
                    }
                    case 'Bloques': {
                        ctx.fillRect(x, y, cell * (0.3 + rand() * 0.7), cell * (0.3 + rand() * 0.7));
                        break;
                    }
                    default: { // Ondas
                        ctx.beginPath();
                        for (let k = 0; k <= 20; k++) {
                            const px = x + (k / 20) * cell;
                            const py = y + cell / 2 + Math.sin((k / 20) * Math.PI * 2 + rand() * 2) * cell * 0.3;
                            if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                        }
                        ctx.stroke();
                    }
                }
            }
        }
    }

    const KINDS = ['Círculos', 'Arcos', 'Retícula', 'Líneas', 'Bloques', 'Ondas'];
    const KIND_TEXT = {
        'Círculos': 'círculos de tamaños distintos, uno por celda',
        'Arcos': 'cuartos de circunferencia que nacen en la esquina de cada celda',
        'Retícula': 'cuadrados que aparecen en unas celdas y faltan en otras',
        'Líneas': 'segmentos que cruzan cada celda a alturas distintas',
        'Bloques': 'rectángulos de tamaños distintos anclados a la esquina de cada celda',
        'Ondas': 'ondas cortas que atraviesan cada celda',
    };
    const COLOR_NAMES = { '#00ff41': 'verde', '#00b8ff': 'azul', '#ff0033': 'rojo', '#e0e0e0': 'gris claro', '#ffaa00': 'ámbar', '#00ffff': 'cian' };

    // Release covers, drawn by the series' algorithm from the release name until the real ones arrive
    const nameSeed = text => [...text].reduce((h, c) => (Math.imul(h, 31) + c.codePointAt(0)) >>> 0, 7);
    const coverOf = release => { const h = nameSeed(release); return { title: release, seed: 1 + (h % 997), kind: KINDS[h % KINDS.length] }; };

    // Text alternative written from what the algorithm actually draws
    function describe(piece) {
        const [, a, b, c] = PALETTES[piece.seed % PALETTES.length].map(hex => COLOR_NAMES[hex]);
        return `Retícula de 8 × 8 con ${KIND_TEXT[piece.kind]}, en ${a}, ${b} y ${c} sobre negro.`;
    }

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function button(label, className = 'e-btn e-btn--sm') {
        const node = el('button', className, label);
        node.type = 'button';
        return node;
    }

    const slug = text => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    [...TRACKS, ...TEXTS, ...PIECES, ...ALGORITHMS].forEach(work => {
        work.slug = slug(work.title);
        // Old titles a work had, so links shared before a rename still reach it
        work.aka = (work.aka || []).map(slug);
    });
    const isWork = id => work => work.slug === id || work.aka.includes(id);

    const readingTime = item => {
        const minutes = item.body.join(' ').split(/\s+/).length / 200;   // ~200 words per minute
        return minutes < 1 ? 'Menos de 1 min de lectura' : `${Math.round(minutes)} min de lectura`;
    };

    // Inside a frame (the artifact viewer, for one) the address belongs to the
    // frame and nobody else could open it, so links are only offered at the top
    const shareable = window.self === window.top;

    // On phones the system share sheet is the expected way to pass a link on
    const canShare = typeof navigator.share === 'function';
    function shareLink(url, title) {
        if (canShare) navigator.share({ title, url }).catch(() => { /* closed by the visitor */ });
        else copyText(url, 'Enlace copiado');
    }
    const SHARE_LABEL = canShare ? 'Compartir' : 'Copiar enlace';
    const BASE_TITLE = document.title;

    async function copyText(text, title) {
        try {
            await navigator.clipboard.writeText(text);
            EchorathUI.toast(title, text.length > 80 ? '' : text, 'ok');
        } catch (e) {
            EchorathUI.toast('No se pudo copiar', 'Tu navegador no permite copiar desde aquí', 'warn');
        }
    }

    // ---- Canvases drawn at the screen's real pixel density, redrawn when their size changes ----
    const painters = new WeakMap();
    const sharp = new ResizeObserver(entries => entries.forEach(entry => {
        const canvas = entry.target;
        // The device-pixel box is exact where it is reported correctly; the CSS width
        // times devicePixelRatio covers browsers that leave it out or get it wrong
        const box = entry.devicePixelContentBoxSize && entry.devicePixelContentBoxSize[0];
        const px = Math.min(2400, Math.round(Math.max(box ? box.inlineSize : 0, entry.contentRect.width * (window.devicePixelRatio || 1))));
        if (px > 0 && px !== canvas.width) {
            canvas.width = canvas.height = px;
            painters.get(canvas)(canvas);
        }
    }));
    function sharpCanvas(paint) {
        const canvas = document.createElement('canvas');
        painters.set(canvas, paint);
        try { sharp.observe(canvas, { box: 'device-pixel-content-box' }); } catch (e) { sharp.observe(canvas); }
        return canvas;
    }
    const repaint = canvas => painters.get(canvas)(canvas);
    const paintPiece = piece => canvas => repeticion(canvas.getContext('2d'), canvas.width, canvas.height, piece);
    // A work not yet published says so (only the development site has them)
    const STATUS_LABEL = { sample: 'Muestra', draft: 'Borrador', review: 'En revisión' };
    const unpublished = work => Object.hasOwn(STATUS_LABEL, work.status);
    const statusNote = work => unpublished(work) ? ` · ${STATUS_LABEL[work.status]}` : '';
    const statusBadge = work => {
        const badge = el('span', 'e-badge sample-badge', STATUS_LABEL[work.status]);
        badge.dataset.tone = 'warn';
        return badge;
    };
    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

    // ---- Sound: the samples and the synth lab share one engine ----
    let audioCtx = null;
    function audio() {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
    }

    const LEVEL = { sine: 0.22, triangle: 0.18, square: 0.07, sawtooth: 0.08 };

    // One note: an oscillator through a short envelope (20 ms up, 0.5 s down)
    function playNote(ctx, frequency, wave) {
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = wave;
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(LEVEL[wave], t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.52);
    }

    // Loops the pattern one note per step. The pattern is read on every step,
    // so its notes, wave and speed can change while it plays.
    function sequence(pattern, onStep) {
        const ctx = audio();
        let step = 0;
        let timer = 0;
        const stop = () => clearInterval(timer);
        const tick = () => {
            if (step >= pattern.steps) {
                stop();
                pattern.onEnd();
                return;
            }
            const i = step % pattern.notes.length;
            playNote(ctx, pattern.notes[i], pattern.wave);
            onStep(i, step);
            step++;
        };
        const retime = () => {
            clearInterval(timer);
            timer = setInterval(tick, pattern.stepMs);
        };
        tick();
        retime();
        return { stop, retime };
    }

    // ---- Now playing: one sound at a time, and a bar that follows the visitor ----
    const nowBar = document.getElementById('now-bar');
    const nowTitle = nowBar.querySelector('.now-bar__title');
    const nowSub = nowBar.querySelector('.now-bar__sub');
    const nowTime = nowBar.querySelector('.now-bar__time');
    const nowLink = document.getElementById('now-link');
    let nowPlaying = null;   // { title, sub, totalMs?, link?, stop }

    const clock = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
    function setNowTime(ms) {
        if (!nowPlaying) return;
        nowTime.textContent = nowPlaying.totalMs ? `${clock(ms)} / ${clock(nowPlaying.totalMs)}` : clock(ms);
    }
    const nowSaid = document.getElementById('now-said');
    function showNow(info) {
        nowPlaying = info;
        nowSaid.textContent = info ? `Sonando: ${info.title}${info.sub ? `, ${info.sub}` : ''}.` : '';
        nowBar.hidden = !info;
        document.documentElement.classList.toggle('has-now-bar', !!info);
        nowBar.classList.remove('is-timed');
        if (!info) return;
        nowTitle.textContent = info.title;
        nowSub.textContent = info.sub;
        nowLink.hidden = !info.link || !shareable;
        setNowTime(0);
        if (info.totalMs) {
            nowBar.style.setProperty('--now-ms', `${info.totalMs}ms`);
            void nowBar.offsetWidth;   // restart the progress animation
            nowBar.classList.add('is-timed');
        }
        document.documentElement.style.setProperty('--now-h', `${nowBar.offsetHeight}px`);
    }
    const stopSound = () => { if (nowPlaying) nowPlaying.stop(); };
    document.getElementById('now-stop').addEventListener('click', stopSound);
    nowLink.addEventListener('click', () => shareLink(new URL(nowPlaying.link, location.href).href, `${nowPlaying.title} · ${BASE_TITLE}`));
    if (canShare) {
        nowLink.setAttribute('aria-label', 'Compartir');
        nowLink.querySelectorAll('span').forEach(label => { label.textContent = 'Compartir'; });
    }
    // Leaving the tab stops the sound
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopSound(); });

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
        showNow({ title: track.title, sub: track.album, totalMs, link: '#musica/' + track.slug, stop: stopPreview });
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

    // ---- Writing: cards open in the reader ----
    const texts = document.getElementById('texts');
    const TEXT_SET = {
        section: 'escritura', tone: 'info', items: TEXTS, openers: [], progress: true,
        render(item) {
            const article = el('article', 'e-prose');
            article.appendChild(el('p', 'e-prose__meta', `${item.kind} · ${item.year} · ${readingTime(item)}${statusNote(item)}`));
            item.body.forEach(par => article.appendChild(el('p', '', par)));
            return article;
        },
    };
    TEXTS.forEach((item, i) => {
        const cell = el('div', 'e-span-4 fx-cell');
        const card = el('article', 'e-panel');
        card.setAttribute('data-tone', 'info');
        // Always distorted; the distortion stops while the reader is on the card
        card.setAttribute('data-loading', '');
        card.setAttribute('data-distort', 'standard');
        card.setAttribute('data-e-pause-on-hover', '');
        const badges = el('div', 'card-badges');
        badges.appendChild(el('span', 'e-badge', item.kind));
        if (unpublished(item)) badges.appendChild(statusBadge(item));
        card.appendChild(badges);
        card.appendChild(el('h3', 'e-h2', item.title));
        card.lastChild.style.margin = '12px 0 8px';
        card.appendChild(el('p', 'card-text', item.summary));

        const foot = el('div', 'card-foot');
        foot.appendChild(el('span', '', `${item.year} · ${readingTime(item)}`));
        const open = el('button', 'e-btn', 'Leer');
        open.type = 'button';
        open.setAttribute('aria-label', `Leer «${item.title}»`);
        open.setAttribute('data-focus', 'sweep');
        open.setAttribute('data-e-interactive', ''); // usable while an effect plays on the card
        open.addEventListener('click', () => openWork(TEXT_SET, i));
        TEXT_SET.openers.push(open);
        foot.appendChild(open);
        card.appendChild(foot);
        // The picker brings the card's permanent distortion back after each effect
        cell.append(card, EchorathUI.fxPicker(card, { name: `«${item.title}»` }));
        texts.appendChild(cell);
    });

    // The cards move on purpose; one press stops them, and the choice is remembered
    const stillToggle = document.getElementById('still-toggle');
    if (stillToggle) {
        const setStill = still => {
            texts.classList.toggle('is-still', still);
            stillToggle.textContent = still ? 'Reanudar el efecto' : 'Pausar el efecto';
        };
        try { setStill(localStorage.getItem('echorath-still') === '1'); } catch (e) { setStill(false); }
        stillToggle.addEventListener('click', () => {
            const still = !texts.classList.contains('is-still');
            setStill(still);
            try { localStorage.setItem('echorath-still', still ? '1' : '0'); } catch (e) { /* storage unavailable */ }
        });

        // The framework sets aria-busy on loading elements; these cards are decorative and always visible, so drop it.
        window.addEventListener('load', () => {
            texts.querySelectorAll('[aria-busy]').forEach(card => card.removeAttribute('aria-busy'));
        });
    }

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

    // ---- Algorithms: drawn live; «Ver código» opens the pseudocode beside the code ----
    const JS_TOKENS = /(\/\/[^\n]*)|('(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\b(0x[0-9a-fA-F]+|\d+(?:\.\d+)?)\b|\b(const|let|function|return|if|else|for|while|switch|case|break|default|new|of)\b/g;
    function highlight(code, pattern, classes) {
        const out = document.createDocumentFragment();
        let last = 0;
        for (const m of code.matchAll(pattern)) {
            if (m.index > last) out.append(code.slice(last, m.index));
            const group = m.slice(1).findIndex(g => g !== undefined);
            out.append(el('span', classes[group], m[0]));
            last = m.index + m[0].length;
        }
        out.append(code.slice(last));
        return out;
    }
    // Function.prototype.toString keeps the indentation of this script; drop it
    function source(fn) {
        const lines = fn.toString().split('\n');
        const cut = Math.min(...lines.slice(1).filter(l => l.trim()).map(l => l.match(/^ */)[0].length));
        return [lines[0], ...lines.slice(1).map(l => l.slice(Math.min(cut, l.match(/^ */)[0].length)))].join('\n');
    }
    // The code an algorithm shows: its functions as they run, its data as literals
    const literal = value => typeof value === 'string' ? `'${value.replace(/['\\]/g, '\\$&')}'`
        : Array.isArray(value) ? `[${value.map(literal).join(', ')}]` : JSON.stringify(value);
    function codeOf(algo) {
        return Object.entries(algo.code).map(([name, value]) => {
            if (typeof value === 'function') return source(value);
            const body = Array.isArray(value) ? `[\n${value.map(v => `    ${literal(v)},`).join('\n')}\n]` : JSON.stringify(value, null, 4);
            return `const ${name} = ${body};`;
        }).join('\n\n');
    }

    const MODE_LABEL = { seed: 'semilla', animation: 'animación', interactive: 'interactivo' };
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const algos = document.getElementById('algos');
    const ALGO_SET = { section: 'algoritmos', tone: 'ok', items: ALGORITHMS, openers: [], className: 'is-code', render: renderCode };
    const algoCards = ALGORITHMS.map((algo, i) => {
        const card = el('article', 'e-panel lab');
        card.id = `algo-${algo.slug}`;
        card.dataset.tone = ['ok', 'info', 'warn'][i % 3];
        const text = el('div');
        const kicker = el('div', 'lab__kicker');
        kicker.appendChild(el('span', 'e-label', `Algoritmo ${String(i + 1).padStart(2, '0')} · ${MODE_LABEL[algo.mode]}${algo.year ? ` · ${algo.year}` : ''}`));
        if (unpublished(algo)) kicker.appendChild(statusBadge(algo));
        const title = el('h3', 'e-h2 lab__title', algo.title);
        title.id = `algo-${algo.slug}-title`;
        card.setAttribute('aria-labelledby', title.id);
        const actions = el('div', 'e-row lab__primary');
        text.append(kicker, title, el('p', 'lab__hook', algo.summary), actions);

        const input = { ...algo.input, time: 0, pointer: { x: 0.5, y: 0.5 } };
        const canvas = sharpCanvas(c => algo.draw(c.getContext('2d'), c.width, c.height, input));
        const cap = el('p', 'lab__cap');
        cap.id = `algo-${algo.slug}-cap`;
        const out = el('div', 'lab__out');
        out.append(canvas, cap);
        const describeIt = () => {
            canvas.setAttribute('aria-label', algo.alt ? algo.alt(input) : algo.title);
            if (algo.caption) cap.textContent = algo.caption(input);
        };
        canvas.setAttribute('role', 'img');
        let primary = null;

        if (algo.mode === 'seed') {
            primary = button('Otra variación', 'e-btn e-btn--solid');
            primary.addEventListener('click', () => {
                Object.assign(input, algo.vary ? algo.vary() : { seed: 1 + Math.floor(Math.random() * 9999) });
                describeIt();
                repaint(canvas);
                EchorathUI.loadFor(out, 350, { variant: 'static', reveal: true });
            });
        } else if (algo.mode === 'animation') {
            // Runs while on screen and not paused; starts paused when the system asks for less motion
            primary = button('', 'e-btn e-btn--solid');
            let paused = reducedMotion.matches, visible = false, frame = 0, last = 0;
            const tick = now => {
                input.time += Math.min(100, now - last);
                last = now;
                repaint(canvas);
                frame = requestAnimationFrame(tick);
            };
            const sync = () => {
                cancelAnimationFrame(frame);
                frame = 0;
                if (!paused && visible) frame = requestAnimationFrame(now => { last = now; tick(now); });
                primary.textContent = paused ? 'Reproducir' : 'Pausar';
                primary.setAttribute('aria-label', `${paused ? 'Reproducir' : 'Pausar'} ${algo.title}`);
                if (!algo.caption) cap.textContent = paused && reducedMotion.matches && input.time === 0 ? 'En pausa: tu sistema pide reducir el movimiento.' : '';
            };
            primary.addEventListener('click', () => { paused = !paused; sync(); });
            new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(canvas);
            sync();
        } else if (algo.mode === 'interactive') {
            // The pointer, or the arrow keys once the picture has focus
            canvas.tabIndex = 0;
            const hint = el('p', 'lab__cap', 'Mueve el ratón o el dedo sobre la imagen. Con el teclado, selecciónala y usa las flechas.');
            hint.id = `algo-${algo.slug}-hint`;
            canvas.setAttribute('aria-describedby', hint.id);
            out.appendChild(hint);
            const point = e => {
                const r = canvas.getBoundingClientRect();
                input.pointer = { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
                repaint(canvas);
            };
            canvas.addEventListener('pointermove', point);
            canvas.addEventListener('pointerdown', point);
            const KEYS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
            canvas.addEventListener('keydown', e => {
                const move = KEYS[e.key];
                if (!move) return;
                e.preventDefault();
                const step = e.shiftKey ? 0.2 : 0.05;
                input.pointer = { x: Math.min(1, Math.max(0, input.pointer.x + move[0] * step)), y: Math.min(1, Math.max(0, input.pointer.y + move[1] * step)) };
                repaint(canvas);
            });
        }
        const showCode = button('Ver código', 'e-btn');
        showCode.setAttribute('aria-label', `Ver código de ${algo.title}`);
        showCode.addEventListener('click', () => openWork(ALGO_SET, i));
        ALGO_SET.openers.push(showCode);
        if (primary) actions.appendChild(primary);
        actions.appendChild(showCode);
        describeIt();
        card.append(text, out);
        algos.appendChild(card);
        return {
            card, primary: primary || showCode,
            show(values) { Object.assign(input, values); describeIt(); repaint(canvas); },
        };
    });

    // The window: pseudocode and code side by side when there is room, as tabs when not
    const wideCode = matchMedia('(min-width: 900px)');
    function layoutCode(view) {
        const wide = wideCode.matches;
        view.classList.toggle('is-wide', wide);
        view.querySelector('.code-view__tabs').hidden = wide;
        view.querySelectorAll('.code-view__pane').forEach((pane, k) => {
            const tab = view.querySelectorAll('[role="tab"]')[k];
            pane.hidden = !wide && tab.getAttribute('aria-selected') !== 'true';
            if (wide) { pane.removeAttribute('role'); pane.removeAttribute('aria-labelledby'); }
            else { pane.setAttribute('role', 'tabpanel'); pane.setAttribute('aria-labelledby', tab.id); }
        });
    }
    wideCode.addEventListener('change', () => document.querySelectorAll('.code-view').forEach(layoutCode));
    function renderCode(algo) {
        const view = el('div', 'code-view');
        view.appendChild(el('p', 'code-view__meta', `Algoritmo · ${MODE_LABEL[algo.mode]}${algo.year ? ` · ${algo.year}` : ''}${statusNote(algo)}`));
        const tabs = el('div', 'e-tabs code-view__tabs');
        tabs.setAttribute('role', 'tablist');
        tabs.setAttribute('aria-label', `Código de ${algo.title}`);
        const panes = el('div', 'code-view__panes');
        const parts = [
            { key: 'pseudo', label: 'Pseudocódigo', file: 'En castellano', text: algo.pseudo.trim(), copied: 'Pseudocódigo copiado' },
            { key: 'js', label: 'JavaScript', file: `${algo.slug}.js`, text: codeOf(algo), copied: 'Código copiado' },
        ];
        const tabButtons = parts.map((part, k) => {
            const tab = button(part.label, 'e-tab');
            tab.id = `code-${algo.slug}-${part.key}-tab`;
            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-selected', String(k === 0));
            tab.tabIndex = k === 0 ? 0 : -1;
            tabs.appendChild(tab);

            const pane = el('section', `code-view__pane is-${part.key}`);
            const head = el('h3', 'code-view__head', part.label);
            const bar = el('div', 'code__bar');
            const copyIt = button(part.key === 'js' ? 'Copiar código' : 'Copiar pseudocódigo');
            copyIt.addEventListener('click', () => copyText(part.text, part.copied));
            bar.append(el('span', '', part.file), copyIt);
            const pre = el('pre');
            pre.tabIndex = 0;
            pre.setAttribute('aria-label', part.key === 'js' ? `Código JavaScript de ${algo.title}` : `Pseudocódigo de ${algo.title}`);
            const code = el('code');
            if (part.key === 'js') code.appendChild(highlight(part.text, JS_TOKENS, ['tok-c', 'tok-s', 'tok-n', 'tok-k']));
            // Pseudocode wraps on narrow screens: a wrapped line keeps its indentation,
            // and after a label («Círculos: », «paleta ← ») it lines up with the text
            else part.text.split('\n').forEach(line => {
                const words = line.trimStart();
                const hang = (words.match(/^(\S+ ← |[^\s:]+:\s+(?=\S))/) || [''])[0].length;
                const row = el('span', words.startsWith('//') ? 'pseudo-line tok-c' : 'pseudo-line', words || ' ');
                row.style.paddingLeft = `${line.length - words.length + hang}ch`;
                row.style.textIndent = `-${hang}ch`;
                code.appendChild(row);
            });
            pre.appendChild(code);
            const box = el('div', 'code');
            box.append(bar, pre);
            pane.append(head, box);
            panes.appendChild(pane);
            return tab;
        });
        const select = (k, focus) => {
            tabButtons.forEach((tab, j) => {
                tab.setAttribute('aria-selected', String(j === k));
                tab.tabIndex = j === k ? 0 : -1;
            });
            layoutCode(view);
            if (focus) tabButtons[k].focus();
        };
        tabButtons.forEach((tab, k) => {
            tab.addEventListener('click', () => select(k, false));
            tab.addEventListener('keydown', e => {
                const to = { ArrowRight: k + 1, ArrowLeft: k - 1, Home: 0, End: tabButtons.length - 1 }[e.key];
                if (to === undefined) return;
                e.preventDefault();
                select((to + tabButtons.length) % tabButtons.length, true);
            });
        });
        view.append(tabs, panes);
        layoutCode(view);
        return view;
    }

    // An image of the series, or the first screen's, opened in its algorithm
    const seriesCard = algoCards[ALGORITHMS.findIndex(algo => algo.draw === repeticion)];
    function openInLab(piece) {
        if (!seriesCard) return;
        seriesCard.show({ seed: piece.seed, kind: piece.kind });
        seriesCard.card.scrollIntoView({ block: 'start' });
        seriesCard.primary.focus({ preventScroll: true });
        EchorathUI.loadFor(seriesCard.card, 500, { variant: 'scan', reveal: true });
    }

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

    // ---- One address, written once: every "write to me" link takes it from here ----
    // EMAIL comes with the content, from site/content/site.json
    document.querySelectorAll('[data-mail]').forEach(link => {
        const subject = link.dataset.mail;
        link.href = `mailto:${EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
    });
    // A long address breaks after the @ or before a dot, never inside a word
    const addr = document.getElementById('addr');
    if (addr) addr.replaceChildren(...EMAIL.split(/(?<=@)|(?=\.)/).flatMap((part, i) => i ? [document.createElement('wbr'), part] : [part]));

    // ---- Contact ----
    const copy = document.getElementById('copy');
    if (copy) copy.addEventListener('click', async () => {
        const address = document.getElementById('addr').textContent;
        try {
            await navigator.clipboard.writeText(address);
            EchorathUI.toast('Copiado', address, 'ok');
        } catch (e) {
            const range = document.createRange();
            range.selectNodeContents(document.getElementById('addr'));
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            EchorathUI.toast('Selecciónalo', 'Tu navegador no permite copiar desde aquí', 'warn');
        }
    });

    // ---- Effect pickers for the remaining components (each next to its target) ----
    const heroName = document.querySelector('.hero__name');
    heroName.parentNode.appendChild(EchorathUI.fxPicker(heroName, { name: heroName.textContent }));

    document.querySelectorAll('.section__head .e-h2').forEach(h => {
        h.parentNode.appendChild(EchorathUI.fxPicker(h, { name: 'el título ' + h.textContent }));
    });

    const table = document.querySelector('#sobre table');
    if (table) table.after(EchorathUI.fxPicker(table, { name: 'la trayectoria' }));

    const contactPanel = document.querySelector('#contacto .e-panel');
    if (contactPanel) contactPanel.after(EchorathUI.fxPicker(contactPanel, { name: 'el contacto' }));

    // ---- Effects mode: off by default; remembered per viewer ----
    const fxMode = document.getElementById('fx-mode');
    const applyFx = on => document.documentElement.classList.toggle('fx-on', on);
    if (fxMode) try { fxMode.checked = localStorage.getItem('echorath-fx') === '1'; } catch (e) { /* storage unavailable */ }
    if (fxMode) applyFx(fxMode.checked);
    if (fxMode) fxMode.addEventListener('change', () => {
        applyFx(fxMode.checked);
        EchorathUI.toast(
            fxMode.checked ? 'Modo efectos activado' : 'Modo efectos desactivado',
            fxMode.checked ? 'Cada componente muestra un botón "Efectos" para probar sus distorsiones.' : 'Los botones de efectos se han ocultado.',
            fxMode.checked ? 'ok' : 'info'
        );
        try { localStorage.setItem('echorath-fx', fxMode.checked ? '1' : '0'); } catch (e) { /* storage unavailable */ }
    });

    // ---- Current section in the bar ----
    // The current section is the last one whose top has passed 45% of the
    // viewport. At the end of the page the last section wins: Contacto is
    // short and would never reach that line. A section the visitor asked for
    // (the bar, a door, a link) keeps the mark while it is on screen, even
    // where the page cannot scroll it to the top, until they scroll by hand.
    const navLinks = [...document.querySelectorAll('[data-section]')];
    const spySections = ['inicio', 'musica', 'escritura', 'imagenes', 'efectos', 'algoritmos', 'sobre', 'contacto'].map(id => document.getElementById(id)).filter(Boolean);
    const markCurrent = id => navLinks.forEach(link => {
        if (link.dataset.section === id) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
    });
    let spyQueued = false;
    let asked = null, arrived = false;
    document.addEventListener('click', e => {
        const link = e.target.closest && e.target.closest('a[href^="#"]');
        const id = link && link.getAttribute('href').slice(1);
        if (spySections.some(section => section.id === id)) { asked = id; arrived = false; }
    });
    const byHand = () => { asked = null; };
    addEventListener('wheel', byHand, { passive: true });
    addEventListener('touchstart', byHand, { passive: true });
    addEventListener('keydown', e => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key) && !e.target.closest('input, textarea, select, [role="dialog"]')) byHand(); });
    const updateCurrent = () => {
        spyQueued = false;
        const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
        let current = spySections[0];
        for (const section of spySections) if (section.getBoundingClientRect().top <= innerHeight * 0.45) current = section;
        if (asked) {
            // once the section has been on screen, leaving it lets the usual rule back
            const box = document.getElementById(asked).getBoundingClientRect();
            const onScreen = box.top < innerHeight && box.bottom > 80;
            if (onScreen) arrived = true;
            else if (arrived) asked = null;
        }
        markCurrent(asked || (atEnd ? spySections[spySections.length - 1].id : current.id));
    };
    addEventListener('scroll', () => {
        if (!spyQueued) { spyQueued = true; requestAnimationFrame(updateCurrent); }
    }, { passive: true });
    addEventListener('resize', updateCurrent);
    updateCurrent();

    // ---- Section changes distort the target section briefly ----
    document.querySelectorAll('[data-section]').forEach(link => {
        link.addEventListener('click', () => {
            const target = document.getElementById(link.dataset.section);
            if (target) EchorathUI.loadFor(target, 500, { reveal: true });
        });
    });

    // ---- Long lists show their first works; one press shows the rest ----
    // With today's content nothing is hidden; it matters once the catalogue grows.
    function showFirst(container, count, label) {
        if (!container) return () => {};
        const items = [...container.children];
        if (items.length <= count) return () => {};
        items.slice(count).forEach(item => item.setAttribute('hidden', 'until-found'));
        const more = button(label(items.length), 'e-btn more-btn');
        container.after(more);
        const reveal = () => {
            items.forEach(item => { item.hidden = false; });
            more.remove();
        };
        // Find in page, or a link to a passage, found a folded work: open the whole list
        container.addEventListener('beforematch', reveal, { once: true });
        more.addEventListener('click', () => {
            reveal();
            // Focus the first work that was hidden, so keyboard users carry on from there
            const first = items[count].querySelector('button, a');
            if (first) first.focus();
        });
        return reveal;
    }
    const revealTracks = showFirst(list, 4, n => `Ver las ${n} pistas`);
    TEXT_SET.reveal = showFirst(texts, 3, n => `Ver los ${n} textos`);
    IMAGE_SET.reveal = showFirst(gallery, 6, n => `Ver las ${n} imágenes`);
    // Printing, or saving as PDF, takes every work: the folded lists open and
    // their pictures are drawn before the page goes to paper
    addEventListener('beforeprint', () => {
        revealTracks();
        TEXT_SET.reveal();
        IMAGE_SET.reveal();
        document.querySelectorAll('main canvas').forEach(canvas => {
            if (!painters.has(canvas)) return;
            const px = Math.min(2400, Math.round(canvas.getBoundingClientRect().width * (window.devicePixelRatio || 1)));
            if (px > 0 && px !== canvas.width) {
                canvas.width = canvas.height = px;
                repaint(canvas);
            }
        });
    });

    // ---- Addresses of works: #escritura/<texto>, #imagenes/<imagen>, #musica/<pista>, #algoritmos/<algoritmo> ----
    function route(how = 'hash') {
        const [section, id] = decodeURIComponent(location.hash.slice(1)).split('/');
        if (!['escritura', 'imagenes', 'musica', 'algoritmos'].includes(section) || location.hash.indexOf('/') < 0 || document.querySelector('.e-modal-overlay') || !document.getElementById(section)) return;
        const jump = () => document.getElementById(section).scrollIntoView({ block: 'start', behavior: 'instant' });
        // The work is not there (renamed, or gone): its section, and a word about it
        const missing = () => {
            history.replaceState(null, '', `#${section}`);
            jump();
            EchorathUI.toast('No encuentro esa obra', 'Puede que haya cambiado de nombre. Aquí están las demás.', 'warn');
        };
        if (!id) { missing(); return; }
        if (section === 'escritura' || section === 'imagenes' || section === 'algoritmos') {
            const set = { escritura: TEXT_SET, imagenes: IMAGE_SET, algoritmos: ALGO_SET }[section];
            const i = set.items.findIndex(isWork(id));
            if (i < 0) { missing(); return; }
            if (set.openers[i].closest('[hidden]') && set.reveal) set.reveal();
            jump();
            openWork(set, i, how);
        } else if (section === 'musica') {
            const i = TRACKS.findIndex(isWork(id));
            if (i < 0) { missing(); return; }
            if (trackButtons[i].closest('[hidden]')) revealTracks();
            const row = trackButtons[i].closest('.track-row');
            row.scrollIntoView({ block: 'center', behavior: 'instant' });
            trackButtons[i].focus({ preventScroll: true });
            row.classList.add('is-linked');
            setTimeout(() => row.classList.remove('is-linked'), 3000);
        }
    }
    addEventListener('hashchange', () => route('hash'));
    route('load');
});
