// Sound effects, synthesised with the Web Audio API so there are no audio files to load
// Browsers only allow sound after the visitor clicks or presses a key, which the intro needs anyway

import { load, save } from "./util.js";

const VOLUME = 0.55;

let ctx = null;
let master = null;
let noise = null;
let muted = load("case:muted") === "1";

function context() {
  if (!ctx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : VOLUME;
    master.connect(ctx.destination);

    // one second of white noise, reused by every noisy sound
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function envelope(param, at, peak, attack, decay) {
  param.setValueAtTime(0.0001, at);
  param.exponentialRampToValueAtTime(peak, at + attack);
  param.exponentialRampToValueAtTime(0.0001, at + attack + decay);
}

// A short burst of filtered noise: clicks, scrapes, paper
function burst({ delay = 0, freq = 2000, q = 6, peak = 0.5, attack = 0.002, decay = 0.06, type = "bandpass" } = {}) {
  const c = muted ? null : context();
  if (!c) return;
  const at = c.currentTime + delay;
  const source = c.createBufferSource();
  source.buffer = noise;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = c.createGain();
  envelope(gain.gain, at, peak, attack, decay);
  source.connect(filter).connect(gain).connect(master);
  source.start(at, Math.random() * 0.5);
  source.stop(at + attack + decay + 0.05);
}

// A pitched tone that can slide down: thumps, rings, blips
function tone({ delay = 0, freq = 120, to = freq, type = "sine", peak = 0.6, attack = 0.004, decay = 0.25 } = {}) {
  const c = muted ? null : context();
  if (!c) return;
  const at = c.currentTime + delay;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, at + attack + decay);
  const gain = c.createGain();
  envelope(gain.gain, at, peak, attack, decay);
  osc.connect(gain).connect(master);
  osc.start(at);
  osc.stop(at + attack + decay + 0.05);
}

// Noise swept through a filter: heavy doors sliding
function sweep({ delay = 0, from = 200, to = 1000, peak = 0.25, duration = 1.1 } = {}) {
  const c = muted ? null : context();
  if (!c) return;
  const at = c.currentTime + delay;
  const source = c.createBufferSource();
  source.buffer = noise;
  source.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.4;
  filter.frequency.setValueAtTime(from, at);
  filter.frequency.exponentialRampToValueAtTime(to, at + duration);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + duration * 0.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  source.connect(filter).connect(gain).connect(master);
  source.start(at);
  source.stop(at + duration + 0.05);
}

export const sfx = {
  // waking the audio up early avoids a delay on the first real sound
  prime() {
    if (!muted) context();
  },
  pickup() {
    burst({ freq: 4200, q: 9, peak: 0.25, decay: 0.03 });
    tone({ delay: 0.01, freq: 2600, type: "triangle", peak: 0.04, decay: 0.15 });
  },
  insert() {
    burst({ freq: 3400, q: 5, peak: 0.35, decay: 0.05 });
    burst({ delay: 0.07, freq: 2700, q: 6, peak: 0.3, decay: 0.05 });
    burst({ delay: 0.14, freq: 2100, q: 7, peak: 0.45, decay: 0.07 });
    burst({ delay: 0.02, freq: 5200, q: 0.8, peak: 0.07, attack: 0.02, decay: 0.2 });
  },
  turn() {
    burst({ freq: 1500, q: 10, peak: 0.6, decay: 0.05 });
    tone({ freq: 190, to: 90, peak: 0.45, decay: 0.12 });
  },
  unlock() {
    tone({ freq: 95, to: 38, peak: 0.9, decay: 0.45 });
    burst({ freq: 900, q: 3, peak: 0.5, decay: 0.12 });
    tone({ delay: 0.01, freq: 1250, type: "triangle", peak: 0.1, decay: 0.7 });
    tone({ delay: 0.01, freq: 1873, type: "triangle", peak: 0.06, decay: 0.55 });
  },
  open() {
    sweep({ from: 160, to: 900, peak: 0.22, duration: 1.3 });
    tone({ freq: 58, to: 34, peak: 0.45, decay: 1.1 });
  },
  stamp() {
    tone({ freq: 140, to: 55, peak: 0.7, decay: 0.2 });
    burst({ freq: 500, q: 1, peak: 0.35, decay: 0.08, type: "lowpass" });
  },
  click() {
    burst({ freq: 3800, q: 8, peak: 0.35, decay: 0.025 });
    burst({ delay: 0.06, freq: 2300, q: 8, peak: 0.25, decay: 0.03 });
  },
  paper() {
    burst({ freq: 2900, q: 0.7, peak: 0.1, attack: 0.02, decay: 0.12 });
  },
  clue() {
    tone({ freq: 659, peak: 0.16, decay: 0.2 });
    tone({ delay: 0.1, freq: 988, peak: 0.13, decay: 0.35 });
  },
  solved() {
    [523, 659, 784, 1047].forEach((freq, i) => tone({ delay: i * 0.11, freq, type: "triangle", peak: 0.12, decay: 0.5 }));
  },
};

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = value;
  save("case:muted", muted ? "1" : "0");
  if (master) master.gain.setTargetAtTime(muted ? 0 : VOLUME, ctx.currentTime, 0.03);
}
