// Works on the site with live reload:
//
//   npm run dev [-- --port=4000]
//
// Builds the development site into .dev-build/ and serves it at
// http://localhost:4000/Echorath/dev/, the same address it has on GitHub
// Pages, so links and the 404 page behave as they will there. Saving any file
// in site/ or framework/dist/ rebuilds it and reloads the browser. If the
// content has a mistake, the terminal and a red strip on the page say where,
// and the last good build stays in place.

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from './build.mjs';

const SITE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SITE, '..');

const TYPES = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json', '.map': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
    '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
};

// Added to every page this server sends, never to the built files
const CLIENT = `<script>
(() => {
    const events = new EventSource('/__dev/events');
    events.addEventListener('reload', () => location.reload());
    events.addEventListener('failed', event => {
        let strip = document.getElementById('__dev-error');
        if (!strip) {
            strip = document.createElement('pre');
            strip.id = '__dev-error';
            strip.style.cssText = 'position:fixed;inset:0 0 auto 0;z-index:99999;margin:0;padding:12px 16px;background:#ff0033;color:#fff;font:14px/1.4 monospace;white-space:pre-wrap';
            document.body.appendChild(strip);
        }
        strip.textContent = 'No se ha podido construir la web: ' + JSON.parse(event.data);
    });
})();
</script>`;

export function startDevServer({ port = 4000, outDir = path.join(ROOT, '.dev-build'), watch = true, log = console.log } = {}) {
    let base = '/';
    let lastError = null;
    const clients = new Set();
    const send = (event, data) => clients.forEach(res => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

    function rebuild() {
        try {
            const view = build({ mode: 'dev', outDir });
            base = new URL(view.url).pathname;
            lastError = null;
            log(`✓ web de desarrollo construida (${new Date().toLocaleTimeString('es-ES')})`);
            send('reload', '');
            return true;
        } catch (e) {
            lastError = e.message;
            log(`✗ ${e.message}`);
            send('failed', e.message);
            return false;
        }
    }

    function file(res, filePath, status = 200) {
        const type = TYPES[path.extname(filePath)] || 'application/octet-stream';
        let body = fs.readFileSync(filePath);
        if (type.startsWith('text/html')) body = Buffer.from(body.toString('utf8').replace('</body>', `${CLIENT}\n</body>`));
        res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
        res.end(body);
    }

    const server = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname === '/__dev/events') {
            res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
            res.write('\n');
            if (lastError) res.write(`event: failed\ndata: ${JSON.stringify(lastError)}\n\n`);
            clients.add(res);
            req.on('close', () => clients.delete(res));
            return;
        }
        if (!url.pathname.startsWith(base)) {
            res.writeHead(302, { Location: base });
            res.end();
            return;
        }
        const relative = decodeURIComponent(url.pathname.slice(base.length));
        let target = path.join(outDir, relative);
        if (!target.startsWith(outDir)) { res.writeHead(400); res.end(); return; }
        if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
        if (fs.existsSync(target)) file(res, target);
        else if (fs.existsSync(path.join(outDir, '404.html'))) file(res, path.join(outDir, '404.html'), 404);
        else { res.writeHead(404); res.end(); }
    });

    rebuild();

    // Editors save in several steps: wait for the changes to settle
    const watchers = [];
    if (watch) {
        let timer = null;
        const changed = () => { clearTimeout(timer); timer = setTimeout(rebuild, 120); };
        for (const dir of [SITE, path.join(ROOT, 'framework', 'dist')]) {
            watchers.push(fs.watch(dir, { recursive: true }, (event, name) => {
                if (name && name.startsWith('tests')) return;
                changed();
            }));
        }
    }

    return new Promise(resolve => {
        server.listen(port, () => {
            const address = `http://localhost:${server.address().port}${base}`;
            resolve({
                url: address,
                rebuild,
                close: () => {
                    watchers.forEach(w => w.close());
                    clients.forEach(res => res.end());
                    return new Promise(done => server.close(done));
                },
            });
        });
    });
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
    const port = Number((process.argv.find(a => a.startsWith('--port=')) || '').split('=')[1]) || 4000;
    startDevServer({ port }).then(({ url }) => {
        console.log(`\nEchorath · web de desarrollo en ${url}`);
        console.log('Al guardar cualquier archivo de site/ se reconstruye y el navegador se recarga. Ctrl+C para salir.\n');
    });
}
