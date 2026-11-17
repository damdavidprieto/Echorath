/**
 * Shared constants. Every attribute, class and variant name the runtime
 * uses is declared here, so the CSS and the JS stay in step.
 */

/* global __ECHORATH_VERSION__ */
export const VERSION = typeof __ECHORATH_VERSION__ !== 'undefined' ? __ECHORATH_VERSION__ : 'dev';

/** Loading distortions, in the order they are documented. */
export const VARIANTS = Object.freeze([
    'standard',
    'flicker',
    'glitch',
    'scan',
    'wave',
    'shatter',
    'warp',
    'static',
    'decode',
]);

/** Variants that rewrite text content; only valid on text-only elements. */
export const TEXT_VARIANTS = Object.freeze(['decode']);

/** Variants that rely on the SVG noise filters. */
export const NOISE_VARIANTS = Object.freeze(['warp', 'static']);

/** Tone names accepted by tone(), mapped to data-tone values. */
export const TONES = Object.freeze({
    ok: 'ok',
    success: 'ok',
    info: 'info',
    warn: 'warn',
    warning: 'warn',
    danger: 'danger',
    error: 'danger',
    sys: 'sys',
    off: 'off',
    offline: 'off',
});

/** Attributes. Author-set ones configure; runtime-set ones report state. */
export const ATTR = Object.freeze({
    // author-set
    distort: 'data-distort',
    tone: 'data-tone',
    focus: 'data-focus',
    tabs: 'data-tabs',
    tabTarget: 'data-tab-target',
    manual: 'data-e-manual',
    closeLabel: 'data-close-label',
    interactive: 'data-e-interactive',
    pauseOnHover: 'data-e-pause-on-hover',
    // runtime-set (data-loading may also be authored for declarative start)
    loading: 'data-loading',
    reveal: 'data-reveal',
    decoding: 'data-decoding',
    boxed: 'data-boxed',
    offscreen: 'data-e-offscreen',
});

/** Classes the runtime toggles. */
export const STATE_CLASS = Object.freeze({
    visible: 'is-visible',
    open: 'is-open',
    compact: 'is-compact',
    entering: 'is-entering',
    scrollLocked: 'is-scroll-locked',
});

/** Selectors of components the runtime wires up. */
export const SELECTOR = Object.freeze({
    header: '.e-header',
    headerToggle: '.e-header__toggle',
    headerNav: '.e-header__nav',
});

/** Media queries the runtime checks; they mirror the breakpoints in the CSS. */
export const MEDIA = Object.freeze({
    compactHeader: '(max-width: 640px)',
});

/** Custom properties the runtime writes. */
export const CSS_VAR = Object.freeze({
    headerOffset: '--e-header-offset',
});

/** Element ids injected by the runtime. */
export const IDS = Object.freeze({
    defs: 'e-distort-defs',
    warp: 'e-warp',
    warpMap: 'e-warp-map',
    static: 'e-static',
});
