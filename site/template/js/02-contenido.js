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
