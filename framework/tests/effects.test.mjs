/**
 * Effect quality tests: every distortion on every kind of component.
 *
 *   npm test
 *
 * For each variant × component:
 *   - the effect is visible (frames differ from the resting image)
 *   - nothing around it moves (no layout shift: the neighbour probe and the
 *     target's layout box stay put)
 *   - the component ends pixel-identical to how it started, with its text
 *     intact and no attribute or style left behind
 * Plus behavior: horizontal overflow on phones, re-triggering, switching
 * variant mid-effect, overlapping reveals, the noise loop, reduced motion.
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launchChromium } from './helpers/browser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureUrl = pathToFileURL(resolve(root, 'tests/fixtures/effects.html')).href;

const VARIANTS = ['standard', 'flicker', 'glitch', 'scan', 'wave', 'shatter', 'warp', 'static', 'decode'];
const COMPONENTS = ['panel', 'button', 'badge', 'label', 'heading', 'inline', 'table', 'canvas', 'wide'];
const TEXT_ONLY = new Set(['button', 'badge', 'label', 'heading', 'inline']);
const REVEAL_MS = 700;
const DECODE_STEP_MS = 28;

async function openFixture(browser, options = {}) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1100 }, ...options });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(fixtureUrl, { waitUntil: 'load' });
    await page.waitForFunction(() => window.EchorathUI && document.getElementById('e-distort-defs'));
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(0, 0);
    return { context, page, errors };
}

/**
 * Screenshot a fixed region around a component: its resting box plus a margin,
 * so frames are directly comparable and transformed pixels stay in view.
 * (locator.screenshot() would wait for the element to stop moving.)
 */
async function regionOf(page, name, margin = 12) {
    const box = await page.evaluate(n => {
        const r = document.getElementById(`c-${n}`).getBoundingClientRect();
        return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height };
    }, name);
    return {
        x: Math.max(0, Math.floor(box.x - margin)),
        y: Math.max(0, Math.floor(box.y - margin)),
        width: Math.ceil(box.width + 2 * margin),
        height: Math.ceil(box.height + 2 * margin),
    };
}

const shoot = (page, clip) => page.screenshot({ clip, fullPage: true });

/** Layout and finish state of a component, read in the page. */
function snapshot(page, name) {
    return page.evaluate(n => {
        const target = document.getElementById(`c-${n}`);
        const probe = document.getElementById(`p-${n}`).getBoundingClientRect();
        const s = getComputedStyle(target);
        // An inline target's own box changes shape when boxed (inline → inline-block);
        // what must not move is the line it sits in, so measure its paragraph.
        const box = n === 'inline' ? target.parentElement : target;
        return {
            layout: {
                probe: [Math.round(probe.left), Math.round(probe.top)],
                box: [box.offsetWidth, box.offsetHeight],
            },
            text: target.textContent,
            finish: {
                transform: s.transform,
                clipPath: s.clipPath,
                filter: s.filter,
                textShadow: s.textShadow,
                opacity: s.opacity,
                inlineStyle: target.getAttribute('style'),
                attrs: ['data-loading', 'data-reveal', 'data-decoding', 'aria-busy'].filter(a => target.hasAttribute(a)),
            },
        };
    }, name);
}

describe('effects on every component', () => {
    let browser;
    let page;
    let errors;

    before(async () => {
        browser = await launchChromium();
        ({ page, errors } = await openFixture(browser));
    });

    after(async () => {
        await browser?.close();
    });

    for (const variant of VARIANTS) {
        for (const name of COMPONENTS) {
            const effective = variant === 'decode' && !TEXT_ONLY.has(name) ? 'standard (decode fallback)' : variant;

            it(`${variant} · ${name}`, async () => {
                const clip = await regionOf(page, name);
                const rest = await shoot(page, clip);
                const before = await snapshot(page, name);

                await page.evaluate(([n, v]) => EchorathUI.load(`#c-${n}`, { variant: v }), [name, variant]);

                let visible = false;
                const shifts = [];
                for (let i = 0; i < 6; i++) {
                    await page.waitForTimeout(60);
                    if (!(await shoot(page, clip)).equals(rest)) visible = true;
                    const during = await snapshot(page, name);
                    if (JSON.stringify(during.layout) !== JSON.stringify(before.layout)) shifts.push(during.layout);
                }

                await page.evaluate(n => EchorathUI.ready(`#c-${n}`), name);
                const decodeTail = variant === 'decode' ? before.text.length * DECODE_STEP_MS : 0;
                await page.waitForTimeout(REVEAL_MS + decodeTail + 150);

                const end = await shoot(page, clip);
                const afterEffect = await snapshot(page, name);

                assert.ok(visible, `${effective}: no visible change on ${name}`);
                assert.deepEqual(shifts, [], `${effective}: layout moved on ${name} (before ${JSON.stringify(before.layout)})`);
                assert.equal(afterEffect.text, before.text, 'text changed');
                assert.deepEqual(afterEffect.finish, before.finish, 'state left behind');
                assert.ok(end.equals(rest), `${effective}: ${name} does not end pixel-identical to its resting state`);
            });
        }
    }

    it('raised no page errors', () => {
        assert.deepEqual(errors, []);
    });
});

describe('effect behavior', () => {
    let browser;

    before(async () => {
        browser = await launchChromium();
    });

    after(async () => {
        await browser?.close();
    });

    it('no variant makes a phone page scroll sideways', async () => {
        const { context, page } = await openFixture(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
        const overflow = {};
        for (const variant of VARIANTS) {
            await page.evaluate(v => EchorathUI.load('#c-wide', { variant: v }), variant);
            let worst = 0;
            for (let i = 0; i < 8; i++) {
                await page.waitForTimeout(50);
                worst = Math.max(worst, await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
            }
            await page.evaluate(() => EchorathUI.ready('#c-wide', { reveal: false }));
            if (worst > 0) overflow[variant] = worst;
        }
        await context.close();
        assert.deepEqual(overflow, {}, 'horizontal overflow in px per variant');
    });

    it('re-triggering decode while its text is still revealing keeps the original text', async () => {
        const { context, page } = await openFixture(browser);
        const text = await page.evaluate(async () => {
            const sleep = ms => new Promise(r => setTimeout(r, ms));
            await EchorathUI.loadFor('#c-heading', 200, { variant: 'decode', reveal: false });
            await sleep(60);                                   // reveal is mid-way now
            await EchorathUI.loadFor('#c-heading', 200, { variant: 'decode', reveal: false });
            await sleep(600);
            return document.getElementById('c-heading').textContent;
        });
        await context.close();
        assert.equal(text, 'Escritura');
    });

    it('switching variant mid-effect plays the new one and ends clean', async () => {
        const { context, page } = await openFixture(browser);
        const result = await page.evaluate(async () => {
            const sleep = ms => new Promise(r => setTimeout(r, ms));
            const node = document.getElementById('c-panel');
            EchorathUI.loadFor(node, 400, { variant: 'scan' });
            await sleep(150);
            const second = EchorathUI.loadFor(node, 400, { variant: 'warp' });
            await sleep(50);
            const during = { variant: node.getAttribute('data-distort'), animation: getComputedStyle(node).animationName, filter: getComputedStyle(node).filter };
            await second;
            await sleep(800);
            const s = getComputedStyle(node);
            return { during, after: { loading: node.hasAttribute('data-loading'), clip: s.clipPath, filter: s.filter, transform: s.transform } };
        });
        await context.close();
        assert.equal(result.during.variant, 'warp');
        assert.equal(result.during.animation, 'e-anim-flicker');
        assert.match(result.during.filter, /#e-warp/);
        assert.deepEqual(result.after, { loading: false, clip: 'none', filter: 'none', transform: 'none' });
    });

    it('switching from decode to another variant restores the text at once', async () => {
        const { context, page } = await openFixture(browser);
        const result = await page.evaluate(async () => {
            const sleep = ms => new Promise(r => setTimeout(r, ms));
            const node = document.getElementById('c-heading');
            EchorathUI.load(node, { variant: 'decode' });
            await sleep(150);
            const scrambled = node.textContent !== 'Escritura';
            EchorathUI.load(node, { variant: 'scan' });
            const restored = node.textContent;
            await sleep(150);
            const stillRestored = node.textContent;
            EchorathUI.ready(node, { reveal: false });
            return { scrambled, restored, stillRestored, decoding: node.hasAttribute('data-decoding'), style: node.getAttribute('style') };
        });
        await context.close();
        assert.deepEqual(result, { scrambled: true, restored: 'Escritura', stillRestored: 'Escritura', decoding: false, style: null });
    });

    it('a second reveal is not cut short by the first one\'s timer', async () => {
        const { context, page } = await openFixture(browser);
        const stillRevealing = await page.evaluate(async () => {
            const sleep = ms => new Promise(r => setTimeout(r, ms));
            const node = document.getElementById('c-panel');
            EchorathUI.load(node); EchorathUI.ready(node);          // reveal 1 starts
            await sleep(400);
            EchorathUI.load(node); EchorathUI.ready(node);          // reveal 2 starts
            await sleep(450);                                 // reveal 1's timer has fired by now
            return node.hasAttribute('data-reveal');
        });
        await context.close();
        assert.equal(stillRevealing, true);
    });

    it('the noise loop stops after warp and static end, and when the element is removed', async () => {
        const { context, page } = await openFixture(browser);
        const result = await page.evaluate(async () => {
            const sleep = ms => new Promise(r => setTimeout(r, ms));
            const seeds = () => [...document.querySelectorAll('#e-distort-defs feTurbulence')].map(n => n.getAttribute('seed')).join(',');
            const moving = async () => { const a = seeds(); await sleep(300); return a !== seeds(); };

            EchorathUI.load('#c-panel', { variant: 'warp' });
            const whileWarp = await moving();
            EchorathUI.ready('#c-panel', { reveal: false });
            const afterReady = await moving();

            const node = document.getElementById('c-table');
            EchorathUI.load(node, { variant: 'static' });
            const whileStatic = await moving();
            node.remove();                                    // removed without ready()
            await sleep(150);
            const afterRemove = await moving();
            return { whileWarp, afterReady, whileStatic, afterRemove };
        });
        await context.close();
        assert.deepEqual(result, { whileWarp: true, afterReady: false, whileStatic: true, afterRemove: false });
    });

    it('reduced motion: no variant animates, scrambles text or leaves a split', async () => {
        const { context, page } = await openFixture(browser, { reducedMotion: 'reduce' });
        const offenders = {};
        for (const variant of VARIANTS) {
            const state = await page.evaluate(async v => {
                const node = document.getElementById('c-heading');
                EchorathUI.load(node, { variant: v });
                await new Promise(r => setTimeout(r, 200));
                const s = getComputedStyle(node);
                const out = { animation: s.animationName, transform: s.transform, filter: s.filter, shadow: s.textShadow, text: node.textContent };
                EchorathUI.ready(node, { reveal: false });
                await new Promise(r => setTimeout(r, 100));
                return out;
            }, variant);
            const clean = state.animation === 'none' && state.transform === 'none' && state.filter === 'none'
                && state.shadow === 'none' && state.text === 'Escritura';
            if (!clean) offenders[variant] = state;
        }
        await context.close();
        assert.deepEqual(offenders, {});
    });
});
