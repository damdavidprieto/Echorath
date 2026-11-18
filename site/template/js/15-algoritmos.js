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
