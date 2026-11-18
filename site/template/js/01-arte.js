// The art: the series' palettes and the algorithm that draws its pieces,
// used by the first screen, the gallery, the covers and the algorithm «Repetición»

// The series' palettes: part of the algorithm that draws the pieces, so it stays with the page
const PALETTES = [
    ['#0a0a0a', '#00ff41', '#00b8ff', '#ff0033'],
    ['#050505', '#00b8ff', '#e0e0e0', '#ffaa00'],
    ['#0a0a0a', '#ff0033', '#00ffff', '#00ff41'],
    ['#050505', '#ffaa00', '#00b8ff', '#e0e0e0'],
    ['#0a0a0a', '#00ffff', '#00ff41', '#ff0033'],
    ['#050505', '#e0e0e0', '#00ff41', '#00b8ff'],
];

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
