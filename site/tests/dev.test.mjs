import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startDevServer } from '../dev.mjs';

test('the development server serves the site where GitHub Pages does, with live reload', async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'echorath-dev-'));
    const server = await startDevServer({ port: 0, outDir, watch: false, log: () => {} });
    try {
        const { origin, pathname } = new URL(server.url);
        assert.equal(pathname, '/Echorath/dev/');
        const home = await fetch(`${origin}/`, { redirect: 'manual' });
        assert.equal(home.status, 302);
        assert.equal(home.headers.get('location'), '/Echorath/dev/');
        const page = await fetch(server.url);
        assert.equal(page.status, 200);
        const html = await page.text();
        assert.match(html, /new EventSource\('\/__dev\/events'\)/);
        assert.ok(html.indexOf('/__dev/events') < html.indexOf('</body>'));
        assert.doesNotMatch(fs.readFileSync(path.join(outDir, 'index.html'), 'utf8'), /__dev/, 'the built file stays clean');
        const css = await fetch(`${server.url}site.css`);
        assert.equal(css.headers.get('content-type'), 'text/css; charset=utf-8');
        const missing = await fetch(`${server.url}no/existe`);
        assert.equal(missing.status, 404);
        assert.match(await missing.text(), /Esta página no existe/);
    } finally {
        await server.close();
    }
});
