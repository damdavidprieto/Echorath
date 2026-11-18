// Small helpers every part uses: building elements, reading time, sharing
// and copying, and canvases drawn at the screen's real pixel density

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
