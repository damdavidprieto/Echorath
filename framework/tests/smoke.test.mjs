/**
 * Smoke tests: build output and runtime behavior in a real browser.
 *
 *   npm test
 *
 * Chromium path: CHROMIUM_PATH, or /opt/pw-browsers/chromium by default.
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const exampleUrl = pathToFileURL(resolve(root, 'examples/index.html')).href;
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

const EXPECTED_ANIMATION = {
    standard: 'e-distort-standard',
    flicker: 'e-distort-flicker',
    glitch: 'e-distort-glitch',
    scan: 'e-distort-scan',
    wave: 'e-distort-wave',
    shatter: 'e-distort-shatter',
    warp: 'e-anim-flicker',
    static: 'e-anim-flicker',
};

describe('build output', () => {
    const files = ['echorath-ui.css', 'echorath-ui.min.css', 'echorath-ui.js', 'echorath-ui.min.js', 'echorath-ui.esm.js'];

    for (const file of files) {
        it(`${file} links a source map whose sources exist`, () => {
            const code = readFileSync(resolve(root, 'dist', file), 'utf8');
            assert.match(code, new RegExp(`sourceMappingURL=${file.replace(/\./g, '\\.')}\\.map`));

            const map = JSON.parse(readFileSync(resolve(root, 'dist', `${file}.map`), 'utf8'));
            assert.ok(map.sources.length > 0, 'map lists sources');
            for (const source of map.sources) {
                assert.ok(existsSync(resolve(root, 'dist', source)), `missing source ${source}`);
                assert.ok(source.startsWith('../src/'), `source outside src/: ${source}`);
            }
        });
    }

    it('every --e-* variable used in the CSS and the example is defined', () => {
        const css = readFileSync(resolve(root, 'dist/echorath-ui.css'), 'utf8');
        const example = readFileSync(resolve(root, 'examples/index.html'), 'utf8');

        const defined = new Set([...css.matchAll(/(--e-[a-z0-9-]+)\s*:/g)].map(m => m[1]));
        const used = new Set([css, example].flatMap(text => [...text.matchAll(/var\((--e-[a-z0-9-]+)/g)].map(m => m[1])));
        const missing = [...used].filter(name => !defined.has(name));

        assert.ok(used.size > 20, `only ${used.size} tokens found: the pattern no longer matches the prefix`);
        assert.deepEqual(missing, [], `undefined tokens: ${missing.join(', ')}`);
    });

    it('the fonts ship with the framework: the CSS asks no other server', () => {
        for (const file of ['echorath-ui.css', 'echorath-ui.min.css']) {
            const css = readFileSync(resolve(root, 'dist', file), 'utf8');
            assert.doesNotMatch(css, /url\(\s*["']?https?:/, `${file} points to another server`);
            assert.doesNotMatch(css, /@import\s+url\(/, `${file} still imports a remote stylesheet`);
            const fonts = [...css.matchAll(/url\(\s*["']?(\.\/fonts\/[^"')]+)/g)].map(m => m[1]);
            assert.ok(fonts.length >= 7, `${file} declares the bundled fonts`);
            for (const font of fonts) assert.ok(existsSync(resolve(root, 'dist', font)), `missing ${font}`);
        }
        for (const licence of ['OFL-Orbitron.txt', 'OFL-JetBrainsMono.txt', 'OFL-Literata.txt']) {
            assert.ok(existsSync(resolve(root, 'dist/fonts', licence)), `missing ${licence}`);
        }
    });

    it('CSS bundle has no unresolved local imports', () => {
        const css = readFileSync(resolve(root, 'dist/echorath-ui.css'), 'utf8');
        const imports = css.match(/@import\s+["']\.\//g) || [];
        assert.equal(imports.length, 0);
    });
});

describe('runtime', () => {
    let browser;
    let page;
    const errors = [];
    const warnings = [];

    before(async () => {
        browser = await chromium.launch({
            executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
        });
        page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        page.on('pageerror', err => errors.push(err.message));
        page.on('console', msg => {
            if (msg.type() === 'error' && !/Failed to load resource/.test(msg.text())) errors.push(msg.text());
            if (msg.type() === 'warning') warnings.push(msg.text());
        });
        await page.goto(exampleUrl, { waitUntil: 'load' });
        await page.waitForFunction(() => window.EchorathUI && document.getElementById('e-distort-defs'));
    });

    after(async () => {
        await browser?.close();
    });

    it('exposes the API with the package version', async () => {
        const api = await page.evaluate(() => ({
            version: EchorathUI.version,
            variants: EchorathUI.variants,
            functions: ['init', 'configure', 'load', 'ready', 'wait', 'loadFor', 'tone', 'initHeaders', 'initTabs', 'toast', 'modal', 'fxPicker']
                .filter(name => typeof EchorathUI[name] !== 'function'),
        }));
        assert.equal(api.version, pkg.version);
        assert.deepEqual(api.variants, ['standard', 'flicker', 'glitch', 'scan', 'wave', 'shatter', 'warp', 'static', 'decode']);
        assert.deepEqual(api.functions, [], 'missing functions');
    });

    it('injects the SVG filters once', async () => {
        const count = await page.evaluate(() => {
            EchorathUI.init();
            return document.querySelectorAll('#e-distort-defs').length;
        });
        assert.equal(count, 1);
    });

    for (const [variant, animation] of Object.entries(EXPECTED_ANIMATION)) {
        it(`plays "${variant}" while loading and clears it on ready`, async () => {
            const state = await page.evaluate(v => {
                const node = document.createElement('div');
                node.textContent = 'sample';
                document.body.appendChild(node);
                EchorathUI.load(node, { variant: v });
                const style = getComputedStyle(node);
                const during = {
                    loading: node.hasAttribute('data-loading'),
                    busy: node.getAttribute('aria-busy'),
                    animation: style.animationName,
                    filter: style.filter,
                };
                EchorathUI.ready(node, { reveal: false });
                const afterReady = { loading: node.hasAttribute('data-loading'), animation: getComputedStyle(node).animationName };
                node.remove();
                return { during, afterReady };
            }, variant);

            assert.equal(state.during.loading, true);
            assert.equal(state.during.busy, 'true');
            assert.equal(state.during.animation, animation);
            if (variant === 'warp') assert.match(state.during.filter, /#e-warp/);
            if (variant === 'static') assert.match(state.during.filter, /#e-static/);
            assert.equal(state.afterReady.loading, false);
            assert.equal(state.afterReady.animation, 'none');
        });
    }

    it('uses "standard" when no variant is given, in JS and in plain HTML', async () => {
        const result = await page.evaluate(() => {
            const viaJs = document.createElement('div');
            document.body.appendChild(viaJs);
            EchorathUI.load(viaJs);

            const viaHtml = document.createElement('div');
            viaHtml.setAttribute('data-loading', '');
            document.body.appendChild(viaHtml);

            const out = {
                jsVariant: viaJs.getAttribute('data-distort'),
                jsAnimation: getComputedStyle(viaJs).animationName,
                htmlAnimation: getComputedStyle(viaHtml).animationName,
            };
            viaJs.remove();
            viaHtml.remove();
            return out;
        });
        assert.equal(result.jsVariant, 'standard');
        assert.equal(result.jsAnimation, 'e-distort-standard');
        assert.equal(result.htmlAnimation, 'e-distort-standard');
    });

    it('decode scrambles text and restores it', async () => {
        const result = await page.evaluate(async () => {
            const node = document.createElement('span');
            node.textContent = 'DESCIFRANDO';
            document.body.appendChild(node);
            await EchorathUI.loadFor(node, 300, { variant: 'decode', reveal: false });
            await new Promise(r => setTimeout(r, 600));
            const text = node.textContent;
            node.remove();
            return text;
        });
        assert.equal(result, 'DESCIFRANDO');
    });

    it('decode on an element with children falls back to "standard" and warns', async () => {
        const before = warnings.length;
        const variant = await page.evaluate(() => {
            const node = document.createElement('div');
            node.innerHTML = '<b>bold</b> text';
            document.body.appendChild(node);
            EchorathUI.load(node, { variant: 'decode' });
            const v = node.getAttribute('data-distort');
            const html = node.innerHTML;
            EchorathUI.ready(node, { reveal: false });
            node.remove();
            return { v, html };
        });
        assert.equal(variant.v, 'standard');
        assert.equal(variant.html, '<b>bold</b> text');
        assert.ok(warnings.length > before, 'expected a console warning');
    });

    it('rejects unknown variants', async () => {
        const message = await page.evaluate(() => {
            try {
                EchorathUI.load(document.body, { variant: 'nope' });
                return null;
            } catch (e) {
                return e.message;
            }
        });
        assert.match(message, /unknown variant "nope"/);
    });

    it('configure() validates and changes the default variant', async () => {
        const result = await page.evaluate(() => {
            EchorathUI.configure({ defaultVariant: 'scan' });
            const node = document.createElement('div');
            document.body.appendChild(node);
            EchorathUI.load(node);
            const v = node.getAttribute('data-distort');
            EchorathUI.ready(node, { reveal: false });
            node.remove();
            EchorathUI.configure({ defaultVariant: 'standard' });
            let error = null;
            try { EchorathUI.configure({ defaultVariant: 'nope' }); } catch (e) { error = e.message; }
            return { v, error };
        });
        assert.equal(result.v, 'scan');
        assert.match(result.error, /unknown variant/);
    });

    it('data-tone wins over a component modifier tone', async () => {
        const color = await page.evaluate(() => {
            const button = document.createElement('button');
            button.className = 'e-btn e-btn--danger';
            button.setAttribute('data-tone', 'ok');
            document.body.appendChild(button);
            const value = getComputedStyle(button).borderTopColor;
            button.remove();
            return value;
        });
        assert.equal(color, 'rgb(0, 255, 157)');
    });

    it('the header and dialog glows follow --e-color-green', async () => {
        const glows = await page.evaluate(() => {
            const read = () => {
                const modal = document.createElement('div');
                modal.className = 'e-modal';
                document.body.appendChild(modal);
                const out = [getComputedStyle(document.querySelector('.e-header')).boxShadow, getComputedStyle(modal).boxShadow];
                modal.remove();
                return out;
            };
            const usual = read();
            document.documentElement.style.setProperty('--e-color-green', '#ff0000');
            const red = read();
            document.documentElement.style.removeProperty('--e-color-green');
            return { usual, red };
        });
        const isRed = shadow => /rgba?\(255, 0, 0|srgb 1 0 0/.test(shadow);
        assert.ok(glows.red.every(isRed), `glows with a red token: ${glows.red.join(' | ')}`);
        assert.ok(!glows.usual.some(isRed), `glows by default: ${glows.usual.join(' | ')}`);
    });

    it('the highlight colour follows the red: selected text, linked passages and the caret', async () => {
        const read = await page.evaluate(() => {
            const p = document.querySelector('p');
            const field = document.createElement('input');
            field.className = 'e-input';
            document.body.appendChild(field);
            const out = {
                token: getComputedStyle(document.documentElement).getPropertyValue('--e-color-highlight').trim(),
                selection: getComputedStyle(p, '::selection').backgroundColor,
                selectionText: getComputedStyle(p, '::selection').color,
                target: getComputedStyle(p, '::target-text').backgroundColor,
                caret: getComputedStyle(field).caretColor,
            };
            field.remove();
            return out;
        });
        const rgb = color => {
            const n = color.match(/[\d.]+/g).map(Number);
            return color.startsWith('color(') ? n.slice(0, 3).map(v => v * 255) : n.slice(0, 3);
        };
        const lum = ([r, g, b]) => {
            const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
            return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        };
        const [r, g, b] = rgb(read.selection);
        assert.equal(read.token, '#ff0055');   // the red, unless a page changes it
        assert.equal(read.caret, 'rgb(255, 0, 85)');
        assert.ok(r > 2 * g && r > 2 * b, `selection ${read.selection} is a red`);
        assert.equal(read.target, read.selection);
        assert.equal(read.selectionText, 'rgb(255, 255, 255)');
        const contrast = 1.05 / (lum([r, g, b]) + 0.05);
        assert.ok(contrast >= 4.5, `white on the selection ${contrast.toFixed(2)}:1`);
    });

    it("a panel's corners take the highlight colour under the pointer", async () => {
        const other = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        await other.goto(exampleUrl, { waitUntil: 'load' });
        await other.waitForFunction(() => window.EchorathUI);
        const corner = () => other.evaluate(() => {
            const panel = document.querySelector('.e-panel');
            return getComputedStyle(panel, '::before').borderTopColor;
        });
        await other.mouse.move(1, 1);
        const idle = await corner();
        await other.hover('.e-panel');
        await other.waitForTimeout(400);
        const hovered = await corner();
        await other.close();
        assert.notEqual(idle, 'rgb(255, 0, 85)');
        assert.equal(hovered, 'rgb(255, 0, 85)');
    });

    it('a click inside a panel leaves its corners as they were; the keyboard lights them', async () => {
        const other = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        await other.goto(exampleUrl, { waitUntil: 'load' });
        await other.waitForFunction(() => window.EchorathUI);
        const panel = await other.evaluateHandle(() => {
            const p = document.createElement('div');
            p.className = 'e-panel';
            p.innerHTML = '<button class="e-btn" type="button">Probar</button>';
            document.body.append(p);
            p.scrollIntoView({ block: 'center' });
            return p;
        });
        const corner = () => other.evaluate(p => getComputedStyle(p, '::before').borderTopColor, panel);
        await other.click('body > .e-panel:last-child .e-btn');
        await other.mouse.move(5, 5);
        await other.waitForTimeout(400);
        const afterClick = await corner();
        await other.keyboard.press('Shift+Tab');
        await other.keyboard.press('Tab');
        await other.waitForTimeout(400);
        const withKeyboard = await corner();
        await other.close();
        assert.notEqual(afterClick, 'rgb(255, 0, 85)');
        assert.equal(withKeyboard, 'rgb(255, 0, 85)');
    });

    it('a focused switch shows a ring at least 2px thick', async () => {
        const ring = await page.evaluate(() => {
            const input = document.querySelector('.e-switch input');
            input.focus({ focusVisible: true });
            const cs = getComputedStyle(input.nextElementSibling);
            const out = { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), visible: input.matches(':focus-visible') };
            input.blur();
            return out;
        });
        assert.ok(ring.visible, 'the switch has keyboard focus');
        assert.equal(ring.style, 'solid');
        assert.ok(ring.width >= 2, `ring ${ring.width}px`);
    });

    it('a focused button shows a ring at least 2px thick, also when it already looks active', async () => {
        const rings = await page.evaluate(() => {
            const usable = [...document.querySelectorAll('.e-btn')].filter(b => b.checkVisibility() && !b.disabled);
            return [usable[0], usable.find(b => b.classList.contains('e-btn--solid'))].map(btn => {
                btn.setAttribute('aria-current', 'true');
                btn.focus({ focusVisible: true });
                const cs = getComputedStyle(btn);
                const out = { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), visible: btn.matches(':focus-visible') };
                btn.blur();
                btn.removeAttribute('aria-current');
                return out;
            });
        });
        assert.equal(rings.length, 2);
        for (const ring of rings) {
            assert.ok(ring.visible, 'the button has keyboard focus');
            assert.equal(ring.style, 'solid');
            assert.ok(ring.width >= 2, `ring ${ring.width}px`);
        }
    });

    it('tabs switch panels', async () => {
        await page.click('.e-tab:nth-child(2)');
        const hidden = await page.evaluate(() => ({
            events: document.getElementById('tab-events').hidden,
            log: document.getElementById('tab-log').hidden,
            selected: document.querySelector('.e-tab:nth-child(2)').getAttribute('aria-selected'),
        }));
        assert.deepEqual(hidden, { events: true, log: false, selected: 'true' });
    });

    it('modal resolves with the chosen value and with undefined on Escape', async () => {
        const chosen = page.evaluate(() => EchorathUI.modal({
            title: 'Test',
            body: 'Body',
            actions: [{ label: 'No', value: false }, { label: 'Sí', value: 'yes', variant: 'solid' }],
        }));
        await page.click('.e-modal__foot .e-btn--solid');
        assert.equal(await chosen, 'yes');

        const dismissed = page.evaluate(() => EchorathUI.modal({ title: 'Test 2' }));
        await page.waitForSelector('.e-modal-overlay.is-open');
        await page.keyboard.press('Escape');
        assert.equal(await dismissed, undefined);

        await page.waitForTimeout(400);
        assert.equal(await page.locator('.e-modal-overlay').count(), 0);
    });

    it('toast slides in with the requested tone', async () => {
        const state = await page.evaluate(async () => {
            const node = EchorathUI.toast('Hola', 'Mensaje', 'warn', 1000);
            await new Promise(r => setTimeout(r, 100));
            return { visible: node.classList.contains('is-visible'), tone: node.getAttribute('data-tone') };
        });
        assert.deepEqual(state, { visible: true, tone: 'warn' });
    });

    it('reduced motion stops distortions and dims loading content', async () => {
        const context = await browser.newContext({ reducedMotion: 'reduce' });
        const reduced = await context.newPage();
        await reduced.goto(exampleUrl, { waitUntil: 'load' });
        await reduced.waitForFunction(() => window.EchorathUI);
        const style = await reduced.evaluate(() => {
            const node = document.createElement('div');
            node.textContent = 'x';
            document.body.appendChild(node);
            EchorathUI.load(node, { variant: 'glitch' });
            const s = getComputedStyle(node);
            return { animation: s.animationName, opacity: s.opacity, shadow: s.textShadow };
        });
        await context.close();
        assert.deepEqual(style, { animation: 'none', opacity: '0.55', shadow: 'none' });
    });

    it('header collapses into a menu on phones and stays open on desktop', async () => {
        const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
        phone.on('pageerror', err => errors.push(err.message));
        await phone.goto(exampleUrl, { waitUntil: 'load' });
        await phone.waitForFunction(() => window.EchorathUI);

        const state = () => phone.evaluate(() => ({
            toggle: getComputedStyle(document.querySelector('.e-header__toggle')).display,
            nav: getComputedStyle(document.getElementById('demo-nav')).display,
            expanded: document.querySelector('.e-header__toggle').getAttribute('aria-expanded'),
            label: document.querySelector('.e-header__toggle').textContent,
        }));

        // init() again must not bind the toggle twice (a double bind would open and close at once)
        await phone.evaluate(() => EchorathUI.init());

        assert.deepEqual(await state(), { toggle: 'flex', nav: 'none', expanded: 'false', label: 'Menú' });

        await phone.click('.e-header__toggle');
        assert.deepEqual(await state(), { toggle: 'flex', nav: 'flex', expanded: 'true', label: 'Cerrar' });

        await phone.click('#demo-toast');
        assert.equal((await state()).nav, 'none', 'choosing an item closes the menu');

        await phone.click('.e-header__toggle');
        await phone.keyboard.press('Escape');
        const afterEscape = await state();
        assert.equal(afterEscape.nav, 'none');
        assert.equal(await phone.evaluate(() => document.activeElement.classList.contains('e-header__toggle')), true);

        const height = await phone.evaluate(() => document.querySelector('.e-header').getBoundingClientRect().height);
        assert.ok(height <= 60, `phone header is ${height}px tall`);
        await phone.close();

        const desktop = await page.evaluate(() => ({
            toggle: getComputedStyle(document.querySelector('.e-header__toggle')).display,
            nav: getComputedStyle(document.getElementById('demo-nav')).display,
        }));
        assert.deepEqual(desktop, { toggle: 'none', nav: 'flex' });
    });

    it('header folds into the menu whenever its links do not fit in one row, at any width', async () => {
        const wide = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        wide.on('pageerror', err => errors.push(err.message));
        await wide.goto(exampleUrl, { waitUntil: 'load' });
        await wide.waitForFunction(() => window.EchorathUI);
        await wide.evaluate(() => document.fonts.ready);

        const frames = () => wide.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
        const state = () => wide.evaluate(() => {
            const header = document.querySelector('.e-header');
            return {
                compact: header.classList.contains('is-compact'),
                toggle: getComputedStyle(header.querySelector('.e-header__toggle')).display,
                nav: getComputedStyle(document.getElementById('demo-nav')).display,
                expanded: header.querySelector('.e-header__toggle').getAttribute('aria-expanded'),
                height: Math.round(header.getBoundingClientRect().height),
                offset: getComputedStyle(document.documentElement).getPropertyValue('--e-header-offset').trim(),
            };
        });
        const addLinks = n => wide.evaluate(count => {
            const nav = document.getElementById('demo-nav');
            for (let i = 0; i < count; i++) {
                const link = document.createElement('a');
                link.className = 'e-btn extra';
                link.href = '#';
                link.textContent = `Sección ${nav.children.length}`;
                nav.appendChild(link);
            }
        }, n);

        // Four more links still fit at 1280px, not at 900px
        await addLinks(4);
        await frames();
        assert.equal((await state()).compact, false, 'fits at 1280px');
        await wide.setViewportSize({ width: 900, height: 900 });
        await frames();
        let s = await state();
        assert.deepEqual([s.compact, s.toggle, s.nav], [true, 'flex', 'none'], 'folds at 900px');
        assert.ok(s.height <= 60, `compact bar is ${s.height}px tall`);
        assert.equal(s.offset, `${s.height}px`, 'the offset follows the folded height');
        await wide.setViewportSize({ width: 1280, height: 900 });
        await frames();
        assert.equal((await state()).compact, false, 'unfolds when there is room again');

        // Links added later fold it too; the open menu is a grid
        await addLinks(8);
        await frames();
        assert.equal((await state()).compact, true, 'folds when links are added');
        await wide.click('.e-header__toggle');
        s = await state();
        assert.deepEqual([s.nav, s.expanded], ['grid', 'true']);

        // Unfolding closes the menu
        await wide.evaluate(() => document.querySelectorAll('#demo-nav .extra').forEach(link => link.remove()));
        await frames();
        s = await state();
        assert.deepEqual([s.compact, s.toggle, s.nav, s.expanded], [false, 'none', 'flex', 'false']);
        await wide.close();
    });

    it('a header without a menu button never folds', async () => {
        const other = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        other.on('pageerror', err => errors.push(err.message));
        await other.goto(exampleUrl, { waitUntil: 'load' });
        await other.waitForFunction(() => window.EchorathUI);
        const folded = await other.evaluate(async () => {
            const box = document.createElement('div');
            box.innerHTML = '<header class="e-header e-header--sticky"><div><h1 class="e-h1">X</h1></div><nav class="e-header__nav"></nav></header>';
            const nav = box.querySelector('nav');
            for (let i = 0; i < 20; i++) {
                const link = document.createElement('a');
                link.className = 'e-btn';
                link.textContent = `Enlace ${i}`;
                nav.appendChild(link);
            }
            document.body.appendChild(box);
            EchorathUI.initHeaders(box);
            await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
            const result = { compact: box.firstElementChild.classList.contains('is-compact'), nav: getComputedStyle(nav).display };
            box.remove();
            return result;
        });
        const offset = await other.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--e-header-offset').trim());
        await other.close();
        assert.deepEqual(folded, { compact: false, nav: 'flex' }, 'with no way to open the menu, the links wrap instead');
        assert.notEqual(offset, '0px', 'a removed header does not clear the offset');
    });

    it('modal returns a handle that changes title and body in place and closes with a value', async () => {
        const result = await page.evaluate(async () => {
            const tall = text => {
                const node = document.createElement('p');
                node.textContent = text;
                node.style.height = '3000px';
                return node;
            };
            const reader = EchorathUI.modal({ title: 'Uno', body: tall('Primero'), size: 'lg' });
            const body = reader.element.querySelector('.e-modal__body');
            body.scrollTop = 600;
            const scrolledBefore = body.scrollTop;
            reader.setTitle('Dos');
            reader.setBody(tall('Segundo'));
            const state = {
                isDialog: reader.element.classList.contains('e-modal'),
                title: reader.element.querySelector('.e-modal__head span').textContent,
                label: reader.element.getAttribute('aria-label'),
                body: body.textContent,
                scrolledBefore: scrolledBefore > 0,
                scrollTop: body.scrollTop,
            };
            reader.setBody('Tercero');
            state.textBody = body.textContent;

            // A second close is ignored: it must not unlock the scroll of another open modal
            const other = EchorathUI.modal({ title: 'Otro' });
            reader.close('hecho');
            reader.close('otra vez');
            state.value = await reader;
            state.stillLocked = document.documentElement.classList.contains('is-scroll-locked');
            other.close();
            await other;
            state.unlocked = !document.documentElement.classList.contains('is-scroll-locked');
            return state;
        });
        assert.deepEqual(result, {
            isDialog: true, title: 'Dos', label: 'Dos', body: 'Segundo', scrolledBefore: true, scrollTop: 0,
            textBody: 'Tercero', value: 'hecho', stillLocked: true, unlocked: true,
        });
        await page.waitForTimeout(400);
        assert.equal(await page.locator('.e-modal-overlay').count(), 0);
    });

    it('.e-prose sets long text in the reading face at 18px, about 66 characters per line', async () => {
        const prose = await page.evaluate(async () => {
            await document.fonts.load('18px Literata');
            const box = document.createElement('div');
            box.style.width = '720px';
            box.innerHTML = '<article class="e-prose"><p class="e-prose__meta">Ensayo · 2025</p><p></p></article>';
            const text = box.querySelectorAll('p')[1];
            text.textContent = 'Hay barrios que parecen copias de otros barrios, con la misma esquina y la misma pendiente. '.repeat(8);
            document.body.appendChild(box);
            const css = getComputedStyle(text);
            // characters on each full line (the last line of the paragraph is not full)
            const node = text.firstChild;
            const rows = new Map();
            for (let i = 0; i < node.length; i++) {
                const range = document.createRange();
                range.setStart(node, i);
                range.setEnd(node, i + 1);
                const top = Math.round(range.getBoundingClientRect().top);
                rows.set(top, (rows.get(top) || 0) + 1);
            }
            const full = [...rows.values()].slice(0, -1);
            const result = {
                family: css.fontFamily.split(',')[0].replace(/["']/g, ''),
                size: css.fontSize,
                lineHeight: Math.round(parseFloat(css.lineHeight) / parseFloat(css.fontSize) * 100) / 100,
                perLine: Math.round(full.reduce((a, b) => a + b, 0) / full.length),
                meta: getComputedStyle(box.querySelector('.e-prose__meta')).fontFamily.split(',')[0].replace(/["']/g, ''),
            };
            box.remove();
            return result;
        });
        assert.equal(prose.family, 'Literata');
        assert.equal(prose.size, '18px');
        assert.equal(prose.lineHeight, 1.7);
        assert.equal(prose.meta, 'JetBrains Mono', 'the details line keeps the interface face');
        assert.ok(prose.perLine >= 58 && prose.perLine <= 75, `${prose.perLine} characters per line`);
    });

    it('document base wins over an unlayered host reset', async () => {
        const result = await page.evaluate(() => {
            const reset = document.createElement('style');
            reset.textContent = ':root{color-scheme:light} body{font:14px system-ui,sans-serif}';
            document.head.prepend(reset);
            const out = {
                font: getComputedStyle(document.body).fontFamily,
                size: getComputedStyle(document.body).fontSize,
                scheme: getComputedStyle(document.documentElement).colorScheme,
            };
            reset.remove();
            return out;
        });
        assert.match(result.font, /JetBrains Mono/);
        assert.equal(result.size, '15px');
        assert.equal(result.scheme, 'dark');
    });

    it('text follows the text size the visitor sets in the browser', async () => {
        const sizes = {};
        for (const preference of [16, 24]) {
            const other = await browser.newPage({ viewport: { width: 1280, height: 900 } });
            other.on('pageerror', err => errors.push(err.message));
            const cdp = await other.context().newCDPSession(other);
            await cdp.send('Page.enable');
            await cdp.send('Page.setFontSizes', { fontSizes: { standard: preference } });
            await other.goto(exampleUrl, { waitUntil: 'load' });
            await other.waitForFunction(() => window.EchorathUI);
            sizes[preference] = await other.evaluate(() => ({
                root: getComputedStyle(document.documentElement).fontSize,
                body: getComputedStyle(document.body).fontSize,
                overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            }));
            await other.close();
        }
        assert.deepEqual([sizes[16].root, sizes[16].body], ['15px', '15px'], 'the usual default keeps the 15px base');
        assert.deepEqual([sizes[24].root, sizes[24].body], ['22.5px', '22.5px'], 'a larger default scales the base');
        assert.ok(sizes[24].overflow <= 0, `no sideways scroll with larger text (${sizes[24].overflow}px)`);
    });

    it('faint text meets WCAG AA contrast on surface and background', async () => {
        const ratios = await page.evaluate(() => {
            const rgb = token => {
                const probe = document.createElement('i');
                probe.style.color = `var(${token})`;
                document.body.appendChild(probe);
                const value = getComputedStyle(probe).color.match(/\d+/g).slice(0, 3).map(Number);
                probe.remove();
                return value;
            };
            const lum = c => {
                const v = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
                return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
            };
            const ratio = (a, b) => {
                const [l1, l2] = [lum(rgb(a)), lum(rgb(b))].sort((x, y) => y - x);
                return (l1 + 0.05) / (l2 + 0.05);
            };
            return {
                surface: ratio('--e-color-text-faint', '--e-color-surface'),
                bg: ratio('--e-color-text-faint', '--e-color-bg'),
            };
        });
        assert.ok(ratios.surface >= 4.5, `surface ${ratios.surface}`);
        assert.ok(ratios.bg >= 4.5, `bg ${ratios.bg}`);
    });

    it('an overlapping loadFor is not cut short by the earlier one', async () => {
        const states = await page.evaluate(async () => {
            const node = document.createElement('div');
            node.textContent = 'x';
            document.body.appendChild(node);
            const sleep = ms => new Promise(r => setTimeout(r, ms));
            EchorathUI.loadFor(node, 300, { reveal: false });
            await sleep(150);
            const second = EchorathUI.loadFor(node, 400, { reveal: false });
            await sleep(250);                       // first timer has fired by now
            const midway = node.hasAttribute('data-loading');
            await second;
            const done = node.hasAttribute('data-loading');
            node.remove();
            return { midway, done };
        });
        assert.deepEqual(states, { midway: true, done: false });
    });

    it('data-e-interactive keeps a control usable inside a loading container', async () => {
        const events = await page.evaluate(() => {
            const box = document.createElement('div');
            box.innerHTML = '<button data-e-interactive>a</button><button>b</button>';
            document.body.appendChild(box);
            EchorathUI.load(box);
            const [a, b] = box.querySelectorAll('button');
            const out = { a: getComputedStyle(a).pointerEvents, b: getComputedStyle(b).pointerEvents };
            EchorathUI.ready(box, { reveal: false });
            box.remove();
            return out;
        });
        assert.deepEqual(events, { a: 'auto', b: 'none' });
    });

    it('data-e-pause-on-hover stops the distortion on hover and keyboard focus, and only then', async () => {
        await page.evaluate(() => {
            const before = document.createElement('input');
            before.id = 'pause-before';
            before.style.cssText = 'position:fixed;top:250px;left:300px';
            document.body.appendChild(before);
            const card = document.createElement('div');
            card.id = 'pause-probe';
            card.style.cssText = 'position:fixed;top:300px;left:300px;width:200px;height:80px;z-index:5000;background:#111';
            card.innerHTML = 'Texto <button class="e-btn" type="button">Leer</button>';
            card.setAttribute('data-e-pause-on-hover', '');
            document.body.appendChild(card);
            EchorathUI.load(card);
        });
        const read = () => page.evaluate(() => {
            const s = getComputedStyle(document.getElementById('pause-probe'));
            return { animation: s.animationName, shadow: s.textShadow, events: s.pointerEvents };
        });

        await page.mouse.move(10, 10);
        const idle = await read();
        await page.mouse.move(400, 320);
        const hovered = await read();
        // Keyboard focus inside pauses
        await page.mouse.move(10, 10);
        await page.focus('#pause-before');
        await page.keyboard.press('Tab');
        const keyboard = await read();
        // Focus left by a mouse click does not keep it paused once the pointer leaves
        await page.mouse.click(10, 10);             // pointer interaction elsewhere first
        await page.click('#pause-probe button');
        await page.mouse.move(10, 10);
        const afterClick = await read();
        await page.evaluate(() => {
            document.getElementById('pause-probe').remove();
            document.getElementById('pause-before').remove();
        });

        assert.equal(idle.animation, 'e-distort-standard');
        assert.equal(idle.events, 'auto', 'the element must receive the pointer to detect hover');
        assert.deepEqual({ animation: hovered.animation, shadow: hovered.shadow }, { animation: 'none', shadow: 'none' });
        assert.equal(keyboard.animation, 'none');
        assert.equal(afterClick.animation, 'e-distort-standard');
    });

    it('modal size "lg" is wider and the page behind is scroll-locked while open', async () => {
        const pending = page.evaluate(() => EchorathUI.modal({ title: 'Leer', body: 'Texto', size: 'lg' }));
        await page.waitForSelector('.e-modal-overlay.is-open');
        const open = await page.evaluate(() => ({
            width: document.querySelector('.e-modal').offsetWidth,   // layout width, unaffected by the open transform
            locked: document.documentElement.classList.contains('is-scroll-locked'),
            overflow: getComputedStyle(document.documentElement).overflowY,
        }));
        await page.keyboard.press('Escape');
        await pending;
        const closed = await page.evaluate(() => document.documentElement.classList.contains('is-scroll-locked'));
        assert.equal(open.width, 720);
        assert.equal(open.locked, true);
        assert.equal(open.overflow, 'hidden');
        assert.equal(closed, false);
    });

    it('header publishes its height as --e-header-offset and supports --sticky', async () => {
        const result = await page.evaluate(() => {
            const header = document.querySelector('.e-header');
            const offset = getComputedStyle(document.documentElement).getPropertyValue('--e-header-offset').trim();
            const sticky = document.createElement('header');
            sticky.className = 'e-header e-header--sticky';
            document.body.appendChild(sticky);
            const position = getComputedStyle(sticky).position;
            sticky.remove();
            return { offset, height: Math.round(header.getBoundingClientRect().height), position };
        });
        assert.equal(result.offset, `${result.height}px`);
        assert.equal(result.position, 'sticky');
    });

    it('header content lines up with .e-container on wide screens', async () => {
        const wide = await browser.newPage({ viewport: { width: 1600, height: 900 } });
        await wide.goto(exampleUrl, { waitUntil: 'load' });
        await wide.waitForFunction(() => window.EchorathUI);
        const edges = await wide.evaluate(() => {
            const box = document.createElement('div');
            box.className = 'e-container';
            box.innerHTML = '<span>x</span>';
            document.body.appendChild(box);
            const content = box.firstElementChild.getBoundingClientRect().left;
            const brand = document.querySelector('.e-header .e-h1').getBoundingClientRect().left;
            const header = document.querySelector('.e-header').getBoundingClientRect();
            box.remove();
            return { content: Math.round(content), brand: Math.round(brand), left: header.left, width: header.width, viewport: innerWidth };
        });
        await wide.close();
        assert.equal(edges.brand, edges.content);
        assert.equal(edges.left, 0);
        // spans the viewport up to the 10px scrollbar the framework styles
        assert.ok(edges.width >= edges.viewport - 10, `header ${edges.width}px of ${edges.viewport}px`);
    });

    it('buttons and tabs are at least 44px tall on touch screens', async () => {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
        const touch = await context.newPage();
        await touch.goto(exampleUrl, { waitUntil: 'load' });
        await touch.waitForFunction(() => window.EchorathUI);
        const heights = await touch.evaluate(() => [...document.querySelectorAll('.e-btn, .e-tab')]
            .filter(el => el.getBoundingClientRect().height > 0)
            .map(el => ({ name: el.textContent.trim(), h: el.getBoundingClientRect().height }))
            .filter(item => item.h < 44));
        await context.close();
        assert.deepEqual(heights, []);
    });

    it('a distortion holds still while out of view, also one set by attribute after init', async () => {
        const other = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        other.on('pageerror', err => errors.push(err.message));
        await other.goto(exampleUrl, { waitUntil: 'load' });
        await other.waitForFunction(() => window.EchorathUI);
        const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 50))));
        const result = await other.evaluate(async frames => {
            frames = eval(frames);
            document.documentElement.style.scrollBehavior = 'auto';
            const spacer = document.createElement('div');
            spacer.style.height = '4000px';
            // Kept distorted on purpose, the way a page builds it: attribute first, then into the page
            const card = document.createElement('p');
            card.textContent = 'Siempre distorsionado';
            card.setAttribute('data-loading', '');
            card.setAttribute('data-e-pause-on-hover', '');
            const noisy = document.createElement('p');
            noisy.textContent = 'Ruido';
            document.body.append(spacer, card, noisy);
            EchorathUI.load(noisy, { variant: 'warp' });
            const seed = () => document.querySelector('#e-warp feTurbulence').getAttribute('seed');
            const state = () => ({
                offscreen: card.hasAttribute('data-e-offscreen'),
                play: card.getAnimations()[0] && card.getAnimations()[0].playState,
            });
            scrollTo(0, 0);
            await frames();
            const away = state();
            const seeds = new Set();
            for (let i = 0; i < 6; i++) { seeds.add(seed()); await new Promise(done => setTimeout(done, 60)); }
            card.scrollIntoView();
            await frames();
            const back = state();
            const liveSeeds = new Set();
            for (let i = 0; i < 6; i++) { liveSeeds.add(seed()); await new Promise(done => setTimeout(done, 60)); }
            EchorathUI.ready(noisy, { reveal: false });
            card.removeAttribute('data-loading');
            await frames();
            const after = card.hasAttribute('data-e-offscreen');
            spacer.remove(); card.remove(); noisy.remove();
            scrollTo(0, 0);
            return { away, back, awaySeeds: seeds.size, liveSeeds: liveSeeds.size, after };
        }, frames.toString());
        await other.close();
        assert.deepEqual(result.away, { offscreen: true, play: 'paused' }, 'out of view: paused');
        assert.equal(result.awaySeeds, 1, 'the noise loop sleeps while its only user is out of view');
        assert.deepEqual(result.back, { offscreen: false, play: 'running' }, 'back in view: running');
        assert.ok(result.liveSeeds > 1, 'the noise loop wakes up when its user comes back');
        assert.equal(result.after, false, 'no longer loading: no longer marked');
    });

    it('printing gives black text on white, and only the open dialog, in full', async () => {
        const other = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        other.on('pageerror', err => errors.push(err.message));
        await other.goto(exampleUrl, { waitUntil: 'load' });
        await other.waitForFunction(() => window.EchorathUI);
        const bar = () => other.evaluate(() => getComputedStyle(document.querySelector('.e-header')).position);
        const onScreen = await bar();
        await other.evaluate(() => {
            const text = document.createElement('div');
            text.className = 'e-prose';
            for (let i = 0; i < 40; i++) text.insertAdjacentHTML('beforeend', '<p>Un párrafo largo que no cabe en la pantalla y tiene que salir entero en el papel.</p>');
            EchorathUI.modal({ title: 'Texto', body: text, size: 'lg' });
        });
        await other.waitForTimeout(400);
        await other.emulateMedia({ media: 'print' });
        const printed = await other.evaluate(() => {
            const overlay = document.querySelector('.e-modal-overlay.is-open');
            const body = overlay.querySelector('.e-modal__body');
            const behind = [...document.body.children].filter(node => node !== overlay && !/^(SCRIPT|STYLE|LINK)$/.test(node.tagName));
            return {
                page: getComputedStyle(document.body).backgroundColor,
                ink: getComputedStyle(body.querySelector('p')).color,
                behindShown: behind.filter(node => getComputedStyle(node).display !== 'none').length,
                overlay: getComputedStyle(overlay).position,
                clipped: body.scrollHeight - body.clientHeight,
                close: getComputedStyle(overlay.querySelector('.e-modal__close')).display,
                foot: getComputedStyle(overlay.querySelector('.e-modal__foot')).display,
            };
        });
        const onPaper = await bar();
        await other.close();
        assert.deepEqual([onScreen !== 'static', onPaper], [true, 'static'], 'the bar prints once, not on every sheet');
        assert.equal(printed.page, 'rgb(255, 255, 255)');
        assert.equal(printed.ink, 'rgb(0, 0, 0)');
        assert.equal(printed.behindShown, 0, 'nothing behind the dialog prints');
        assert.equal(printed.overlay, 'static', 'the dialog flows on the page instead of repeating on every sheet');
        assert.ok(printed.clipped <= 1, `the whole text prints (${printed.clipped}px cut off)`);
        assert.deepEqual([printed.close, printed.foot], ['none', 'none'], 'buttons stay off the paper');
    });

    it('the switch shows on and off in a contrast theme (forced colors)', async () => {
        const other = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        other.on('pageerror', err => errors.push(err.message));
        await other.emulateMedia({ forcedColors: 'active' });
        await other.goto(exampleUrl, { waitUntil: 'load' });
        await other.waitForFunction(() => window.EchorathUI);
        const knob = await other.evaluate(() => {
            // Read the end colors, not a frame of the 0.4s color transition
            const still = document.createElement('style');
            still.textContent = '*, *::before { transition: none !important; }';
            document.head.appendChild(still);
            const input = document.querySelector('.e-switch input');
            const track = input.nextElementSibling;
            const read = () => getComputedStyle(track, '::before').backgroundColor;
            input.checked = false;
            const off = read();
            input.checked = true;
            const on = read();
            return { off, on, track: getComputedStyle(track).backgroundColor };
        });
        await other.close();
        assert.notEqual(knob.off, knob.track, 'the knob stands out from its track when off');
        assert.notEqual(knob.on, knob.track, 'and when on');
        assert.notEqual(knob.on, knob.off, 'on and off look different');
    });

    it('no distortion dims and brightens more than 3 times a second (WCAG 2.3.1)', async () => {
        const rates = await page.evaluate(() => {
            const out = {};
            for (const variant of EchorathUI.variants) {
                if (variant === 'decode') continue;   // changes letters, not brightness
                const box = document.createElement('div');
                box.className = 'e-panel';
                box.textContent = 'Muestra';
                document.body.appendChild(box);
                EchorathUI.load(box, { variant });
                const anim = box.getAnimations().find(a => a.effect.getTiming().iterations === Infinity);
                // A flash is a pair of opposite changes in brightness: count the
                // reversals of opacity over one second of the animation
                let reversals = 0;
                let direction = 0;
                let last = null;
                if (anim) {
                    anim.pause();
                    for (let t = 0; t <= 1000; t += 5) {
                        anim.currentTime = t;
                        const opacity = parseFloat(getComputedStyle(box).opacity);
                        if (last !== null && Math.abs(opacity - last) >= 0.05) {
                            const now = Math.sign(opacity - last);
                            if (now !== direction) {
                                reversals++;
                                direction = now;
                            }
                        }
                        last = opacity;
                    }
                }
                EchorathUI.ready(box, { reveal: false });
                box.remove();
                out[variant] = reversals / 2;
            }
            return out;
        });
        for (const [variant, flashes] of Object.entries(rates)) {
            assert.ok(flashes <= 3, `${variant}: ${flashes} flashes in one second`);
        }
    });

    it('loads its fonts from its own files, with no request to another server', async () => {
        const other = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        other.on('pageerror', err => errors.push(err.message));
        const remote = [];
        other.on('request', request => { if (/^https?:/.test(request.url())) remote.push(request.url()); });
        await other.goto(exampleUrl, { waitUntil: 'load' });
        await other.waitForFunction(() => window.EchorathUI);
        const loaded = await other.evaluate(async () => {
            await document.fonts.ready;
            return [...new Set([...document.fonts].filter(face => face.status === 'loaded').map(face => face.family.replace(/["']/g, '')))].sort();
        });
        await other.close();
        assert.deepEqual(remote, [], 'no request leaves the page');
        assert.ok(loaded.includes('Orbitron') && loaded.includes('JetBrains Mono'), `loaded: ${loaded.join(', ')}`);
    });

    it('on a touch screen a tapped button does not keep its hover look', async () => {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
        const touch = await context.newPage();
        touch.on('pageerror', err => errors.push(err.message));
        await touch.goto(exampleUrl, { waitUntil: 'load' });
        await touch.waitForFunction(() => window.EchorathUI);
        const look = () => touch.evaluate(() => {
            const button = document.querySelector('#__tap');
            return { hovered: button.matches(':hover'), fill: getComputedStyle(button, '::before').transform, glow: getComputedStyle(button).boxShadow };
        });
        await touch.evaluate(() => {
            const button = document.createElement('button');
            button.id = '__tap';
            button.className = 'e-btn';
            button.textContent = 'Tocar';
            button.style.cssText = 'position: fixed; top: 300px; left: 20px; transition: none';
            document.body.appendChild(button);
        });
        await touch.locator('#__tap').tap();
        await touch.waitForTimeout(400);
        const tapped = await look();
        await context.close();
        assert.equal(tapped.hovered, true, 'the browser does consider it hovered after the tap');
        assert.ok(tapped.fill === 'none' || /matrix\(0,/.test(tapped.fill), `fill stays swept out (${tapped.fill})`);
        assert.equal(tapped.glow, 'none', 'no glow');
    });

    it('a word too long for its line breaks instead of running out of its box', async () => {
        const spill = await page.evaluate(() => {
            const box = document.createElement('p');
            box.style.cssText = 'width: 200px';
            box.textContent = 'Lee https://www.ejemplo-de-revista-cultural.com/archivo/2025/entrevistas/una-ruta-muy-larga';
            document.body.appendChild(box);
            const out = box.scrollWidth - box.clientWidth;
            box.remove();
            return out;
        });
        assert.ok(spill <= 0, `${spill}px out of the box`);
    });

    it('the border of a field and of a switch stands out 3:1 from around it (WCAG 1.4.11)', async () => {
        const ratios = await page.evaluate(() => {
            const rgb = color => color.match(/[\d.]+/g).slice(0, 3).map(Number);
            const lum = ([r, g, b]) => {
                const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
                return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
            };
            const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
            const surface = rgb(getComputedStyle(document.documentElement).getPropertyValue('--e-color-surface').trim().replace(/^#(..)(..)(..)$/, (_, r, g, b) => `rgb(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)})`));
            const field = document.createElement('input');
            field.className = 'e-input';
            document.body.appendChild(field);
            const out = {
                field: contrast(rgb(getComputedStyle(field).borderTopColor), surface),
                track: contrast(rgb(getComputedStyle(document.querySelector('.e-switch__track')).borderTopColor), surface),
            };
            field.remove();
            return out;
        });
        assert.ok(ratios.field >= 3, `field border ${ratios.field.toFixed(2)}:1`);
        assert.ok(ratios.track >= 3, `switch border ${ratios.track.toFixed(2)}:1`);
    });

    it('a toast stays as long as it takes to read, and waits while the pointer is on it', async () => {
        const other = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        other.on('pageerror', err => errors.push(err.message));
        await other.goto(exampleUrl, { waitUntil: 'load' });
        await other.waitForFunction(() => window.EchorathUI);
        const alive = () => other.evaluate(() => [...document.querySelectorAll('.e-toast')].map(t => t.textContent));
        // twelve words: about 5 s to notice and read; the default would remove it at 3 s
        await other.evaluate(() => EchorathUI.toast('Modo efectos activado', 'Cada componente muestra un botón para probar sus distorsiones ahora.', 'ok'));
        await other.waitForTimeout(4000);
        const longOne = (await alive()).length;
        await other.waitForTimeout(2500);
        const longGone = (await alive()).length;
        // a short one, held under the pointer well past its time, then let go
        await other.evaluate(() => EchorathUI.toast('Copiado'));
        await other.waitForTimeout(300);
        const box = await other.locator('.e-toast').boundingBox();
        await other.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await other.waitForTimeout(4500);
        const held = (await alive()).length;
        await other.mouse.move(5, 5);
        await other.waitForTimeout(3500);   // the rest of its time, not a fresh start
        const released = (await alive()).length;
        await other.close();
        assert.equal(longOne, 1, 'a long toast is still there after 4 s');
        assert.equal(longGone, 0, 'and goes after it has been read');
        assert.equal(held, 1, 'a toast under the pointer stays');
        assert.equal(released, 0, 'and goes once the pointer leaves');
    });

    it('labels are at least 11.25px, the smallest size iOS and Android use', async () => {
        const size = await page.evaluate(() => {
            const label = document.createElement('span');
            label.className = 'e-label';
            label.textContent = 'Etiqueta';
            document.body.appendChild(label);
            const px = parseFloat(getComputedStyle(label).fontSize);
            label.remove();
            return px;
        });
        assert.ok(size >= 11.25, `e-label is ${size}px`);
    });

    it('with the system asking for more contrast, faint text reaches 7:1 (WCAG AAA)', async () => {
        const read = async contrast => {
            const other = await browser.newPage({ viewport: { width: 1280, height: 900 } });
            other.on('pageerror', err => errors.push(err.message));
            await other.emulateMedia({ contrast });
            await other.goto(exampleUrl, { waitUntil: 'load' });
            await other.waitForFunction(() => window.EchorathUI);
            const ratio = await other.evaluate(() => {
                const hex = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim().match(/[\da-f]{2}/gi).map(h => parseInt(h, 16));
                const lum = ([r, g, b]) => {
                    const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
                    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
                };
                const [a, b] = [lum(hex('--e-color-text-faint')), lum(hex('--e-color-surface'))].sort((x, y) => y - x);
                return (a + 0.05) / (b + 0.05);
            });
            await other.close();
            return ratio;
        };
        const usual = await read('no-preference');
        const more = await read('more');
        assert.ok(usual >= 4.5, `faint text ${usual.toFixed(2)}:1 by default (AA)`);
        assert.ok(more >= 7, `faint text ${more.toFixed(2)}:1 with more contrast (AAA)`);
    });

    it('the scrollbar thumb stands out 3:1 from its track and the bar is 10px wide', async () => {
        // Chromium hides scrollbars when it runs for tests; this browser shows them
        const shown = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', ignoreDefaultArgs: ['--hide-scrollbars'] });
        try {
            const other = await shown.newPage({ viewport: { width: 1280, height: 600 } });
            await other.goto(exampleUrl, { waitUntil: 'load' });
            const width = await other.evaluate(() => innerWidth - document.documentElement.clientWidth);
            const png = await other.screenshot({ clip: { x: 1280 - width, y: 0, width, height: 600 } });
            // the colours on screen: the track is the most common one, the thumb the other one down the middle
            const contrast = await other.evaluate(async b64 => {
                const img = new Image();
                img.src = `data:image/png;base64,${b64}`;
                await img.decode();
                const canvas = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height });
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const middle = Math.floor(img.width / 2);
                const column = ctx.getImageData(middle, 0, 1, img.height).data;
                const counts = new Map();
                for (let i = 0; i < column.length; i += 4) {
                    const key = `${column[i]},${column[i + 1]},${column[i + 2]}`;
                    counts.set(key, (counts.get(key) || 0) + 1);
                }
                const [track, thumb] = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key.split(',').map(Number));
                const lum = ([r, g, b]) => {
                    const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
                    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
                };
                const [a, b] = [lum(track), lum(thumb)].sort((x, y) => y - x);
                return (a + 0.05) / (b + 0.05);
            }, png.toString('base64'));
            assert.equal(width, 10);
            assert.ok(contrast >= 3, `thumb ${contrast.toFixed(2)}:1 against the track`);
        } finally {
            await shown.close();
        }
    });

    it('raised no page errors', () => {
        assert.deepEqual(errors, []);
    });
});
