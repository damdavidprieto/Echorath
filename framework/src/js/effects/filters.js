import { IDS } from '../core/constants.js';
import { config } from '../core/config.js';
import { isOffscreen, onVisible } from './visibility.js';

/**
 * SVG filters behind the "warp" and "static" distortions, plus the noise
 * loop that reshuffles their seed so the image crawls. The loop only runs
 * while at least one element uses a noise variant and is in view.
 */

const nodes = {};
const users = new Set();
let frame = 0;
let last = 0;

const DEFS_MARKUP = `
<svg id="${IDS.defs}" width="0" height="0" aria-hidden="true" focusable="false"
     style="position:absolute;width:0;height:0;overflow:hidden">
    <defs>
        <filter id="${IDS.warp}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.06" numOctaves="2" seed="1" result="noise"/>
            <feDisplacementMap id="${IDS.warpMap}" in="SourceGraphic" in2="noise" scale="14"
                               xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        <filter id="${IDS.static}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
            <feTurbulence type="turbulence" baseFrequency="0.9" numOctaves="1" seed="3" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="6"
                               xChannelSelector="R" yChannelSelector="B"/>
        </filter>
    </defs>
</svg>`;

/** Inject the filters once. Safe to call repeatedly. */
export function injectFilters() {
    if (!document.getElementById(IDS.defs)) {
        const holder = document.createElement('div');
        holder.innerHTML = DEFS_MARKUP;
        document.body.appendChild(holder.firstElementChild);
    }
    nodes.warpTurbulence = document.querySelector(`#${IDS.warp} feTurbulence`);
    nodes.warpMap = document.getElementById(IDS.warpMap);
    nodes.staticTurbulence = document.querySelector(`#${IDS.static} feTurbulence`);
}

function tick(now) {
    // Elements removed from the page without ready() must not keep the loop alive
    for (const node of users) if (!node.isConnected) users.delete(node);
    // Nobody in view: sleep until one of them comes back (see onVisible below)
    if (![...users].some(node => !isOffscreen(node))) {
        frame = 0;
        return;
    }

    frame = requestAnimationFrame(tick);
    if (now - last < config.noiseIntervalMs) return;
    last = now;

    nodes.warpTurbulence.setAttribute('seed', String(1 + Math.floor(Math.random() * 97)));
    nodes.warpMap.setAttribute('scale', String(8 + Math.random() * 14));
    nodes.staticTurbulence.setAttribute('seed', String(1 + Math.floor(Math.random() * 89)));
}

onVisible(node => {
    if (users.has(node) && !frame) frame = requestAnimationFrame(tick);
});

/** Register an element that needs live noise. */
export function startNoise(node) {
    if (!nodes.warpTurbulence) injectFilters();
    users.add(node);
    if (!frame) frame = requestAnimationFrame(tick);
}

/** Unregister an element; the loop stops when nobody needs it. */
export function stopNoise(node) {
    users.delete(node);
    if (users.size === 0 && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
    }
}
