import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { build, bundleCss, minifyCss } from '../build.mjs';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(SITE, '..');
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

test('the output folder is never the project or a folder inside site/', () => {
    for (const outDir of [ROOT, path.dirname(ROOT), SITE, path.join(SITE, 'content'), path.parse(ROOT).root]) {
        assert.throws(() => build({ mode: 'prod', outDir }), /la carpeta de salida .* no vale/, outDir);
    }
    assert.ok(fs.existsSync(path.join(SITE, 'content', 'site.json')), 'the content is still there');
});

test('a work with a missing or wrong field stops the build, naming the file and the field', () => {
    const cases = [
        [d => editJson(path.join(d, 'musica', '01-marea-baja.json'), t => { delete t.notes; }), /01-marea-baja\.json: "notes" falta; tiene que ser una lista de frecuencias/],
        [d => editJson(path.join(d, 'musica', '01-marea-baja.json'), t => { t.dur = '3.42'; }), /"dur" vale "3\.42"; tiene que ser una duración como 3:42/],
        [d => editJson(path.join(d, 'imagenes', '01-repeticion-01.json'), p => { p.kind = 'Espirales'; }), /01-repeticion-01\.json: "kind" vale "Espirales"; tiene que ser uno de: Círculos/],
        [d => editJson(path.join(d, 'site.json'), s => { s.email.address = 'correo'; }), /site\.json: email\."address" vale "correo"/],
        [d => editJson(path.join(d, 'efectos.json'), e => { e.effects[2].variant = 'blur'; }), /efectos\.json: effects\[2\]\."variant" vale "blur"/],
        [d => {
            const file = path.join(d, 'escritura', '01-ciudades-que-se-repiten.md');
            fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/^summary: .*\n/m, ''));
        }, /01-ciudades-que-se-repiten\.md: "summary" falta/],
    ];
    for (const [change, message] of cases) {
        assert.throws(() => build({ mode: 'dev', contentDir: contentCopy(change), outDir: tmp('bad') }), message);
    }
});

test('a link must be https:// or mailto:', () => {
    const dir = contentCopy(d => editJson(path.join(d, 'site.json'), s => { s.links[0].url = 'javascript:alert(1)'; }));
    assert.throws(() => build({ mode: 'dev', contentDir: dir, outDir: tmp('bad') }), /links\[0\]\."url" vale "javascript:alert\(1\)"; tiene que ser una dirección https:\/\/ o mailto:/);
});

test('a header value that looks like JSON but is not names the file', () => {
    const dir = contentCopy(d => {
        const file = path.join(d, 'escritura', '01-ciudades-que-se-repiten.md');
        fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('kind: Ensayo', 'kind: [Ensayo'));
    });
    assert.throws(() => build({ mode: 'dev', contentDir: dir, outDir: tmp('bad') }), /01-ciudades-que-se-repiten\.md: el valor de "kind" empieza como una lista o un objeto/);
});

test('works are ordered by the number in their name: 2 before 10', () => {
    const dir = contentCopy(d => {
        const one = JSON.parse(fs.readFileSync(path.join(d, 'musica', '01-marea-baja.json'), 'utf8'));
        fs.writeFileSync(path.join(d, 'musica', '10-diez.json'), JSON.stringify({ ...one, title: 'Diez' }));
        fs.writeFileSync(path.join(d, 'musica', '2-dos.json'), JSON.stringify({ ...one, title: 'Dos' }));
    });
    const { js } = run('dev', dir);
    const titles = [...js.matchAll(/"title": "(Marea baja|Dos|Diez)"/g)].map(m => m[1]);
    assert.deepEqual(titles, ['Marea baja', 'Dos', 'Diez']);
});

test('each algorithm has its own scope: two can use the same names', () => {
    const dir = contentCopy(d => {
        for (const [folder, title] of [['02-uno', 'Uno'], ['03-dos', 'Dos']]) {
            fs.mkdirSync(path.join(d, 'algoritmos', folder));
            fs.writeFileSync(path.join(d, 'algoritmos', folder, 'meta.json'), '{ "status": "draft" }');
            fs.writeFileSync(path.join(d, 'algoritmos', folder, 'algorithm.js'), [
                'const SIZE = 3;',
                'function draw(ctx) { ctx.fillRect(0, 0, SIZE, SIZE); }',
                `export default { title: '${title}', year: 2026, mode: 'animation', summary: 'x', alt: () => 'x', draw, code: { draw } };`,
            ].join('\n'));
        }
    });
    const { js } = run('dev', dir);
    assert.doesNotThrow(() => new vm.Script(js));
    assert.equal((js.match(/const SIZE = 3;/g) || []).length, 2);
});

test('an algorithm without title, mode or draw stops the build', () => {
    const dir = contentCopy(d => {
        const file = path.join(d, 'algoritmos', '01-repeticion', 'algorithm.js');
        fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace("mode: 'seed',", ''));
    });
    assert.throws(() => build({ mode: 'dev', contentDir: dir, outDir: tmp('bad') }), /01-repeticion\/algorithm\.js: a la ficha le falta "mode"/);
});

test('the stylesheet is every file in css/, in the order of index.css, minified', () => {
    const { out } = run('dev');
    const css = fs.readFileSync(path.join(out, 'site.css'), 'utf8');
    assert.doesNotMatch(css, /@import|\/\*/);
    // the first file's rule comes first, the last file's comes last
    assert.ok(css.startsWith(':root{--e-color-green:#00ff41'));
    assert.ok(css.indexOf('.skip-link{') < css.indexOf('.track-row{') && css.indexOf('.track-row{') < css.indexOf('@media print'));
});

test('a css file left out of index.css, or imported twice, stops the build', () => {
    const dir = tmp('css');
    fs.writeFileSync(path.join(dir, 'index.css'), '@import "a.css";\n@import "a.css";\n');
    fs.writeFileSync(path.join(dir, 'a.css'), '.a { color: red; }\n');
    assert.throws(() => bundleCss(dir), /css\/a\.css: se importa dos veces/);
    fs.writeFileSync(path.join(dir, 'index.css'), '@import "a.css";\n');
    fs.writeFileSync(path.join(dir, 'b.css'), '.b { color: blue; }\n');
    assert.throws(() => bundleCss(dir), /css\/index\.css: falta importar b\.css/);
});

test('minifying keeps what CSS needs: spaces in values, media queries and strings', () => {
    assert.equal(minifyCss('/* x */\n.a > .b ,\n.c {\n  width: calc(100% - 2px);\n  grid-template-areas: "a b" "c d";\n}\n@media (max-height: 500px) and (min-width: 561px) { .d { content: " " attr(href); } }\n'),
        '.a>.b,.c{width:calc(100% - 2px);grid-template-areas:"a b" "c d"}@media (max-height:500px) and (min-width:561px){.d{content:" " attr(href)}}\n');
});
