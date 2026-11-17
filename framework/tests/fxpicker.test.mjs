/**
 * Effect picker: one button per distortion.
 *
 *   npm test
 */
import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureUrl = pathToFileURL(resolve(root, 'tests/fixtures/effects.html')).href;
const ALL = ['standard', 'flicker', 'glitch', 'scan', 'wave', 'shatter', 'warp', 'static', 'decode'];
const DURATION = 500;

describe('fxPicker', () => {
    let browser;
    let page;
    const errors = [];

    before(async () => {
        browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
    });

    after(async () => {
        await browser?.close();
    });

    beforeEach(async () => {
        await page?.close();
        page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
        page.on('pageerror', err => errors.push(err.message));
        await page.goto(fixtureUrl, { waitUntil: 'load' });
        await page.waitForFunction(() => window.EchorathUI);
    });

    /** Mount a picker right after a component of the fixture. */
    const mount = (name, opts = {}) => page.evaluate(([n, o]) => {
        const target = document.getElementById(`c-${n}`);
        const picker = EchorathUI.fxPicker(target, { name: n, ...o });
        picker.id = `fx-${n}`;
        target.after(picker);
    }, [name, { duration: DURATION, ...opts }]);

    const state = name => page.evaluate(n => {
        const target = document.getElementById(`c-${n}`);
        const picker = document.getElementById(`fx-${n}`);
        return {
            loading: target.hasAttribute('data-loading'),
            variant: target.getAttribute('data-distort'),
            reveal: target.hasAttribute('data-reveal'),
            busy: target.getAttribute('aria-busy'),
            pause: target.hasAttribute('data-e-pause-on-hover'),
            pressed: [...picker.querySelectorAll('.e-fx__option[aria-pressed="true"]')].map(b => b.dataset.variant),
        };
    }, name);

    const option = (name, variant) => `#fx-${name} .e-fx__option[data-variant="${variant}"]`;

    it('offers every variant for text targets and all but decode for containers', async () => {
        await mount('heading');
        await mount('panel');
        const lists = await page.evaluate(() => ({
            heading: [...document.querySelectorAll('#fx-heading .e-fx__option')].map(b => b.textContent),
            panel: [...document.querySelectorAll('#fx-panel .e-fx__option')].map(b => b.textContent),
            label: document.getElementById('fx-panel').getAttribute('aria-label'),
            role: document.getElementById('fx-panel').getAttribute('role'),
        }));
        assert.deepEqual(lists.heading, ALL);
        assert.deepEqual(lists.panel, ALL.filter(v => v !== 'decode'));
        assert.equal(lists.label, 'Efectos de panel');
        assert.equal(lists.role, 'group');
    });

    it('each toggle says whose effects it shows, starting with its visible label', async () => {
        await mount('heading');
        await mount('panel');
        const names = await page.evaluate(() => ['heading', 'panel'].map(n => {
            const t = document.querySelector(`#fx-${n} .e-fx__toggle`);
            return [t.textContent, t.getAttribute('aria-label')];
        }));
        assert.deepEqual(names, [['Efectos', 'Efectos de heading'], ['Efectos', 'Efectos de panel']]);
    });

    it('a name that starts with "el" reads "del" (Efectos del panel)', async () => {
        const labels = await page.evaluate(() => {
            const picker = EchorathUI.fxPicker(document.getElementById('c-panel'), { name: 'el panel' });
            return [picker.getAttribute('aria-label'), picker.querySelector('.e-fx__toggle').getAttribute('aria-label')];
        });
        assert.deepEqual(labels, ['Efectos del panel', 'Efectos del panel']);
    });

    it('starts collapsed, and the toggle shows and hides the options', async () => {
        await mount('panel');
        const read = () => page.evaluate(() => ({
            expanded: document.querySelector('#fx-panel .e-fx__toggle').getAttribute('aria-expanded'),
            hidden: document.querySelector('#fx-panel .e-fx__list').hidden,
        }));
        assert.deepEqual(await read(), { expanded: 'false', hidden: true });
        await page.click('#fx-panel .e-fx__toggle');
        assert.deepEqual(await read(), { expanded: 'true', hidden: false });
        await page.click('#fx-panel .e-fx__toggle');
        assert.deepEqual(await read(), { expanded: 'false', hidden: true });
    });

    it('each button plays exactly its own variant', async () => {
        await mount('heading', { open: true });
        for (const variant of ALL) {
            await page.click(option('heading', variant));
            const s = await state('heading');
            assert.equal(s.variant, variant, `${variant} button played ${s.variant}`);
            assert.deepEqual(s.pressed, [variant]);
        }
        await page.click(option('heading', 'decode'));   // stop the last one
        await page.waitForTimeout(800);
        assert.equal(await page.evaluate(() => document.getElementById('c-heading').textContent), 'Escritura');
    });

    it('plays for the set duration with a countdown bar, then ends clean', async () => {
        await mount('panel', { open: true });
        await page.click(option('panel', 'scan'));
        const bar = await page.evaluate(sel => {
            const s = getComputedStyle(document.querySelector(sel), '::after');
            return { animation: s.animationName, duration: s.animationDuration };
        }, option('panel', 'scan'));
        const during = await state('panel');
        await page.waitForTimeout(DURATION + 900);
        const after = await state('panel');
        assert.deepEqual(bar, { animation: 'e-anim-countdown', duration: `${DURATION / 1000}s` });
        assert.equal(during.loading, true);
        assert.deepEqual(during.pressed, ['scan']);
        assert.deepEqual({ loading: after.loading, reveal: after.reveal, pressed: after.pressed }, { loading: false, reveal: false, pressed: [] });
    });

    it('switching option mid-effect plays the new one for its full duration', async () => {
        await mount('panel', { open: true });
        await page.click(option('panel', 'glitch'));
        await page.waitForTimeout(300);
        await page.click(option('panel', 'wave'));
        await page.waitForTimeout(350);                 // past the first effect's end
        const mid = await state('panel');
        await page.waitForTimeout(400);
        const end = await state('panel');
        assert.deepEqual({ loading: mid.loading, variant: mid.variant, pressed: mid.pressed }, { loading: true, variant: 'wave', pressed: ['wave'] });
        assert.deepEqual({ loading: end.loading, pressed: end.pressed }, { loading: false, pressed: [] });
    });

    it('pressing the playing option again stops it, with no late reveal', async () => {
        await mount('panel', { open: true });
        await page.click(option('panel', 'shatter'));
        await page.waitForTimeout(150);
        await page.click(option('panel', 'shatter'));
        const stopped = await state('panel');
        await page.waitForTimeout(800);                 // the 500ms timer has fired by now
        await page.waitForTimeout(100);
        const later = await state('panel');
        assert.deepEqual({ loading: stopped.loading, pressed: stopped.pressed }, { loading: false, pressed: [] });
        assert.deepEqual({ loading: later.loading, reveal: later.reveal }, { loading: false, reveal: false });
    });

    it('a target that is distorted on purpose gets its distortion, pause and aria-busy back', async () => {
        await page.evaluate(() => {
            const card = document.getElementById('c-panel');
            card.setAttribute('data-e-pause-on-hover', '');
            EchorathUI.load(card, { variant: 'standard' });
            card.removeAttribute('aria-busy');          // decorative, as the portfolio does
        });
        await mount('panel', { open: true });
        await page.click(option('panel', 'warp'));
        const during = await state('panel');
        await page.waitForTimeout(DURATION + 300);
        const after = await state('panel');
        assert.deepEqual({ variant: during.variant, pause: during.pause }, { variant: 'warp', pause: false });
        assert.deepEqual(after, { loading: true, variant: 'standard', reveal: false, busy: null, pause: true, pressed: [] });
    });

    it('Escape closes the options and returns focus to the toggle', async () => {
        await mount('panel', { open: true });
        await page.focus(option('panel', 'flicker'));
        await page.keyboard.press('Escape');
        const result = await page.evaluate(() => ({
            hidden: document.querySelector('#fx-panel .e-fx__list').hidden,
            focus: document.activeElement.classList.contains('e-fx__toggle'),
        }));
        assert.deepEqual(result, { hidden: true, focus: true });
    });

    it('a manual ready() retires a pending wait, so its timer cannot reveal again', async () => {
        const lateReveal = await page.evaluate(async () => {
            const sleep = ms => new Promise(r => setTimeout(r, ms));
            const node = document.getElementById('c-panel');
            EchorathUI.loadFor(node, 400);                 // would reveal when its timer fires
            await sleep(100);
            EchorathUI.ready(node, { reveal: false });     // ended by hand, no reveal wanted
            await sleep(450);                           // the timer has fired by now
            return node.hasAttribute('data-reveal') || node.hasAttribute('data-loading');
        });
        assert.equal(lateReveal, false);
    });

    it('raised no page errors', () => {
        assert.deepEqual(errors, []);
    });
});
