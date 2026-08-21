"use client";

/**
 * Synthesised sound effects.
 *
 * Everything here is generated with oscillators at call time rather than
 * loaded from audio files: the cues are all short arcade blips, and
 * synthesising them keeps the phone bundle free of megabytes of media that
 * would have to download over hall wifi before the first question — the one
 * moment the network is guaranteed to be congested.
 *
 * Autoplay policy: an AudioContext starts suspended until the page has seen
 * a user gesture. Participants tap to join, so their context unlocks early;
 * the LED screen has no natural gesture, so `installUnlockListener` resumes
 * on the operator's first click/keypress anywhere on the page.
 */

type Ctx = AudioContext & { __unlockInstalled?: boolean };

let ctx: Ctx | null = null;
let muted = false;

function getCtx(): Ctx | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;

  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  try {
    ctx = new Ctor() as Ctx;
  } catch {
    return null;
  }
  installUnlockListener();
  return ctx;
}

/**
 * Browsers only allow audio after a gesture. Rather than requiring every
 * caller to think about it, the first gesture anywhere on the page resumes
 * the context — then removes itself.
 */
export function installUnlockListener() {
  if (typeof window === "undefined" || !ctx || ctx.__unlockInstalled) return;
  ctx.__unlockInstalled = true;

  const resume = () => {
    ctx?.resume().catch(() => {});
  };
  // `once` per event: any one of them is enough to unlock.
  window.addEventListener("pointerdown", resume, { once: true });
  window.addEventListener("keydown", resume, { once: true });
  window.addEventListener("touchstart", resume, { once: true });
}

export function setMuted(next: boolean) {
  muted = next;
}

export function isMuted() {
  return muted;
}

interface ToneOptions {
  freq: number;
  /** Seconds from now that this tone starts — used to sequence arpeggios. */
  delay?: number;
  duration?: number;
  type?: OscillatorType;
  gain?: number;
  /** Slide to this frequency over the tone's life; omit for a flat pitch. */
  sweepTo?: number;
}

function tone({ freq, delay = 0, duration = 0.16, type = "sine", gain = 0.18, sweepTo }: ToneOptions) {
  const c = getCtx();
  if (!c || muted) return;
  // A context that is still suspended (no gesture yet) would schedule these
  // against a clock that isn't running; skip rather than queue a burst that
  // all fires at once the moment it resumes. resume() is async, so this call
  // is lost either way — it just unlocks the context for the next one.
  if ((c.state as AudioContextState) !== "running") {
    c.resume().catch(() => {});
    return;
  }

  const start = c.currentTime + delay;
  const osc = c.createOscillator();
  const env = c.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (sweepTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, sweepTo), start + duration);
  }

  // Short attack, exponential decay. A linear ramp to exactly 0 clicks
  // audibly, so decay to a small epsilon and stop after it.
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(env).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** One 3-2-1 numeral. Rises in pitch as the count descends. */
export function playTick(count: number) {
  const freq = count >= 3 ? 520 : count === 2 ? 620 : 740;
  tone({ freq, duration: 0.13, type: "triangle", gain: 0.2 });
}

/** The "Go!" at the end of the lead-in. */
export function playGo() {
  tone({ freq: 880, duration: 0.3, type: "triangle", gain: 0.24, sweepTo: 1320 });
}

/** Answer accepted and correct — a bright major arpeggio. */
export function playCorrect() {
  [0, 0.09, 0.18].forEach((delay, i) => {
    tone({ freq: [660, 830, 990][i], delay, duration: 0.24, type: "triangle", gain: 0.2 });
  });
}

/** Answer accepted but wrong — a short descending buzz. */
export function playWrong() {
  tone({ freq: 300, duration: 0.34, type: "sawtooth", gain: 0.13, sweepTo: 140 });
}

/** A choice was registered, before the outcome is known. */
export function playLockIn() {
  tone({ freq: 540, duration: 0.11, type: "sine", gain: 0.16 });
}

/** The question's clock ran out without an answer. */
export function playTimeUp() {
  tone({ freq: 240, duration: 0.42, type: "sine", gain: 0.16, sweepTo: 110 });
}

/** A matched pair in Book Match — lighter than a full correct answer. */
export function playMatch() {
  tone({ freq: 780, duration: 0.14, type: "triangle", gain: 0.17, sweepTo: 1040 });
}

/** Winner reveal on the LED screen. */
export function playFanfare() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    tone({ freq, delay: i * 0.13, duration: 0.5, type: "triangle", gain: 0.2 });
  });
  // Sustained top note so the flourish lands rather than just stopping.
  tone({ freq: 1568, delay: 0.52, duration: 0.9, type: "sine", gain: 0.16 });
}

/** Results screen on the player's phone. */
export function playResults() {
  [0, 0.11].forEach((delay, i) => {
    tone({ freq: [523, 784][i], delay, duration: 0.42, type: "triangle", gain: 0.18 });
  });
}
