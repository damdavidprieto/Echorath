// Builds the Echorath site into dist/ from site/template (the page, its
// stylesheet and its script), site/content and site/static, plus the
// framework's built files.
//
//   node site/build.mjs [--mode=dev|prod] [--out=dist]
//
// GitHub Pages publishes both sites as one: production at the root and the
// development site under dev/ (npm run build:pages builds them in that order).
//
// dev  shows every work, each one marked with its state, the notes «En
//      desarrollo» and the status line; search engines are kept out.
// prod shows only what is marked "published"; a section with nothing
//      published is left out, with its links. This is the default, so a
//      missing setting never puts a draft on the public site.
// The mode can also come from the ECHORATH_MODE environment variable.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SITE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SITE, '..');
const FRAMEWORK_DIST = path.join(ROOT, 'framework', 'dist');
const TEMPLATE = path.join(SITE, 'template');

// What the site takes from the framework: the minified files, their maps and the fonts
const FRAMEWORK_FILES = ['echorath-ui.min.css', 'echorath-ui.min.css.map', 'echorath-ui.min.js', 'echorath-ui.min.js.map', 'fonts'];

export const STATUSES = ['sample', 'draft', 'review', 'published'];
const STATUS_LABEL = { sample: 'Muestra', draft: 'Borrador', review: 'En revisión' };

// ---------------------------------------------------------------- reading

const readText = file => fs.readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');

function readJson(file) {
    let data;
    try {
        data = JSON.parse(readText(file));
    } catch (e) {
        throw new Error(`${path.relative(ROOT, file)}: no es un JSON válido (${e.message})`);
    }
    // "$schema" only tells an editor which schema to check the file against
    if (data && typeof data === 'object') delete data.$schema;
    return data;
}

// Files and folders in a content folder, in name order: the name sets the order
// on the page. Numbers count as numbers, so 2-… comes before 10-…
const byName = (a, b) => a.localeCompare(b, 'es', { numeric: true });
function entries(dir, test) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(name => !name.startsWith('.') && test(name)).sort(byName).map(name => path.join(dir, name));
}

function checkStatus(status, where) {
    if (!STATUSES.includes(status)) {
        throw new Error(`${path.relative(ROOT, where)}: el estado "${status}" no existe; usa ${STATUSES.join(', ')}`);
    }
    return status;
}

// ---------------------------------------------------------------- checking

export const KINDS = ['Círculos', 'Arcos', 'Retícula', 'Líneas', 'Bloques', 'Ondas'];
export const VARIANTS = ['standard', 'flicker', 'glitch', 'scan', 'wave', 'shatter', 'warp', 'static', 'decode'];
const LINK = /^(https:\/\/[^\s"<>]+|mailto:[^\s"<>]+)$/;

// What each field must hold, with the words the error uses for it
const FIELD = {
    text: [v => typeof v === 'string' && v.trim() !== '', 'un texto'],
    year: [v => /^\d{4}$/.test(String(v)), 'un año de cuatro cifras'],
    seed: [v => Number.isInteger(v) && v >= 0, 'un número entero'],
    duration: [v => typeof v === 'string' && /^\d+:[0-5]\d$/.test(v), 'una duración como 3:42'],
    notes: [v => Array.isArray(v) && v.length > 0 && v.every(n => typeof n === 'number' && n > 0), 'una lista de frecuencias en hercios'],
    texts: [v => Array.isArray(v) && v.length > 0 && v.every(p => typeof p === 'string' && p.trim() !== ''), 'una lista de párrafos'],
    kind: [v => KINDS.includes(v), `uno de: ${KINDS.join(', ')}`],
    variant: [v => VARIANTS.includes(v), `una de: ${VARIANTS.join(', ')}`],
    link: [v => typeof v === 'string' && LINK.test(v), 'una dirección https:// o mailto:'],
    site: [v => typeof v === 'string' && /^https:\/\/[^\s]+\/$/.test(v), 'una dirección https:// que acabe en /'],
    email: [v => typeof v === 'string' && /^[^\s@"<>]+@[^\s@"<>]+\.[^\s@"<>]+$/.test(v), 'una dirección de correo'],
};

// Checks that `data` has every field of `spec` ({ name: kind }); `where` names
// the file, and `what` the item inside it when there are several
function checkFields(data, spec, where, what = '') {
    for (const [name, kind] of Object.entries(spec)) {
        const [valid, words] = FIELD[kind];
        if (!valid(data[name])) {
            const got = data[name] === undefined ? 'falta' : `vale ${JSON.stringify(data[name])}`;
            throw new Error(`${path.relative(ROOT, where)}: ${what}"${name}" ${got}; tiene que ser ${words}`);
        }
    }
    return data;
}

export const TRACK = { title: 'text', release: 'text', album: 'text', dur: 'duration', notes: 'notes' };
export const TEXT = { kind: 'text', year: 'year', title: 'text', summary: 'text', body: 'texts' };
export const PIECE = { title: 'text', seed: 'seed', kind: 'kind', year: 'year' };
export const EFFECT = { variant: 'variant', feel: 'text', what: 'text', how: 'text' };

// A text: a header between --- lines (key: value, one per line) and paragraphs
// separated by blank lines
function readTextWork(file) {
    const source = readText(file);
    const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!match) throw new Error(`${path.relative(ROOT, file)}: falta la cabecera entre líneas ---`);
    const work = {};
    for (const line of match[1].split('\n')) {
        if (!line.trim()) continue;
        const colon = line.indexOf(':');
        if (colon < 0) throw new Error(`${path.relative(ROOT, file)}: la línea "${line}" no tiene la forma clave: valor`);
        const key = line.slice(0, colon).trim();
        let value = line.slice(colon + 1).trim();
        if (/^-?\d+$/.test(value)) value = Number(value);
        else if (/^[[{]/.test(value)) {
            try {
                value = JSON.parse(value);
            } catch (e) {
                throw new Error(`${path.relative(ROOT, file)}: el valor de "${key}" empieza como una lista o un objeto, pero no es JSON válido (${e.message})`);
            }
        }
        work[key] = value;
    }
    work.body = match[2].split(/\n\s*\n/).map(p => p.trim().replace(/\s*\n\s*/g, ' ')).filter(Boolean);
    return work;
}

function readAlgorithm(dir) {
    const meta = readJson(path.join(dir, 'meta.json'));
    const source = readText(path.join(dir, 'algorithm.js'));
    const at = source.indexOf('export default');
    if (at < 0) throw new Error(`${path.relative(ROOT, dir)}/algorithm.js: falta "export default { … }" con la ficha del algoritmo`);
    const object = source.slice(at + 'export default'.length).trim().replace(/;\s*$/, '');
    if (!object.startsWith('{') || !object.endsWith('}')) {
        throw new Error(`${path.relative(ROOT, dir)}/algorithm.js: después de "export default" va un objeto entre llaves`);
    }
    for (const key of ['title', 'mode', 'draw']) {
        if (!new RegExp(`(^|[{,\\s])${key}\\s*[:,}(]`).test(object)) {
            throw new Error(`${path.relative(ROOT, dir)}/algorithm.js: a la ficha le falta "${key}"`);
        }
    }
    const pseudoFile = path.join(dir, 'pseudo.txt');
    return {
        status: checkStatus(meta.status, path.join(dir, 'meta.json')),
        declarations: source.slice(0, at).trim(),
        object,
        pseudo: fs.existsSync(pseudoFile) ? readText(pseudoFile) : '',
    };
}

export function readContent(contentDir) {
    const work = (file, data, spec) => checkFields({ ...data, status: checkStatus(data.status, file) }, spec, file);

    const siteFile = path.join(contentDir, 'site.json');
    const site = readJson(siteFile);
    checkFields(site.urls || {}, { dev: 'site', prod: 'site' }, siteFile, 'urls.');
    checkStatus(site.email && site.email.status, siteFile);
    checkFields(site.email, { address: 'email' }, siteFile, 'email.');
    (site.links || []).forEach((link, i) => {
        checkStatus(link.status, siteFile);
        checkFields(link, { name: 'text', url: 'link' }, siteFile, `links[${i}].`);
    });
    site.links = site.links || [];

    const sobreFile = path.join(contentDir, 'sobre.json');
    const sobre = readJson(sobreFile);
    checkStatus(sobre.status, sobreFile);
    checkFields(sobre, { lead: 'text', paragraphs: 'texts' }, sobreFile);
    sobre.trayectoria = sobre.trayectoria || [];
    sobre.trayectoria.forEach((row, i) => {
        checkStatus(row.status, sobreFile);
        checkFields(row, { year: 'year', text: 'text' }, sobreFile, `trayectoria[${i}].`);
    });

    const efectosFile = path.join(contentDir, 'efectos.json');
    const efectos = readJson(efectosFile);
    checkStatus(efectos.status, efectosFile);
    if (!Array.isArray(efectos.effects)) throw new Error(`${path.relative(ROOT, efectosFile)}: falta la lista "effects"`);
    efectos.effects.forEach((effect, i) => checkFields(effect, EFFECT, efectosFile, `effects[${i}].`));

    return {
        site, sobre, efectos,
        tracks: entries(path.join(contentDir, 'musica'), n => n.endsWith('.json')).map(f => work(f, readJson(f), TRACK)),
        texts: entries(path.join(contentDir, 'escritura'), n => n.endsWith('.md')).map(f => work(f, readTextWork(f), TEXT)),
        pieces: entries(path.join(contentDir, 'imagenes'), n => n.endsWith('.json')).map(f => work(f, readJson(f), PIECE)),
        algorithms: entries(path.join(contentDir, 'algoritmos'), n => fs.statSync(path.join(contentDir, 'algoritmos', n)).isDirectory()).map(readAlgorithm),
    };
}

// ---------------------------------------------------------------- choosing

// What one site shows: dev everything, prod only what is published
export function select(content, mode) {
    const shown = item => mode === 'dev' || item.status === 'published';
    const tracks = content.tracks.filter(shown);
    const texts = content.texts.filter(shown);
    const pieces = content.pieces.filter(shown);
    const algorithms = content.algorithms.filter(shown);
    const effects = shown(content.efectos) ? content.efectos.effects : [];
    const sobre = shown(content.sobre) ? { ...content.sobre, trayectoria: content.sobre.trayectoria.filter(shown) } : null;
    const email = shown(content.site.email) ? content.site.email : null;
    const links = content.site.links.filter(shown);
    const sections = {
        musica: tracks.length > 0,
        escritura: texts.length > 0,
        imagenes: pieces.length > 0,
        efectos: effects.length > 0,
        algoritmos: algorithms.length > 0,
        sobre: sobre !== null,
        contacto: email !== null,
    };
    return { mode, tracks, texts, pieces, algorithms, effects, sobre, email, links, sections, url: content.site.urls[mode] };
}

// ---------------------------------------------------------------- writing

const escapeHtml = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Data written into the page's script, as JSON
const toScript = value => JSON.stringify(value, null, 4).replace(/\n/g, '\n    ');
const templateLiteral = text => '`' + text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`';
const statusBadgeHtml = item => item.status in STATUS_LABEL
    ? ` <span class="e-badge sample-badge" data-tone="warn">${STATUS_LABEL[item.status]}</span>` : '';
const linkHtml = (link, indent) => `${indent}<a class="e-btn e-btn--sm" href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.name)} <span aria-hidden="true">↗</span><span class="sr-only"> (se abre en otra pestaña)</span></a>`;

// Each algorithm runs in its own scope: its functions can share names with
// another algorithm's, and still reach the page's helpers (PALETTES, rng…)
function algorithmScript(a) {
    const indent = text => text.replace(/\n/g, '\n        ');
    let body = a.object.slice(1, -1).replace(/\s+$/, '');
    if (body && !body.endsWith(',')) body += ',';
    return [
        '(() => {',
        ...(a.declarations ? ['        ' + indent(a.declarations)] : []),
        `        return {\n            status: ${JSON.stringify(a.status)},${indent(body)}`,
        `            pseudo: ${templateLiteral(a.pseudo)},`,
        '        };',
        '    })()',
    ].join('\n');
}

function scriptContent(view) {
    const algorithms = view.algorithms.map(algorithmScript);
    return [
        `const TRACKS = ${toScript(view.tracks)};`,
        `    const TEXTS = ${toScript(view.texts)};`,
        `    const PIECES = ${toScript(view.pieces)};`,
        `    const ALGORITHMS = [${algorithms.length ? '\n    ' + algorithms.join(',\n    ') + ',\n    ' : ''}];`,
        `    const EFFECTS = ${toScript(view.effects)};`,
        `    const EMAIL = ${JSON.stringify(view.email ? view.email.address : '')};`,
    ].join('\n');
}

// <!--@if a|b--> … <!--@end--> keeps its content when any condition holds;
// innermost blocks first, so they can nest. <!--# … --> is a note for whoever
// edits the template and never reaches the page.
const GONE = '\u0001';
function applyConditions(html, holds) {
    html = html.replace(/<!--#[\s\S]*?-->/g, GONE);
    const block = /<!--@if ([^>]+?)-->((?:(?!<!--@if )[\s\S])*?)<!--@end-->/;
    let match;
    while ((match = html.match(block))) {
        const keep = match[1].split('|').some(condition => {
            if (!(condition in holds)) throw new Error(`plantilla: condición desconocida "${condition}"`);
            return holds[condition];
        });
        html = html.slice(0, match.index) + (keep ? match[2] : GONE) + html.slice(match.index + match[0].length);
    }
    if (html.includes('<!--@if') || html.includes('<!--@end')) throw new Error('plantilla: hay un <!--@if--> sin cerrar o un <!--@end--> de más');
    // A line that held only a removed block goes with it, and so does the blank line after it
    return html.replace(new RegExp(`^[ \\t]*${GONE}+[ \\t]*\\n(?:[ \\t]*\\n)?`, 'gm'), '').replaceAll(GONE, '');
}

export function render(template, view) {
    const s = view.sections;
    const holds = {
        dev: view.mode === 'dev',
        start: s.musica || s.escritura || s.imagenes || s.efectos || s.algoritmos,
        menu: Object.values(s).some(Boolean),
        links: view.links.length > 0,
        trayectoria: Boolean(view.sobre && view.sobre.trayectoria.length),
        ...Object.fromEntries(Object.entries(s).map(([id, on]) => [`section:${id}`, on])),
    };
    let html = applyConditions(template, holds);
    const replace = (marker, value) => {
        if (!html.includes(marker)) return;
        html = html.split(marker).join(value);
    };
    replace('{{SITE_URL}}', escapeHtml(view.url));
    replace('{{EMAIL}}', view.email ? escapeHtml(view.email.address) : '');
    replace('{{FEATURE_LABEL}}', view.tracks.length ? escapeHtml(`Escuchar «${view.tracks[0].title}»`) : '');
    replace('<!--@sobre:text-->', view.sobre ? [
        `                <p class="about__lead">${escapeHtml(view.sobre.lead)}</p>`,
        ...view.sobre.paragraphs.map(p => `                <p class="about__p">${escapeHtml(p)}</p>`),
    ].join('\n') : '');
    replace('<!--@sobre:rows-->', view.sobre ? view.sobre.trayectoria.map(row =>
        `                        <tr><td>${escapeHtml(row.year)}</td><td>${escapeHtml(row.text)}${statusBadgeHtml(row)}</td></tr>`).join('\n') : '');
    replace('<!--@links:contact-->', view.links.map(l => linkHtml(l, '                ')).join('\n'));
    replace('<!--@links:footer-->', view.links.map(l => linkHtml(l, '        ')).join('\n'));
    const left = html.match(/\{\{[A-Z_]+\}\}|<!--@[a-z:]+-->/);
    if (left) throw new Error(`plantilla: queda sin rellenar ${left[0]}`);
    return html;
}

// The page's script: the files in js/, in the order of their numbers, inside
// one DOMContentLoaded handler, so they share one scope as a single file
// would. Both scripts load with defer: Echorath UI runs first
export function bundleJs(dir) {
    const files = fs.readdirSync(dir).filter(name => name.endsWith('.js')).sort(byName);
    const wrong = files.filter(name => !/^\d{2}-[a-z0-9-]+\.js$/.test(name));
    if (wrong.length) throw new Error(`js/: ${wrong.join(', ')} no empieza por dos cifras y un guion (01-arte.js)`);
    const indent = text => text.replace(/^(?=.)/gm, '    ');
    const parts = files.map(name => `    // ==== js/${name} ====\n${indent(readText(path.join(dir, name)).trimEnd())}`);
    return [
        '// Echorath · the page\'s script, joined from site/template/js by site/build.mjs',
        "document.addEventListener('DOMContentLoaded', () => {",
        "    'use strict';",
        '',
        parts.join('\n\n'),
        '});',
        '',
    ].join('\n');
}

// The page's script with this site's works in it
export function renderScript(source, view) {
    if (source.split('/*@content*/').length !== 2) throw new Error('site.js: tiene que llevar /*@content*/ una sola vez');
    return source.replace('/*@content*/', () => scriptContent(view));
}

// The page's stylesheet: css/index.css and the files it imports, in its
// order, as one minified file. Every file in css/ has to be imported, so a
// new part cannot be forgotten
export function bundleCss(dir) {
    const used = new Set();
    const inline = name => {
        if (used.has(name)) throw new Error(`css/${name}: se importa dos veces`);
        used.add(name);
        const file = path.join(dir, name);
        if (!fs.existsSync(file)) throw new Error(`css/${name}: no existe`);
        return readText(file).replace(/@import\s+"([^"]+)";/g, (_, inner) => inline(inner));
    };
    const css = inline('index.css');
    const missing = fs.readdirSync(dir).filter(name => name.endsWith('.css') && !used.has(name));
    if (missing.length) throw new Error(`css/index.css: falta importar ${missing.join(', ')}`);
    return minifyCss(css);
}

// Comments out, and no space where CSS does not need it. Conservative: spaces
// inside values (calc(), grid areas, strings) are kept
export const minifyCss = css => css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,>])\s*/g, '$1')
    .replace(/: /g, ':')
    .replace(/;}/g, '}')
    .trim() + '\n';

// {{ASSET:name}} becomes name?v=<hash of its content>: a changed file gets a
// new address, so no browser keeps an old copy
function stampAssets(html, outDir) {
    return html.replace(/\{\{ASSET:([^}]+)\}\}/g, (_, name) => {
        const file = path.join(outDir, name);
        if (!fs.existsSync(file)) throw new Error(`plantilla: el recurso ${name} no existe`);
        const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 10);
        return `${name}?v=${hash}`;
    });
}

// The output folder is emptied first, so it can never be the repository, a
// folder that holds it, or a folder inside site/
function guardOutDir(outDir) {
    const out = path.resolve(outDir);
    const within = (child, parent) => {
        const rel = path.relative(parent, child);
        return !rel.startsWith('..') && !path.isAbsolute(rel);
    };
    const holds = folder => within(folder, out);
    const inside = folder => within(out, folder);
    if (holds(ROOT) || inside(SITE) || out === path.parse(out).root) {
        throw new Error(`la carpeta de salida ${out} no vale: se vacía antes de construir y contiene el proyecto o está dentro de site/`);
    }
}

function copyInto(from, to) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.cpSync(from, to, { recursive: true });
}

export function build({ mode = 'prod', contentDir = path.join(SITE, 'content'), outDir = path.join(ROOT, 'dist') } = {}) {
    if (mode !== 'dev' && mode !== 'prod') throw new Error(`modo "${mode}" desconocido: usa dev o prod`);
    const view = select(readContent(contentDir), mode);
    const html = render(readText(path.join(TEMPLATE, 'index.html')), view);
    const script = renderScript(bundleJs(path.join(TEMPLATE, 'js')), view);
    const css = bundleCss(path.join(TEMPLATE, 'css'));

    // GitHub Pages answers any missing address with the same 404 page, at that
    // address: its links start from the site's base path, not from where it is
    const base = new URL(view.url).pathname;
    const notFound = readText(path.join(TEMPLATE, '404.html')).split('{{BASE}}').join(escapeHtml(base));
    const own = new Set([...FRAMEWORK_FILES, 'site.css', 'site.js']);
    for (const [, name] of `${html}${notFound}`.matchAll(/\{\{ASSET:([^}]+)\}\}/g)) {
        if (!own.has(name)) throw new Error(`plantilla: el recurso ${name} no existe`);
    }

    // Everything that can fail is done above: a mistake never leaves the
    // output folder half written
    guardOutDir(outDir);
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });
    for (const name of fs.readdirSync(path.join(SITE, 'static'))) copyInto(path.join(SITE, 'static', name), path.join(outDir, name));
    for (const name of FRAMEWORK_FILES) copyInto(path.join(FRAMEWORK_DIST, name), path.join(outDir, name));
    fs.writeFileSync(path.join(outDir, 'site.css'), css);
    fs.writeFileSync(path.join(outDir, 'site.js'), script);
    fs.writeFileSync(path.join(outDir, 'index.html'), stampAssets(html, outDir));
    fs.writeFileSync(path.join(outDir, '404.html'), stampAssets(notFound, outDir));
    return view;
}

// ---------------------------------------------------------------- command line

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
    const arg = name => (process.argv.find(a => a.startsWith(`--${name}=`)) || '').split('=')[1];
    const mode = arg('mode') || process.env.ECHORATH_MODE || 'prod';
    const outDir = path.resolve(arg('out') || path.join(ROOT, 'dist'));
    try {
        const view = build({ mode, outDir });
        const count = { musica: view.tracks.length, escritura: view.texts.length, imagenes: view.pieces.length, algoritmos: view.algorithms.length };
        const on = Object.entries(view.sections).filter(([, v]) => v).map(([k]) => k);
        console.log(`Echorath · ${mode === 'dev' ? 'desarrollo' : 'producción'} → ${path.relative(process.cwd(), outDir) || '.'}`);
        console.log(`  obras: ${Object.entries(count).map(([k, n]) => `${k} ${n}`).join(', ')}`);
        console.log(`  secciones: ${on.length ? on.join(', ') : 'ninguna (solo la portada)'}`);
    } catch (e) {
        console.error(`No se ha podido construir la web: ${e.message}`);
        process.exit(1);
    }
}
