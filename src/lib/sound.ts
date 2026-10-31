/**
 * Tiny UI sound engine. Every sound is synthesised live with the Web Audio API —
 * no audio files are shipped, and all sounds are original to FraMETUp.
 *
 * Sounds only ever play in response to something the user did (a tap, a check),
 * so browsers' autoplay rules are respected. The user can mute them in Settings.
 */

export type SoundName = "tap" | "select" | "correct" | "wrong" | "complete" | "xp" | "streak" | "swoosh" | "toggle";

const KEY = "frametup.sound";
export const SOUND_EVENT = "frametup:sound-pref";

/** Sound is on unless the user switched it off. */
export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* private mode: the choice lasts for this page only */
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(SOUND_EVENT, { detail: on }));
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    // A gentle compressor keeps stacked notes from clipping on phone speakers.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return { ctx, out: master! };
}

interface Note {
  f: number; // start frequency (Hz)
  to?: number; // glide to this frequency
  at?: number; // start offset (s)
  d: number; // duration (s)
  type?: OscillatorType;
  g?: number; // peak gain
  attack?: number;
}

function note(a: { ctx: AudioContext; out: GainNode }, n: Note) {
  const t0 = a.ctx.currentTime + (n.at ?? 0);
  const osc = a.ctx.createOscillator();
  const env = a.ctx.createGain();
  osc.type = n.type ?? "sine";
  osc.frequency.setValueAtTime(n.f, t0);
  if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, t0 + n.d);
  const peak = n.g ?? 0.2;
  const atk = n.attack ?? 0.005;
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(peak, t0 + atk);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + n.d);
  osc.connect(env).connect(a.out);
  osc.start(t0);
  osc.stop(t0 + n.d + 0.02);
}

/** A bell-like note: a sine plus a quiet octave overtone. */
function bell(a: { ctx: AudioContext; out: GainNode }, f: number, at: number, d: number, g = 0.18) {
  note(a, { f, at, d, g, type: "sine" });
  note(a, { f: f * 2, at, d: d * 0.6, g: g * 0.25, type: "sine" });
  note(a, { f: f * 3.01, at, d: d * 0.3, g: g * 0.08, type: "triangle" });
}

function whoosh(a: { ctx: AudioContext; out: GainNode }, d: number, from: number, to: number, g: number) {
  if (!noise) {
    noise = a.ctx.createBuffer(1, a.ctx.sampleRate * 0.6, a.ctx.sampleRate);
    const ch = noise.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  }
  const t0 = a.ctx.currentTime;
  const src = a.ctx.createBufferSource();
  src.buffer = noise;
  const bp = a.ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(from, t0);
  bp.frequency.exponentialRampToValueAtTime(to, t0 + d);
  const env = a.ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(g, t0 + d * 0.35);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  src.connect(bp).connect(env).connect(a.out);
  src.start(t0);
  src.stop(t0 + d + 0.02);
}

let lastTap = 0;

/** Plays a UI sound if sound is enabled. Safe to call anywhere; never throws. */
export function play(name: SoundName) {
  if (!soundEnabled()) return;
  try {
    const a = audio();
    if (!a) return;
    switch (name) {
      case "tap": {
        const now = performance.now();
        if (now - lastTap < 40) return; // avoid machine-gun clicks
        lastTap = now;
        note(a, { f: 920, to: 620, d: 0.06, type: "triangle", g: 0.07 });
        break;
      }
      case "select":
        note(a, { f: 520, to: 780, d: 0.09, type: "triangle", g: 0.12 });
        note(a, { f: 1560, d: 0.05, at: 0.02, g: 0.03 });
        break;
      case "correct":
        // Two bright rising bells and a sparkle on top.
        bell(a, 1046.5, 0, 0.32, 0.17);
        bell(a, 1568, 0.09, 0.5, 0.17);
        note(a, { f: 3136, at: 0.16, d: 0.18, g: 0.025 });
        break;
      case "wrong":
        // A soft, low "bonk-bonk" — clear but not harsh.
        note(a, { f: 330, to: 290, d: 0.16, type: "square", g: 0.05 });
        note(a, { f: 330, to: 290, d: 0.16, type: "sine", g: 0.16 });
        note(a, { f: 247, to: 196, at: 0.15, d: 0.28, type: "square", g: 0.045 });
        note(a, { f: 247, to: 196, at: 0.15, d: 0.28, type: "sine", g: 0.16 });
        if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([30, 40, 30]);
        break;
      case "complete": {
        // A rising major arpeggio that lands on a warm chord.
        const arp = [523.25, 659.25, 783.99, 1046.5];
        arp.forEach((f, i) => bell(a, f, i * 0.085, 0.35, 0.15));
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f) => note(a, { f, at: 0.38, d: 1.1, type: "triangle", g: 0.045, attack: 0.03 }));
        bell(a, 2093, 0.42, 0.6, 0.07);
        whoosh(a, 0.5, 600, 5000, 0.05);
        break;
      }
      case "xp":
        note(a, { f: 1318.5, d: 0.07, type: "square", g: 0.035 });
        note(a, { f: 1975.5, at: 0.05, d: 0.12, type: "sine", g: 0.1 });
        break;
      case "streak":
        whoosh(a, 0.45, 300, 3200, 0.09);
        note(a, { f: 392, to: 784, d: 0.35, type: "triangle", g: 0.08, attack: 0.04 });
        bell(a, 1174.7, 0.3, 0.45, 0.12);
        break;
      case "swoosh":
        whoosh(a, 0.18, 1800, 600, 0.035);
        break;
      case "toggle":
        note(a, { f: 660, d: 0.07, type: "triangle", g: 0.1 });
        note(a, { f: 990, at: 0.06, d: 0.1, type: "triangle", g: 0.1 });
        break;
    }
  } catch {
    /* audio is a nicety; never let it break the app */
  }
}
