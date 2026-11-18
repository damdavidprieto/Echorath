// ---- Sound: the samples and the synth lab share one engine ----
let audioCtx = null;
function audio() {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

const LEVEL = { sine: 0.22, triangle: 0.18, square: 0.07, sawtooth: 0.08 };

// One note: an oscillator through a short envelope (20 ms up, 0.5 s down)
function playNote(ctx, frequency, wave) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(LEVEL[wave], t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.52);
}

// Loops the pattern one note per step. The pattern is read on every step,
// so its notes, wave and speed can change while it plays.
function sequence(pattern, onStep) {
    const ctx = audio();
    let step = 0;
    let timer = 0;
    const stop = () => clearInterval(timer);
    const tick = () => {
        if (step >= pattern.steps) {
            stop();
            pattern.onEnd();
            return;
        }
        const i = step % pattern.notes.length;
        playNote(ctx, pattern.notes[i], pattern.wave);
        onStep(i, step);
        step++;
    };
    const retime = () => {
        clearInterval(timer);
        timer = setInterval(tick, pattern.stepMs);
    };
    tick();
    retime();
    return { stop, retime };
}
