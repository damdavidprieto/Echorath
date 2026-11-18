// Moving around the page: effect pickers, effects mode, the current section
// in the bar, the distortion on arrival and long lists that open on demand

// ---- Effect pickers for the remaining components (each next to its target) ----
const heroName = document.querySelector('.hero__name');
heroName.parentNode.appendChild(EchorathUI.fxPicker(heroName, { name: heroName.textContent }));

document.querySelectorAll('.section__head .e-h2').forEach(h => {
    h.parentNode.appendChild(EchorathUI.fxPicker(h, { name: 'el título ' + h.textContent }));
});

const table = document.querySelector('#sobre table');
if (table) table.after(EchorathUI.fxPicker(table, { name: 'la trayectoria' }));

const contactPanel = document.querySelector('#contacto .e-panel');
if (contactPanel) contactPanel.after(EchorathUI.fxPicker(contactPanel, { name: 'el contacto' }));

// ---- Effects mode: off by default; remembered per viewer ----
const fxMode = document.getElementById('fx-mode');
const applyFx = on => document.documentElement.classList.toggle('fx-on', on);
if (fxMode) try { fxMode.checked = localStorage.getItem('echorath-fx') === '1'; } catch (e) { /* storage unavailable */ }
if (fxMode) applyFx(fxMode.checked);
if (fxMode) fxMode.addEventListener('change', () => {
    applyFx(fxMode.checked);
    EchorathUI.toast(
        fxMode.checked ? 'Modo efectos activado' : 'Modo efectos desactivado',
        fxMode.checked ? 'Cada componente muestra un botón "Efectos" para probar sus distorsiones.' : 'Los botones de efectos se han ocultado.',
        fxMode.checked ? 'ok' : 'info'
    );
    try { localStorage.setItem('echorath-fx', fxMode.checked ? '1' : '0'); } catch (e) { /* storage unavailable */ }
});

// ---- Current section in the bar ----
// The current section is the last one whose top has passed 45% of the
// viewport. At the end of the page the last section wins: Contacto is
// short and would never reach that line. A section the visitor asked for
// (the bar, a door, a link) keeps the mark while it is on screen, even
// where the page cannot scroll it to the top, until they scroll by hand.
const navLinks = [...document.querySelectorAll('[data-section]')];
const spySections = ['inicio', 'musica', 'escritura', 'imagenes', 'efectos', 'algoritmos', 'sobre', 'contacto'].map(id => document.getElementById(id)).filter(Boolean);
const markCurrent = id => navLinks.forEach(link => {
    if (link.dataset.section === id) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
});
let spyQueued = false;
let asked = null, arrived = false;
document.addEventListener('click', e => {
    const link = e.target.closest && e.target.closest('a[href^="#"]');
    const id = link && link.getAttribute('href').slice(1);
    if (spySections.some(section => section.id === id)) { asked = id; arrived = false; }
});
const byHand = () => { asked = null; };
addEventListener('wheel', byHand, { passive: true });
addEventListener('touchstart', byHand, { passive: true });
addEventListener('keydown', e => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key) && !e.target.closest('input, textarea, select, [role="dialog"]')) byHand(); });
const updateCurrent = () => {
    spyQueued = false;
    const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
    let current = spySections[0];
    for (const section of spySections) if (section.getBoundingClientRect().top <= innerHeight * 0.45) current = section;
    if (asked) {
        // once the section has been on screen, leaving it lets the usual rule back
        const box = document.getElementById(asked).getBoundingClientRect();
        const onScreen = box.top < innerHeight && box.bottom > 80;
        if (onScreen) arrived = true;
        else if (arrived) asked = null;
    }
    markCurrent(asked || (atEnd ? spySections[spySections.length - 1].id : current.id));
};
addEventListener('scroll', () => {
    if (!spyQueued) { spyQueued = true; requestAnimationFrame(updateCurrent); }
}, { passive: true });
addEventListener('resize', updateCurrent);
updateCurrent();

// ---- Section changes distort the target section briefly ----
document.querySelectorAll('[data-section]').forEach(link => {
    link.addEventListener('click', () => {
        const target = document.getElementById(link.dataset.section);
        if (target) EchorathUI.loadFor(target, 500, { reveal: true });
    });
});

// ---- Long lists show their first works; one press shows the rest ----
// With today's content nothing is hidden; it matters once the catalogue grows.
function showFirst(container, count, label) {
    if (!container) return () => {};
    const items = [...container.children];
    if (items.length <= count) return () => {};
    items.slice(count).forEach(item => item.setAttribute('hidden', 'until-found'));
    const more = button(label(items.length), 'e-btn more-btn');
    container.after(more);
    const reveal = () => {
        items.forEach(item => { item.hidden = false; });
        more.remove();
    };
    // Find in page, or a link to a passage, found a folded work: open the whole list
    container.addEventListener('beforematch', reveal, { once: true });
    more.addEventListener('click', () => {
        reveal();
        // Focus the first work that was hidden, so keyboard users carry on from there
        const first = items[count].querySelector('button, a');
        if (first) first.focus();
    });
    return reveal;
}
const revealTracks = showFirst(list, 4, n => `Ver las ${n} pistas`);
TEXT_SET.reveal = showFirst(texts, 3, n => `Ver los ${n} textos`);
IMAGE_SET.reveal = showFirst(gallery, 6, n => `Ver las ${n} imágenes`);
// Printing, or saving as PDF, takes every work: the folded lists open and
// their pictures are drawn before the page goes to paper
addEventListener('beforeprint', () => {
    revealTracks();
    TEXT_SET.reveal();
    IMAGE_SET.reveal();
    document.querySelectorAll('main canvas').forEach(canvas => {
        if (!painters.has(canvas)) return;
        const px = Math.min(2400, Math.round(canvas.getBoundingClientRect().width * (window.devicePixelRatio || 1)));
        if (px > 0 && px !== canvas.width) {
            canvas.width = canvas.height = px;
            repaint(canvas);
        }
    });
});
