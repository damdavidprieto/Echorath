// Repetición: the algorithm of the series. Its drawing function (repeticion),
// the palettes (PALETTES) and the random generator (rng) live in the page,
// because they also paint the first screen, the gallery and the covers.
export default {
    title: 'Repetición', year: 2024, mode: 'seed',
    summary: 'Cada imagen sale de un número. Cambia el número y sale otra; con el mismo, siempre la misma.',
    input: { seed: 11, kind: 'Círculos' },
    vary: () => ({ seed: 1 + Math.floor(Math.random() * 9999), kind: KINDS[Math.floor(Math.random() * KINDS.length)] }),
    caption: input => `semilla ${input.seed} · ${input.kind}`,
    alt: input => describe(input),
    draw: repeticion,
    code: { PALETTES, rng, repeticion },
};
