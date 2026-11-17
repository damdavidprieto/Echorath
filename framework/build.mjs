/**
 * Echorath UI build.
 *
 *   node build.mjs           one build into dist/
 *   node build.mjs --watch   rebuild on every change under src/
 *
 * Outputs (each with an external source map pointing back to src/):
 *   dist/echorath-ui.css        readable bundle
 *   dist/echorath-ui.min.css    minified bundle
 *   dist/echorath-ui.js         IIFE, window.EchorathUI
 *   dist/echorath-ui.min.js     minified IIFE
 *   dist/echorath-ui.esm.js     ES module
 *   dist/fonts/              the fonts the CSS points to, with their licences
 */
import * as esbuild from 'esbuild';
import { cpSync, readFileSync, rmSync, mkdirSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const banner = `/*! Echorath UI v${pkg.version} */`;
const watch = process.argv.includes('--watch');

const shared = {
    bundle: true,
    sourcemap: 'linked',
    sourcesContent: true,
    target: ['chrome111', 'firefox113', 'safari16.2'],
    logLevel: 'info',
    banner: { js: banner, css: banner },
};

// The CSS keeps the font file names, so dist/fonts is stable for anyone who copies it
const fonts = { loader: { '.woff2': 'file' }, assetNames: 'fonts/[name]' };

const builds = [
    { entryPoints: ['src/css/index.css'], outfile: 'dist/echorath-ui.css', ...fonts },
    { entryPoints: ['src/css/index.css'], outfile: 'dist/echorath-ui.min.css', minify: true, ...fonts },
    { entryPoints: ['src/js/index.js'], outfile: 'dist/echorath-ui.js', format: 'iife', globalName: 'EchorathUI' },
    { entryPoints: ['src/js/index.js'], outfile: 'dist/echorath-ui.min.js', format: 'iife', globalName: 'EchorathUI', minify: true },
    { entryPoints: ['src/js/index.js'], outfile: 'dist/echorath-ui.esm.js', format: 'esm' },
].map(options => ({
    ...shared,
    ...options,
    define: { __ECHORATH_VERSION__: JSON.stringify(pkg.version) },
}));

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
// The fonts' licences travel with them (SIL Open Font License)
cpSync('src/fonts', 'dist/fonts', { recursive: true, filter: path => !path.endsWith('.woff2') });

if (watch) {
    const contexts = await Promise.all(builds.map(options => esbuild.context(options)));
    await Promise.all(contexts.map(ctx => ctx.watch()));
    console.log('Watching src/ for changes…');
} else {
    await Promise.all(builds.map(options => esbuild.build(options)));
}
