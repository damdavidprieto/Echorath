import { ATTR, VARIANTS } from '../core/constants.js';
import { create, resolve } from '../core/dom.js';
import { canDecode } from '../effects/decode.js';
import { load, loadFor, ready } from '../effects/loading.js';

const DEFAULT_DURATION = 1600;
let uid = 0;

/** Short descriptions shown as each option's tooltip. */
const DESCRIPTIONS = Object.freeze({
    standard: 'Desdoblamiento rojo/cian con temblor leve',
    flicker: 'Parpadeo y pulso del tono',
    glitch: 'Separación fuerte, temblor y cortes',
    scan: 'Franjas horizontales desplazadas',
    wave: 'Inclinación oscilante',
    shatter: 'Recorte poligonal que se rompe',
    warp: 'Desplazamiento líquido',
    static: 'Grano de alta frecuencia',
    decode: 'El texto se cifra y se revela',
});

/**
 * Effect picker: a toggle that shows one button per distortion. Each button
 * plays its effect on the target for `duration` ms; pressing it again stops
 * it, pressing another switches at once. "decode" is only offered for
 * text-only targets.
 *
 * A target that already carries a distortion (for example content that stays
 * distorted on purpose) gets it back when the effect ends, along with its
 * aria-busy and data-e-pause-on-hover state.
 *
 * Insert the returned element next to the target, not inside it.
 *
 * @param {Element|string} target
 * @param {{ name?: string, variants?: string[], duration?: number,
 *           open?: boolean, label?: string }} [opts]
 * @returns {HTMLElement}
 */
export function fxPicker(target, opts = {}) {
    const node = resolve(target);
    if (!node) throw new Error('EchorathUI: fxPicker target not found');

    const name = opts.name || '';
    const duration = opts.duration ?? DEFAULT_DURATION;
    const variants = (opts.variants || VARIANTS)
        .filter(v => VARIANTS.includes(v) && (v !== 'decode' || canDecode(node)));
    const listId = `e-fx-${++uid}`;

    // "de el panel" is "del panel" in Spanish
    const whose = name && (/^el /.test(name) ? `del ${name.slice(3)}` : `de ${name}`);
    const root = create('div', { class: 'e-fx', role: 'group', 'aria-label': whose ? `Efectos ${whose}` : 'Efectos' });
    root.style.setProperty('--e-fx-duration', `${duration}ms`);

    // With many pickers on a page, a screen reader's list of buttons would
    // read "Efectos" again and again; the name says which one is which and
    // starts with the visible label
    const label = opts.label || 'Efectos';
    const toggle = create('button', {
        class: 'e-btn e-btn--sm e-fx__toggle',
        type: 'button',
        'aria-expanded': 'false',
        'aria-controls': listId,
        ...(whose && { 'aria-label': `${label} ${whose}` }),
        [ATTR.interactive]: '',
    }, label);

    const list = create('div', { class: 'e-fx__list', id: listId });
    const buttons = variants.map(variant => {
        const button = create('button', {
            class: 'e-btn e-btn--sm e-fx__option',
            type: 'button',
            'aria-pressed': 'false',
            title: DESCRIPTIONS[variant],
            'data-variant': variant,
            [ATTR.interactive]: '',
        }, variant);
        button.addEventListener('click', () => (button === active ? stop() : play(variant, button)));
        list.appendChild(button);
        return button;
    });

    root.append(toggle, list);

    const setOpen = open => {
        toggle.setAttribute('aria-expanded', String(open));
        list.hidden = !open;
    };
    setOpen(Boolean(opts.open));
    toggle.addEventListener('click', () => setOpen(list.hidden));
    root.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !list.hidden) {
            setOpen(false);
            toggle.focus();
        }
    });

    let runs = 0;
    let active = null;
    let base = null;   // the target's own distortion, restored afterwards

    const setActive = button => {
        active = button;
        buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    };

    function captureBase() {
        if (base) return;   // an effect from this picker is already playing
        base = node.hasAttribute(ATTR.loading)
            ? {
                variant: node.getAttribute(ATTR.distort),
                busy: node.getAttribute('aria-busy'),
                pause: node.hasAttribute(ATTR.pauseOnHover),
            }
            : { variant: null };
        // Pressing a button would otherwise pause the effect it starts
        if (base.pause) node.removeAttribute(ATTR.pauseOnHover);
    }

    function finish() {
        setActive(null);
        if (base && base.variant) {
            load(node, { variant: base.variant });
            if (base.busy === null) node.removeAttribute('aria-busy');
            else node.setAttribute('aria-busy', base.busy);
            if (base.pause) node.setAttribute(ATTR.pauseOnHover, '');
        }
        base = null;
    }

    async function play(variant, button) {
        const run = ++runs;
        captureBase();
        setActive(button);   // aria-pressed false → true recreates ::after, so the countdown restarts
        await loadFor(node, duration, { variant, reveal: !base.variant });
        if (run === runs) finish();
    }

    function stop() {
        runs++;
        if (!base.variant) ready(node);
        finish();
    }

    return root;
}
