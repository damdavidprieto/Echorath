// Builds the Echorath site into dist/ from site/template, site/content and
// site/static, plus the framework's built files.
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

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SITE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SITE, '..');
const FRAMEWORK_DIST = path.join(ROOT, 'framework', 'dist');

export const STATUSES = ['sample', 'draft', 'review', 'published'];
const STATUS_LABEL = { sample: 'Muestra', draft: 'Borrador', review: 'En revisión' };

// ---------------------------------------------------------------- reading

const readText = file => fs.readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');

function readJson(file) {
    try {
        return JSON.parse(readText(file));
    } catch (e) {
        throw new Error(`${path.relative(ROOT, file)}: no es un JSON válido (${e.message})`);
    }
}

// Files and folders in a content folder, in name order: the name sets the order on the page
function entries(dir, test) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(name => !name.startsWith('.') && test(name)).sort().map(name => path.join(dir, name));
}

function checkStatus(status, where) {
    if (!STATUSES.includes(status)) {
        throw new Error(`${path.relative(ROOT, where)}: el estado "${status}" no existe; usa ${STATUSES.join(', ')}`);
    }
    return status;
}

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
        else if (/^[[{"]/.test(value)) value = JSON.parse(value);
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
    const pseudoFile = path.join(dir, 'pseudo.txt');
    return {
        status: checkStatus(meta.status, path.join(dir, 'meta.json')),
        declarations: source.slice(0, at).trim(),
        object,
        pseudo: fs.existsSync(pseudoFile) ? readText(pseudoFile) : '',
    };
}

export function readContent(contentDir) {
    const work = (file, data) => ({ ...data, status: checkStatus(data.status, file) });
    const site = readJson(path.join(contentDir, 'site.json'));
    checkStatus(site.email.status, path.join(contentDir, 'site.json'));
    site.links.forEach(link => checkStatus(link.status, path.join(contentDir, 'site.json')));
    const sobre = readJson(path.join(contentDir, 'sobre.json'));
    checkStatus(sobre.status, path.join(contentDir, 'sobre.json'));
    sobre.trayectoria.forEach(row => checkStatus(row.status, path.join(contentDir, 'sobre.json')));
    const efectos = readJson(path.join(contentDir, 'efectos.json'));
    checkStatus(efectos.status, path.join(contentDir, 'efectos.json'));
    return {
        site, sobre, efectos,
        tracks: entries(path.join(contentDir, 'musica'), n => n.endsWith('.json')).map(f => work(f, readJson(f))),
        texts: entries(path.join(contentDir, 'escritura'), n => n.endsWith('.md')).map(f => work(f, readTextWork(f))),
        pieces: entries(path.join(contentDir, 'imagenes'), n => n.endsWith('.json')).map(f => work(f, readJson(f))),
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
// Data written into the page's script: JSON, with nothing that could close the <script>
const toScript = value => JSON.stringify(value, null, 4).replace(/</g, '\\u003c').replace(/\n/g, '\n    ');
const templateLiteral = text => '`' + text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`';
const statusBadgeHtml = item => item.status in STATUS_LABEL
    ? ` <span class="e-badge sample-badge" data-tone="warn">${STATUS_LABEL[item.status]}</span>` : '';
const linkHtml = (link, indent) => `${indent}<a class="e-btn e-btn--sm" href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.name)} <span aria-hidden="true">↗</span><span class="sr-only"> (se abre en otra pestaña)</span></a>`;

function scriptContent(view) {
    const algorithms = view.algorithms.map(a => {
        let body = a.object.slice(1, -1).replace(/\s+$/, '');
        if (body && !body.endsWith(',')) body += ',';
        return `{\n        status: ${JSON.stringify(a.status)},${body}\n        pseudo: ${templateLiteral(a.pseudo)},\n    }`;
    });
    const declarations = view.algorithms.map(a => a.declarations).filter(Boolean);
    return [
        `const TRACKS = ${toScript(view.tracks)};`,
        `    const TEXTS = ${toScript(view.texts)};`,
        `    const PIECES = ${toScript(view.pieces)};`,
        ...declarations.map(d => '    ' + d.replace(/\n/g, '\n    ')),
        `    const ALGORITHMS = [${algorithms.length ? '\n    ' + algorithms.join(',\n    ') + ',\n    ' : ''}];`,
        `    const EFFECTS = ${toScript(view.effects)};`,
    ].join('\n').replace(/<\/script/gi, '<\\/script');
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
    replace('/*@content*/', scriptContent(view));
    const left = html.match(/\{\{[A-Z_]+\}\}|<!--@[a-z:]+-->|\/\*@content\*\//);
    if (left) throw new Error(`plantilla: queda sin rellenar ${left[0]}`);
    return html;
}

function copyInto(from, to) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.cpSync(from, to, { recursive: true });
}

export function build({ mode = 'prod', contentDir = path.join(SITE, 'content'), outDir = path.join(ROOT, 'dist') } = {}) {
    if (mode !== 'dev' && mode !== 'prod') throw new Error(`modo "${mode}" desconocido: usa dev o prod`);
    const view = select(readContent(contentDir), mode);
    const html = render(readText(path.join(SITE, 'template', 'index.html')), view);

    // GitHub Pages answers any missing address with the same 404 page, at that
    // address: its links start from the site's base path, not from where it is
    const base = new URL(view.url).pathname;
    const notFound = readText(path.join(SITE, 'template', '404.html')).split('{{BASE}}').join(escapeHtml(base));

    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html);
    fs.writeFileSync(path.join(outDir, '404.html'), notFound);
    for (const name of fs.readdirSync(path.join(SITE, 'static'))) copyInto(path.join(SITE, 'static', name), path.join(outDir, name));
    for (const name of ['echorath-ui.css', 'echorath-ui.css.map', 'echorath-ui.js', 'echorath-ui.js.map', 'fonts']) {
        copyInto(path.join(FRAMEWORK_DIST, name), path.join(outDir, name));
    }
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
