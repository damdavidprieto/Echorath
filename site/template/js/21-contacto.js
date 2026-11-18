// ---- One address, written once: every "write to me" link takes it from here ----
// EMAIL comes with the content, from site/content/site.json
document.querySelectorAll('[data-mail]').forEach(link => {
    const subject = link.dataset.mail;
    link.href = `mailto:${EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
});
// A long address breaks after the @ or before a dot, never inside a word
const addr = document.getElementById('addr');
if (addr) addr.replaceChildren(...EMAIL.split(/(?<=@)|(?=\.)/).flatMap((part, i) => i ? [document.createElement('wbr'), part] : [part]));

// ---- Contact ----
const copy = document.getElementById('copy');
if (copy) copy.addEventListener('click', async () => {
    const address = document.getElementById('addr').textContent;
    try {
        await navigator.clipboard.writeText(address);
        EchorathUI.toast('Copiado', address, 'ok');
    } catch (e) {
        const range = document.createRange();
        range.selectNodeContents(document.getElementById('addr'));
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        EchorathUI.toast('Selecciónalo', 'Tu navegador no permite copiar desde aquí', 'warn');
    }
});
