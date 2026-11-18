// ---- Content: written by site/build.mjs from site/content (TRACKS, TEXTS,
// PIECES, ALGORITHMS and EFFECTS), only what the site being built shows ----
/*@content*/

// Each work's name in addresses (escritura/ciudades-que-se-repiten);
// site/build.mjs computes the same one for the work's own page
const slug = text => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
[...TRACKS, ...TEXTS, ...PIECES, ...ALGORITHMS].forEach(work => {
    work.slug = slug(work.title);
    // Old titles a work had, so links shared before a rename still reach it
    work.aka = (work.aka || []).map(slug);
});
const isWork = id => work => work.slug === id || work.aka.includes(id);

// ---- Each work has its own page (escritura/<obra>/): this same page, with the
// work's address, title and description for search engines and shared links.
// HOME is the portfolio's address, wherever the site is served ----
const HOME = new URL(document.documentElement.dataset.root || '', location.href).href;
const pageOf = (section, work) => `${HOME}${section}/${work.slug}/`;
// On a work's page the address becomes the portfolio's, with the work in it
// (…/Echorath/#escritura/<obra>), so the rest of the page works as on the
// home page; «Compartir» still gives the work's own page
if (document.documentElement.dataset.work) {
    // The head's addresses (../../favicon.svg…) are relative to this page: fix
    // them first, or the browser would look for the icon from the new address
    document.querySelectorAll('head link[href]').forEach(link => link.setAttribute('href', link.href));
    history.replaceState(null, '', `${HOME}${location.hash || `#${document.documentElement.dataset.work}`}`);
    // From here on it is the portfolio: the viewer titles the tab while a work is open
    document.title = document.querySelector('meta[property="og:site_name"]').content;
}
