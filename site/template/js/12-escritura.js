// ---- Writing: cards open in the reader ----
const texts = document.getElementById('texts');
const TEXT_SET = {
    section: 'escritura', tone: 'info', items: TEXTS, openers: [], progress: true,
    render(item) {
        const article = el('article', 'e-prose');
        article.appendChild(el('p', 'e-prose__meta', `${item.kind} · ${item.year} · ${readingTime(item)}${statusNote(item)}`));
        item.body.forEach(par => article.appendChild(el('p', '', par)));
        return article;
    },
};
TEXTS.forEach((item, i) => {
    const cell = el('div', 'e-span-4 fx-cell');
    const card = el('article', 'e-panel');
    card.setAttribute('data-tone', 'info');
    // Always distorted; the distortion stops while the reader is on the card
    card.setAttribute('data-loading', '');
    card.setAttribute('data-distort', 'standard');
    card.setAttribute('data-e-pause-on-hover', '');
    const badges = el('div', 'card-badges');
    badges.appendChild(el('span', 'e-badge', item.kind));
    if (unpublished(item)) badges.appendChild(statusBadge(item));
    card.appendChild(badges);
    card.appendChild(el('h3', 'e-h2', item.title));
    card.lastChild.style.margin = '12px 0 8px';
    card.appendChild(el('p', 'card-text', item.summary));

    const foot = el('div', 'card-foot');
    foot.appendChild(el('span', '', `${item.year} · ${readingTime(item)}`));
    const open = el('button', 'e-btn', 'Leer');
    open.type = 'button';
    open.setAttribute('aria-label', `Leer «${item.title}»`);
    open.setAttribute('data-focus', 'sweep');
    open.setAttribute('data-e-interactive', ''); // usable while an effect plays on the card
    open.addEventListener('click', () => openWork(TEXT_SET, i));
    TEXT_SET.openers.push(open);
    foot.appendChild(open);
    card.appendChild(foot);
    // The picker brings the card's permanent distortion back after each effect
    cell.append(card, EchorathUI.fxPicker(card, { name: `«${item.title}»` }));
    texts.appendChild(cell);
});

// The cards move on purpose; one press stops them, and the choice is remembered
const stillToggle = document.getElementById('still-toggle');
if (stillToggle) {
    const setStill = still => {
        texts.classList.toggle('is-still', still);
        stillToggle.textContent = still ? 'Reanudar el efecto' : 'Pausar el efecto';
    };
    try { setStill(localStorage.getItem('echorath-still') === '1'); } catch (e) { setStill(false); }
    stillToggle.addEventListener('click', () => {
        const still = !texts.classList.contains('is-still');
        setStill(still);
        try { localStorage.setItem('echorath-still', still ? '1' : '0'); } catch (e) { /* storage unavailable */ }
    });

    // The framework sets aria-busy on loading elements; these cards are decorative and always visible, so drop it.
    window.addEventListener('load', () => {
        texts.querySelectorAll('[aria-busy]').forEach(card => card.removeAttribute('aria-busy'));
    });
}
