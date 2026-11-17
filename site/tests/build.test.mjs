import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { build } from '../build.mjs';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(SITE, 'content');
const SECTIONS = ['musica', 'escritura', 'imagenes', 'efectos', 'algoritmos', 'sobre', 'contacto'];

const tmp = name => fs.mkdtempSync(path.join(os.tmpdir(), `echorath-${name}-`));

function run(mode, contentDir = CONTENT) {
    const out = tmp(mode);
    build({ mode, contentDir, outDir: out });
    const page = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
    const js = fs.readFileSync(path.join(out, 'site.js'), 'utf8');
    // html: the page and its script together, for what may be in either
    return { out, page, js, html: `${page}\n${js}` };
}

// A copy of the content to change in a test, never the real one
function contentCopy(change) {
    const dir = tmp('content');
    fs.cpSync(CONTENT, dir, { recursive: true });
    change(dir);
    return dir;
}
const editJson = (file, change) => {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    change(data);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

const sectionsIn = html => SECTIONS.filter(id => html.includes(`id="${id}"`));
const navIn = html => [...html.matchAll(/data-section="([a-z]+)"/g)].map(m => m[1]);

test('every page script parses, in both modes', () => {
    for (const mode of ['dev', 'prod']) {
        const { page, js } = run(mode);
        const inline = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
        assert.equal(inline.length, 1);
        [...inline, js].forEach(code => new vm.Script(code));
    }
});

test('no marker or placeholder of the template reaches a page', () => {
    for (const mode of ['dev', 'prod']) {
        const { html } = run(mode);
        assert.doesNotMatch(html, /<!--@|<!--#|\{\{[A-Z_:a-z.-]+\}\}|\/\*@content\*\//);
    }
});

test('the development site shows every work, marked, and stays out of search engines', () => {
    const { html } = run('dev');
    assert.deepEqual(sectionsIn(html), SECTIONS);
    assert.deepEqual(navIn(html), SECTIONS);
    assert.match(html, /<meta name="robots" content="noindex">/);
    assert.match(html, /En desarrollo: lo que ves son muestras/);
    assert.equal((html.match(/class="dev-note"/g) || []).length, 5);
    assert.match(html, /"status": "sample"/);
    assert.match(html, /correo@echorath\.example/);
    assert.match(html, /<link rel="canonical" href="https:\/\/damdavidprieto\.github\.io\/Echorath\/dev\/">/);
});

test('production with nothing published shows only the first screen', () => {
    const { html } = run('prod');
    assert.deepEqual(sectionsIn(html), []);
    assert.deepEqual(navIn(html), []);
    assert.doesNotMatch(html, /noindex/);
    assert.doesNotMatch(html, /dev-note"|En desarrollo:|echorath\.example|"status": "sample"|id="start-list"|e-header__toggle/);
    assert.match(html, /const TRACKS = \[\];/);
    assert.match(html, /const ALGORITHMS = \[\];/);
    assert.match(html, /const EMAIL = "";/);
    assert.match(html, /<link rel="canonical" href="https:\/\/damdavidprieto\.github\.io\/Echorath\/">/);
    assert.match(html, /<h1 class="hero__name">Echorath<\/h1>/);
});

test('the 404 page reaches its files from the site base, wherever GitHub shows it', () => {
    for (const [mode, base] of [['prod', '/Echorath/'], ['dev', '/Echorath/dev/']]) {
        const { out } = run(mode);
        const page = fs.readFileSync(path.join(out, '404.html'), 'utf8');
        assert.match(page, new RegExp(`href="${base}echorath-ui\\.min\\.css\\?v=[0-9a-f]{10}"`));
        assert.match(page, new RegExp(`href="${base}">Ir a la portada`));
        assert.doesNotMatch(page, /\{\{BASE\}\}|href="\/(?!Echorath\/)/);
    }
});

test('a published work appears in production with its section, its link and its door', () => {
    const dir = contentCopy(d => editJson(path.join(d, 'musica', '01-marea-baja.json'), t => { t.status = 'published'; }));
    const { html } = run('prod', dir);
    assert.deepEqual(sectionsIn(html), ['musica']);
    assert.deepEqual(navIn(html), ['musica']);
    assert.match(html, /"title": "Marea baja"/);
    assert.match(html, /id="feature-play">Escuchar «Marea baja»</);
    assert.match(html, /id="start-list"/);
    assert.doesNotMatch(html, /Ciudades que se repiten|Repetición 01"|"status": "sample"/);
});

test('contact and links reach production only once they are real', () => {
    const dir = contentCopy(d => editJson(path.join(d, 'site.json'), s => {
        s.email = { status: 'published', address: 'hola@echorath.es' };
        s.links[0].status = 'published';
    }));
    const { html } = run('prod', dir);
    assert.deepEqual(sectionsIn(html), ['contacto']);
    assert.match(html, /href="mailto:hola@echorath\.es"/);
    assert.match(html, /const EMAIL = "hola@echorath\.es";/);
    assert.match(html, /href="https:\/\/www\.instagram\.com"/);
    assert.doesNotMatch(html, /wattpad|github\.com"/);
});

test('a text written with Windows line endings reads the same', () => {
    const dir = contentCopy(d => {
        const file = path.join(d, 'escritura', '01-ciudades-que-se-repiten.md');
        fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('status: sample', 'status: published').replace(/\n/g, '\r\n'));
    });
    const { html } = run('prod', dir);
    assert.deepEqual(sectionsIn(html), ['escritura']);
    assert.match(html, /"Lo que aprendí es que la repetición no vacía un lugar\. La vuelve legible\."/);
});

test('an unknown state stops the build and names the file', () => {
    const dir = contentCopy(d => editJson(path.join(d, 'imagenes', '01-repeticion-01.json'), p => { p.status = 'publicado'; }));
    assert.throws(() => build({ mode: 'prod', contentDir: dir, outDir: tmp('bad') }), /01-repeticion-01\.json: el estado "publicado" no existe/);
});

test('the site carries the framework, its fonts and the static files', () => {
    const { out } = run('prod');
    for (const file of ['echorath-ui.min.css', 'echorath-ui.min.js', 'site.css', 'site.js', 'fonts/literata-latin.woff2', '404.html', 'favicon.svg', 'og.png']) {
        assert.ok(fs.existsSync(path.join(out, file)), file);
    }
});

test('each own file is linked with the hash of its content', () => {
    const { out, page } = run('dev');
    const linked = [...page.matchAll(/(?:href|src)="([a-z.-]+)\?v=([0-9a-f]{10})"/g)];
    assert.deepEqual(linked.map(m => m[1]).sort(), ['echorath-ui.min.css', 'echorath-ui.min.js', 'site.css', 'site.js']);
    for (const [, file, hash] of linked) {
        const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(out, file))).digest('hex').slice(0, 10);
        assert.equal(hash, actual, file);
    }
});
