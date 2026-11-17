import { VARIANTS } from './constants.js';

/**
 * Runtime settings. Change them with configure().
 * @type {{ defaultVariant: string, revealMs: number, noiseIntervalMs: number,
 *          decodeScrambleMs: number, decodeRevealStepMs: number, toastMs: number }}
 */
export const config = {
    defaultVariant: 'standard',
    revealMs: 700,
    noiseIntervalMs: 80,
    decodeScrambleMs: 60,
    decodeRevealStepMs: 28,
    toastMs: 3000,
};

/**
 * Update runtime settings. Unknown keys are ignored.
 * @param {Partial<typeof config>} options
 * @returns {typeof config} the resulting settings
 */
export function configure(options = {}) {
    for (const [key, value] of Object.entries(options)) {
        if (!(key in config)) continue;
        if (key === 'defaultVariant' && !VARIANTS.includes(value)) {
            throw new Error(`EchorathUI: unknown variant "${value}". Use one of: ${VARIANTS.join(', ')}`);
        }
        config[key] = value;
    }
    return { ...config };
}
