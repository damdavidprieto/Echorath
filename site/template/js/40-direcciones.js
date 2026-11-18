// ---- Addresses of works: #escritura/<texto>, #imagenes/<imagen>, #musica/<pista>, #algoritmos/<algoritmo> ----
function route(how = 'hash') {
    const [section, id] = decodeURIComponent(location.hash.slice(1)).split('/');
    if (!['escritura', 'imagenes', 'musica', 'algoritmos'].includes(section) || location.hash.indexOf('/') < 0 || document.querySelector('.e-modal-overlay') || !document.getElementById(section)) return;
    const jump = () => document.getElementById(section).scrollIntoView({ block: 'start', behavior: 'instant' });
    // The work is not there (renamed, or gone): its section, and a word about it
    const missing = () => {
        history.replaceState(null, '', `#${section}`);
        jump();
        EchorathUI.toast('No encuentro esa obra', 'Puede que haya cambiado de nombre. Aquí están las demás.', 'warn');
    };
    if (!id) { missing(); return; }
    if (section === 'escritura' || section === 'imagenes' || section === 'algoritmos') {
        const set = { escritura: TEXT_SET, imagenes: IMAGE_SET, algoritmos: ALGO_SET }[section];
        const i = set.items.findIndex(isWork(id));
        if (i < 0) { missing(); return; }
        if (set.openers[i].closest('[hidden]') && set.reveal) set.reveal();
        jump();
        openWork(set, i, how);
    } else if (section === 'musica') {
        const i = TRACKS.findIndex(isWork(id));
        if (i < 0) { missing(); return; }
        if (trackButtons[i].closest('[hidden]')) revealTracks();
        const row = trackButtons[i].closest('.track-row');
        row.scrollIntoView({ block: 'center', behavior: 'instant' });
        trackButtons[i].focus({ preventScroll: true });
        row.classList.add('is-linked');
        setTimeout(() => row.classList.remove('is-linked'), 3000);
    }
}
addEventListener('hashchange', () => route('hash'));
route('load');
